import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, of } from 'rxjs';
import { ChatService, ChatMessage } from '../chat/chat.service';
import { DeleteMessageService } from '../chat/delete-message.service';
import { modifyMessageService } from '../chat/modify-message.service';
import { AddPhotoService } from '../chat/add-photo.service';
import { DeletePhotoService } from '../chat/delete-photo.service';
import { AddVideoService } from '../chat/add-video.service';
import { DeleteVideoService } from '../chat/delete-video.service';
import { PhotoFeature } from '../chat/photo/photo'
import { VideoFeature } from '../chat/video/video'
import { scheduleScrollById, shouldStickToBottomById, scrollToBottomById } from '../utils/scroll';
import { Rdv } from './rdv/rdv';
import { UnreadService } from '../home/unread.service';

type AdminUser = {
  _id: string
  name?: string
  nickname?: string
  email?: string
  role?: string
}

type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
  updatedAt?: string
  photoUrl: string | null
  photoId: string | null
  videoUrl: string | null
  videoId: string | null
  videoName: string | null
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Rdv],
  templateUrl: './admin.html'
})
export class Admin implements OnInit, OnDestroy {
  private readonly api = "http://localhost:3000"

  users: AdminUser[] = []
  usersLoading = false
  usersError: string | null = null
  selectedUser: AdminUser | null = null
  hasSelectedOnce = false

  messages: UiMessage[] = []
  messagesLoading = false
  messagesError: string | null = null
  messageDraft = ""
  showAttachmentMenu = false

  @ViewChild("photoInput") photoInput: ElementRef<HTMLInputElement> | undefined = undefined
  @ViewChild("videoInput") videoInput: ElementRef<HTMLInputElement> | undefined = undefined

  photoPreviewUrl: string | null = null
  previewPhotoId: string | null = null
  previewPhotoMessageId: string | null = null
  previewPhotoIsMine = false
  editMessageId: string | null = null
  editDraft = ""
  editError: string | null = null
  me: any | null = null
  myUserId: string | null = null
  view: "messages" | "rdv" = "messages"

  private activePeerId: string | null = null
  private messageSubscription: Subscription | null = null
  private photoFeature!: PhotoFeature
  private videoFeature!: VideoFeature
  unreadTotal = 0
  private lastMarkedAt = 0
  private currentConvId: string | null = null
  private systemSub: Subscription | null = null

  unreadByConv: Record<string, number> = {}
  convIdByPeer: Record<string, string> = {}

  constructor(
    private http: HttpClient,
    private chatService: ChatService,
    private deleteService: DeleteMessageService,
    private modifyService: modifyMessageService,
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService,
    private addVideoService: AddVideoService,
    private deleteVideoService: DeleteVideoService,
    private unreadService: UnreadService,
  ) { }

  ngOnInit(): void {
    this.photoFeature = new PhotoFeature(
      this.addPhotoService,
      this.deletePhotoService,
      (payload: string) => this.chatService.send(payload),
      () => this.scheduleScroll(),
      () => this.closeAttachmentMenu(),
      (messageId: string) => this.deleteMessage(messageId),
      (value: string | null | undefined) => this.isLikelyObjectId(value),
      () => { }
    )

    this.videoFeature = new VideoFeature(
      this.addVideoService,
      this.deleteVideoService,
      this.http,
      (payload: string) => this.chatService.send(payload),
      () => this.scheduleScroll(),
      () => this.closeAttachmentMenu(),
      (messageId: string) => this.deleteMessage(messageId),
      (value: string | null | undefined) => this.isLikelyObjectId(value),
      () => this.messages,
      (msgs: UiMessage[]) => (this.messages = msgs),
      () => { },
      (_i: number, _id: string) => { }
    )

    this.loadConnectedAdmin()
    this.unreadService.initialiser()

    this.unreadService.totalObservable().subscribe(n => {
      if (typeof n === "number") {
        this.unreadTotal = n
      }
      else {
        this.unreadTotal = 0
      }
    })

    this.unreadService.parConversationObservable().subscribe(map => {
      this.unreadByConv = map || {}
    })
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe()
      this.messageSubscription = null
    }
    if (this.systemSub) {
      this.systemSub.unsubscribe()
      this.systemSub = null
    }
    this.chatService.disconnect()
  }


  getDisplayName(user: AdminUser | null): string {
    if (!user) {
      return "Utilisateur"
    }
    if (user.name?.trim()) {
      return user.name.trim()
    }
    if (user.nickname?.trim()) {
      return user.nickname.trim()
    }
    if (user.email) {
      return String(user.email)
    }
    return "Utilisateur"
  }

  isSendDisabled(): boolean {
    if (!this.selectedUser) {
      return true
    }
    if (!this.messageDraft) {
      return true
    }
    return this.messageDraft.trim().length === 0
  }

  getAuthorLabel(message: UiMessage): string {
    if (message?.me) {
      return "Moi"
    }
    return this.getDisplayName(this.selectedUser)
  }

  trackByMessage(_index: number, item: UiMessage): string {
    return item?.id || String(_index)
  }

  toggleAttachmentMenu(): void {
    this.showAttachmentMenu = !this.showAttachmentMenu
  }
  closeAttachmentMenu(): void {
    if (this.showAttachmentMenu) this.showAttachmentMenu = false
  }

  selectUser(user: AdminUser): void {
    if (!user || !user._id) {
      return
    }
    const newPeerId = String(user._id)
    if (this.selectedUser?._id === user._id && this.activePeerId === newPeerId) {
      return
    }

    this.selectedUser = user
    this.hasSelectedOnce = true
    this.activePeerId = newPeerId
    this.lastMarkedAt = 0
    this.ensureConvIdFor(newPeerId)

    this.clearMessageArea()
    this.disconnectFromPeer()
    this.connectToPeer(newPeerId)
    this.fetchHistoryForPeer(newPeerId)
    this.view = "messages"
  }

  sendMessage(): void {
    this.closeAttachmentMenu()
    if (this.isSendDisabled()) {
      return
    }
    const ok = this.chatService.send(this.messageDraft.trim())
    if (!ok) {
      this.messagesError = "Impossible d'envoyer le message"
      return
    }
    this.messageDraft = ""
    this.scheduleScroll()
  }

  openPhotoPicker(): void {
    this.closeAttachmentMenu()
    this.photoFeature.openPhotoPicker(this.photoInput)
  }

  openVideoPicker(): void {
    this.closeAttachmentMenu()
    this.videoFeature.openVideoPicker(this.videoInput)
  }

  handleUploadPhoto(event: Event): void {
    this.messagesError = null
    this.photoFeature.handleUploadPhoto(event)
  }

  handleUploadVideo(event: Event): void {
    this.messagesError = null
    this.videoFeature.handleUploadVideo(event)
  }

  openPhotoFromMessage(message: UiMessage): void {
    if (!message?.id || !message.photoUrl) {
      return
    }
    this.photoPreviewUrl = message.photoUrl
    this.previewPhotoMessageId = message.id
    this.previewPhotoId = message.photoId || null
    this.previewPhotoIsMine = !!message.me
  }

  cancelPhotoPreview(): void {
    this.photoPreviewUrl = null
    this.previewPhotoId = null
    this.previewPhotoMessageId = null
    this.previewPhotoIsMine = false
  }

  async deletePhotoFromPreview(): Promise<void> {
    const id = this.previewPhotoMessageId
    if (!id) {
      return
    }
    try {
      await this.deleteMessage(id)
    }
    finally {
      this.cancelPhotoPreview()
    }
  }

  downloadVideo(message: UiMessage): void {
    if (!message?.videoUrl) {
      return
    }
    try {
      window.open(message.videoUrl, "_blank", "noopener")
    }
    catch (err) {
      console.error("downloadVideo error :", err)
    }
  }

  openEdit(message: UiMessage): void {
    if (!message?.id) {
      return
    }
    if (message.photoUrl || message.videoUrl) {
      return
    }
    this.editMessageId = message.id
    this.editDraft = message.text
    this.editError = null
  }

  cancelEdit(): void {
    this.editMessageId = null
    this.editDraft = ""
    this.editError = null
  }
  async confirmEdit(): Promise<void> {
    if (!this.editMessageId) {
      return
    }
    const trimmed = this.editDraft.trim()
    if (!trimmed) {
      this.editError = "Le message ne peut pas etre vide"
      return
    }
    try {
      const res = await this.modifyService.modifyMessage(this.editMessageId, trimmed)
      this.updateMessageAfterEdit(this.editMessageId, trimmed, res?.updatedAt)
      this.cancelEdit()
    }
    catch (e: any) {
      if (typeof e === "string") {
        this.editError = e
      }
      else {
        this.editError = "Erreur lors de la modification du message"
      }
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!messageId) {
      return
    }
    this.messagesError = null

    const target = this.messages.find(m => m.id === messageId)
    const photoId = target?.photoId || null
    const videoId = target?.videoId || null
    const videoUrl = target?.videoUrl || null
    const photoUrl = target?.photoUrl || null

    try {
      if (photoId) {
        await this.deletePhotoService.deletePhoto(photoId)
      }
      if (videoId) {
        await this.deleteVideoService.deleteVideo(videoId)
      }

      await this.deleteService.deleteMessage(messageId)

      this.messages = this.messages.filter(m => m.id !== messageId)

      if (this.previewPhotoMessageId === messageId) {
        this.cancelPhotoPreview()
      }
    }
    catch (e: any) {
      if (typeof e === "string") {
        this.messagesError = e
      }
      else {
        this.messagesError = "Erreur lors de la suppression du message"
      }
    }
  }

  private loadConnectedAdmin(): void {
    this.usersLoading = true
    this.usersError = null

    this.http.get<any>(`${this.api}/auth/me`, { withCredentials: true }).subscribe({
      next: (user) => {
        if (user?._id) {
          this.me = user
          this.myUserId = String(user._id)
        }
        else {
          this.me = null
          this.myUserId = null
        }

        if (!this.me || this.me.role !== "admin") {
          this.usersLoading = false
          this.users = []
          this.usersError = "Acces reserve aux administrateurs"
          return
        }
        this.loadUsers()
      },
      error: () => {
        this.me = null
        this.myUserId = null
        this.usersLoading = false
        this.usersError = "Impossible de recuperer l'utilisateur connecte"
      }
    })
  }

  private loadUsers(): void {
    this.usersLoading = true
    this.usersError = null

    this.http.get<any>(`${this.api}/admin/users`, { withCredentials: true }).subscribe({
      next: (response) => {
        let list: AdminUser[] = []
        if (response && Array.isArray(response.data)) {
          list = response.data
        }
        else if (Array.isArray(response)) {
          list = response
        }

        this.users = list
        this.usersLoading = false

        if (!this.hasSelectedOnce && this.users.length > 0) {
          this.selectUser(this.users[0])
        }
      },
      error: () => {
        this.users = []
        this.usersLoading = false
        this.usersError = "Impossible de recuperer la liste des utilisateurs"
      }
    })
  }

  private connectToPeer(peerId: string): void {
    const opened = this.chatService.connect(peerId)
    if (!opened) {
      this.messagesError = "Impossible d'ouvrir la connexion temps reel"
      return
    }

    this.lastMarkedAt = 0

    if (this.systemSub) this.systemSub.unsubscribe()
    this.systemSub = this.chatService.onSystem().subscribe((payload: any) => {
      let convId = ""
      if (payload && typeof payload.Conversation === "string" && payload.Conversation.trim()) {
        convId = payload.Conversation
      }
      else if (payload && typeof payload.conversationId === "string" && payload.conversationId.trim()) {
        convId = payload.conversationId
      }
      else if (payload && typeof payload.conversation === "string" && payload.conversation.trim()) {
        convId = payload.conversation
      }

      if (!convId) return
      this.currentConvId = convId
      if (this.selectedUser?._id) {
        this.convIdByPeer[this.selectedUser._id] = convId
      }
      this.markAsReadNow(convId)
    })

    if (this.messageSubscription) this.messageSubscription.unsubscribe()
    this.messageSubscription = this.chatService.stream().subscribe((m) => {
      this.handleIncoming(m)
      this.markAsReadThrottled()
    })
  }

  private disconnectFromPeer(): void {
    if (this.messageSubscription?.unsubscribe) {
      this.messageSubscription.unsubscribe()
    }
    if (this.systemSub) {
      this.systemSub.unsubscribe()
      this.systemSub = null
    }
    this.messageSubscription = null
    this.chatService.disconnect()
  }

  private fetchHistoryForPeer(peerId: string): void {
    this.messagesLoading = true
    this.messagesError = null

    this.chatService.getHistoryWithPeer(peerId, 100).subscribe({
      next: (result) => {
        if (this.activePeerId !== peerId) {
          return
        }

        const arr: UiMessage[] = []
        if (result && Array.isArray(result.messages)) {
          for (const raw of result.messages) {
            const mapped = this.mapMessage(raw)
            if (mapped.id) {
              arr.push(mapped)
              this.videoFeature.ensureVideoNameForMessage(mapped)
            }
          }
        }
        this.messages = arr
        this.messagesLoading = false
        this.scheduleScroll()
      },
      error: () => {
        if (this.activePeerId !== peerId) return
        this.messagesLoading = false
        this.messages = []
        this.messagesError = "Impossible de charger les messages"
      }
    })
  }

  private handleIncoming(msg: ChatMessage): void {
    const mapped = this.mapMessage(msg)
    if (!mapped.id) {
      return
    }

    const stick = this.shouldStickToBottom()

    const idx = this.messages.findIndex(m => m.id === mapped.id)
    if (idx >= 0) {
      this.messages[idx] = { ...this.messages[idx], ...mapped }
    }
    else {
      this.messages.push(mapped)
    }

    this.videoFeature.ensureVideoNameForMessage(mapped)

    if (stick) {
      this.scheduleScroll()
    }
  }

  private mapMessage(msg: ChatMessage | any): UiMessage {
    const id = this.extractId(msg)
    const me = this.isFromMe(msg)
    const rawText = this.extractText(msg)
    const at = this.formatDate(msg?.at)
    const updatedAt = this.formatDate(msg?.updatedAt, true)

    const vm = this.videoFeature.tryCreateUiMessage(rawText, me, at, id)
    if (vm) {
      return vm as UiMessage
    }

    const pm = this.photoFeature.tryCreateUiMessage(rawText, me, at, id)
    if (pm) {
      return pm as UiMessage
    }

    const m: UiMessage = {
      id,
      me,
      text: rawText || "",
      at,
      photoUrl: null,
      photoId: null,
      videoUrl: null,
      videoId: null,
      videoName: null
    }
    if (updatedAt) {
      m.updatedAt = updatedAt
    }
    return m
  }

  private extractId(msg: any): string {
    if (msg?._id) {
      return String(msg._id)
    }
    if (msg?.id) {
      return String(msg.id)
    }
    return ""
  }

  private isFromMe(msg: any): boolean {
    if (!this.myUserId) {
      return false
    }
    let authorId = ""
    if (msg?.userId) {
      authorId = String(msg.userId)
    }
    return authorId === String(this.myUserId)
  }

  private extractText(msg: any): string {
    if (!msg) {
      return ""
    }
    if (typeof msg.text === "string") {
      return msg.text
    }
    if (msg.text !== undefined && msg.text !== null) {
      return String(msg.text)
    }
    return ""
  }

  private formatDate(value: any, allowEmpty = false): string {
    if (!value) {
      if (allowEmpty) {
        return ""
      }
      return new Date().toLocaleString()
    }
    const d = new Date(value)
    if (isNaN(d.getTime())) {
      if (allowEmpty) {
        return ""
      }
      return new Date().toLocaleString()
    }
    return d.toLocaleString()
  }

  private isLikelyObjectId(value: string | null | undefined): boolean {
    if (!value) {
      return false
    }
    const s = String(value).trim()
    if (s.length !== 24) {
      return false
    }
    return /^[0-9a-fA-F]{24}$/.test(s)
  }

  private clearMessageArea(): void {
    this.messages = []
    this.messagesLoading = false
    this.messagesError = null
    this.messageDraft = ""
    this.editMessageId = null
    this.editDraft = ""
    this.editError = null
    this.showAttachmentMenu = false
    this.cancelPhotoPreview()
  }

  private updateMessageAfterEdit(messageId: string, newText: string, updatedAtRaw?: string): void {
    const label = this.formatDate(updatedAtRaw || new Date().toISOString(), true)
    for (const m of this.messages) {
      if (m.id === messageId) {
        m.text = newText
        if (label) {
          m.updatedAt = label
        }
      }
    }
  }

  private scrollToBottom(): void {
    scrollToBottomById("adminMessages")
  }

  private scheduleScroll(): void {
    scheduleScrollById("adminMessages")
  }

  private shouldStickToBottom(): boolean {
    return shouldStickToBottomById("adminMessages")
  }

  async copyMessage(messageId: string): Promise<void> {
    if (!messageId) return

    this.messagesError = null

    const msg = this.messages.find(m => m.id === messageId)
    if (!msg) {
      return
    }
    if (msg.photoUrl || msg.videoUrl) {
      return
    }

    const text = msg.text ?? ""

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      else {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    }
    catch {
      this.messagesError = "Erreur lors de la copie du message"
    }
  }
  onRdvCreated(evt: any) {
    console.log("RDV crée", evt)
  }

  ensureConvIdFor(userId: string) {
    if (this.convIdByPeer[userId]) {
      return
    }
    this.chatService.getHistoryWithPeer(userId, 1).subscribe({
      next: (res) => {
        if (res?.conversationId) {
          this.convIdByPeer[userId] = String(res.conversationId)
        }
      }
    })
  }

  hasUnreadFor(userId: string): boolean {
    const convId = this.convIdByPeer[userId]
    if (!convId) {
      return false
    }
    return (this.unreadByConv[convId] || 0) > 0
  }

  convUnreadCount(): number {
    const id = this.currentConvId
    if (!id) {
      return 0
    }
    return this.unreadByConv[id] || 0
  }

  private markAsReadNow(convId: string) {
    this.unreadService.marquerCommeLu(convId)
      .then(() => { this.lastMarkedAt = Date.now() })
      .catch(err => console.warn("admin: marquerCommeLu a échoué"))
  }

  private markAsReadThrottled() {
    if (!this.currentConvId) {
      return
    }
    const now = Date.now()
    if (now - this.lastMarkedAt > 2000) {
      this.markAsReadNow(this.currentConvId)
    }
  }
}