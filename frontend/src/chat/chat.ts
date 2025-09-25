import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatMessage } from './chat.service';
import { DeleteMessageService } from './delete-message.service';
import { modifyMessageService } from './modify-message.service';
import { AddPhotoService } from './add-photo.service';
import { DeletePhotoService } from './delete-photo.service';
import { AddVideoService } from './add-video.service';
import { DeleteVideoService } from './delete-video.service';
import { PhotoFeature } from './photo/photo';
import { VideoFeature } from './video/video';
import { scheduleScrollById, shouldStickToBottomById, scrollToBottomById } from '../utils/scroll';

export type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
  photoUrl: string | null
  photoId: string | null
  videoUrl: string | null
  videoId: string | null
  videoName: string | null
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
})
export class Chat implements OnInit, OnDestroy {
  showActionModal: boolean = false
  modalMessageIndex: number | null = null
  selectedMessageId: string | null = null
  showEditModal: boolean = false
  brouillonEdition: string = ""
  editMessageId: string | null = null
  selectedIsMine: boolean = false
  showAttachmentMenu: boolean = false
  confirmOpen = false
  confirmKind: "message" | "photo" | "video" | "photo-preview" | null = null

  @ViewChild("photoInput") photoInput: ElementRef<HTMLInputElement> | undefined = undefined
  @ViewChild("videoInput") videoInput: ElementRef<HTMLInputElement> | undefined = undefined

  photoFeature: PhotoFeature
  videoFeature: VideoFeature

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private chat: ChatService,
    private deleteMessageService: DeleteMessageService,
    private modifyMessageService: modifyMessageService,
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService,
    private addvideoService: AddVideoService,
    private deleteVideoService: DeleteVideoService
  ) {
    this.photoFeature = new PhotoFeature(
      this.addPhotoService,
      this.deletePhotoService,
      (payload: string) => this.chat.send(payload),
      () => this.scheduleScroll(),
      () => this.closeAttachmentMenu(),
      (messageId: string) => this.handleDelete(messageId),
      (value: string | null | undefined) => this.isLikelyObjectId(value),
      () => this.closeActionModal()
    )

    this.videoFeature = new VideoFeature(
      this.addvideoService,
      this.deleteVideoService,
      this.http,
      (payload: string) => this.chat.send(payload),
      () => this.scheduleScroll(),
      () => this.closeAttachmentMenu(),
      (messageId: string) => this.handleDelete(messageId),
      (value: string | null | undefined) => this.isLikelyObjectId(value),
      () => this.messages,
      (messages: UiMessage[]) => { this.messages = messages },
      () => this.closeActionModal(),
      (index: number, messageId: string) => this.openActionModal(index, messageId),
    )
  }

  //l'id de la personne a qui on parle
  peerId: string = ""
  //ce que tu tapes dans l'input
  input = signal("")
  //messages affiches
  messages: UiMessage[] = []
  //ton propre id utilisateur
  myUserId = signal<string | null>(null)
  //nom affiché du peer (ex: "Coach")
  peerName = signal<string>("")
  //ref abonnement
  private messageSub: any = null

  ngOnInit(): void {
    this.http.get<any>("http://localhost:3000/auth/me").subscribe({
      next: (u) => {
        if (u && u._id) {
          this.myUserId.set(String(u._id))
        }
        else {
          this.myUserId.set(null)
        }
      },
      error: () => this.myUserId.set(null)
    })

    const fromUrl = this.route.snapshot.paramMap.get("peerId")
    if (typeof fromUrl === "string") {
      this.peerId = fromUrl
    }
    else {
      this.peerId = ""
    } if (!this.peerId) {
      console.warn("[chat] pas de peerId dans l'URL, j'arrête ici")
      return
    }

    this.http.get<any>(`http://localhost:3000/user/${this.peerId}`).subscribe({
      next: (u) => this.peerName.set(u?.name || u?.nickname || u?.email || "Coach"),
      error: () => this.peerName.set("Coach")
    })

    this.chat.getHistoryWithPeer(this.peerId, 50).subscribe({
      next: (res) => {
        if (res && Array.isArray(res.messages)) {
          const myId = this.myUserId()
          for (const msg of res.messages) {
            let isMe = false
            if (myId && msg?.userId && String(msg.userId) === String(myId)) {
              isMe = true
            }
            let when: Date
            if (msg?.at) {
              when = new Date(msg.at)
            }
            else {
              when = new Date()
            }
            const at = when.toLocaleTimeString()
            let id = ""
            if (typeof (msg as any)._id === "string") {
              id = (msg as any)._id
            }
            else if (typeof (msg as any).id === "string") {
              id = (msg as any).id
            }
            const uiItem = this.buildUiMessage(msg, isMe, at, id)
            this.messages.push(uiItem)
            this.ensureVideoNameForMessage(uiItem)
          }
          this.scheduleScroll()
        }

        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant ?)")
          return
        }

        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false
          if (myId && msg?.userId && String(msg.userId) === String(myId)) {
            isMe = true
          }
          let when: Date
          if (msg?.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }
          const at = when.toLocaleTimeString()
          let id = ""
          if (typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          const uiItem = this.buildUiMessage(msg, isMe, at, id)
          this.messages.push(uiItem)
          this.ensureVideoNameForMessage(uiItem)
          this.scheduleScroll()
        })
      },
      error: () => {
        console.warn("[chat] impossible de charger l'historique, j'ouvre quand même la socket")
        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant ?)")
          return
        }
        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false
          if (myId && msg?.userId && String(msg.userId) === String(myId)) {
            isMe = true
          }
          let when: Date
          if (msg?.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }
          const at = when.toLocaleTimeString()
          let id = ""
          if (typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          const uiItem = this.buildUiMessage(msg, isMe, at, id)
          this.messages.push(uiItem)
          this.ensureVideoNameForMessage(uiItem)
          this.scheduleScroll()
        })
      }
    })
  }

  send(): void {
    this.closeAttachmentMenu()
    const text = this.input().trim()
    if (!text) {
      return
    }
    const ok = this.chat.send(text)
    if (!ok) {
      return
    }
    this.input.set("")
    this.scheduleScroll()
  }

  toggleAttachmentMenu(): void {
    this.showAttachmentMenu = !this.showAttachmentMenu
  }

  closeAttachmentMenu(): void {
    if (this.showAttachmentMenu) this.showAttachmentMenu = false
  }

  openPhotoPicker(): void {
    this.photoFeature.openPhotoPicker(this.photoInput)
  }

  openVideoPicker(): void {
    this.videoFeature.openVideoPicker(this.videoInput)
  }

  private scrollToBottom(): void {
    scrollToBottomById("messages")
  }

  private scheduleScroll(): void {
    scheduleScrollById("messages")
  }

  private shouldStickToBottom(): boolean {
    return shouldStickToBottomById("messages")
  }

  private buildUiMessage(msg: ChatMessage | null | undefined, isMe: boolean, at: string, id: string): UiMessage {
    let text = ""
    if (typeof msg?.text === "string") {
      text = msg!.text
    }

    const videoMessage = this.videoFeature.tryCreateUiMessage(text, isMe, at, id)
    if (videoMessage) {
      return videoMessage
    }

    const photoMessage = this.photoFeature.tryCreateUiMessage(text, isMe, at, id)
    if (photoMessage) {
      return photoMessage
    }

    return { id, me: isMe, text, at, photoUrl: null, photoId: null, videoUrl: null, videoId: null, videoName: null }
  }

  private isLikelyObjectId(value: string | null | undefined): boolean {
    if (!value) {
      return false
    }
    const trimmed = String(value).trim()
    if (trimmed.length !== 24) {
      return false
    }
    return /^[0-9a-fA-F]{24}$/.test(trimmed)
  }

  trackByIdx(i: number, _m: UiMessage) { return i }

  ngOnDestroy(): void {
    if (this.messageSub?.unsubscribe) {
      this.messageSub.unsubscribe()
    }
    this.chat.disconnect()
  }

  openActionModal(i: number, messageId: string): void {
    this.closeAttachmentMenu()
    this.modalMessageIndex = i
    this.selectedMessageId = messageId
    this.showActionModal = true

    let message: UiMessage | undefined = undefined
    if (i >= 0 && i < this.messages.length) {
      message = this.messages[i]
    }
    this.selectedIsMine = Boolean(message && message.me === true)

    this.photoFeature.resetSelection()
    this.videoFeature.resetSelection()
    this.photoFeature.applySelectionFromMessage(message)
    this.videoFeature.applySelectionFromMessage(message)
  }

  closeActionModal(): void {
    this.showActionModal = false
    this.modalMessageIndex = null
    this.selectedMessageId = null
    this.selectedIsMine = false
    this.photoFeature.resetSelection()
    this.videoFeature.resetSelection()
  }

  async handleDelete(messageId: string): Promise<void> {
    try {
      const existing = this.messages.find(m => m.id === messageId)
      await this.deleteMessageService.deleteMessage(messageId)
      this.photoFeature.onMessageDeleted(existing, messageId)
      this.videoFeature.onMessageDeleted(existing)
      this.messages = this.messages.filter(m => m.id !== messageId)
      this.closeActionModal()
    }
    catch (err) {
      console.error("Erreur de suppresion du message :", err)
    }
  }

  async confirmDelete(): Promise<void> {
    const id = this.selectedMessageId
    if (!id) {
      return
    }
    await this.handleDelete(id)
  }

  async copierMessageSelectionne(): Promise<void> {
    // on teste les flags directement sur les features (plus de getters)
    if (this.photoFeature.selectedMessageHasPhoto || this.videoFeature.selectedMessageHasVideo) {
      return
    }
    const id = this.selectedMessageId
    if (!id) {
      return
    }

    let texte = ""
    for (let i = 0; i < this.messages.length; i++) {
      const item = this.messages[i]
      if (!item) {
        continue
      }
      if (item.id === id) {
        if (item.text) {
          texte = item.text
        }
        break
      }
    }

    try {
      await navigator.clipboard.writeText(texte)
    }
    catch (err) {
      console.error(err)
    }
    this.closeActionModal()
  }

  openSelectedPhoto(): void {
    this.photoFeature.openSelectedPhoto(this.selectedMessageId, this.selectedIsMine)
  }

  downloadSelectedVideo(): void {
    this.videoFeature.downloadSelectedVideo()
  }

  private ensureVideoNameForMessage(message: UiMessage): void {
    this.videoFeature.ensureVideoNameForMessage(message)
  }

  handleVideoLinkClick(event: MouseEvent, index: number, messageId: string, isMine: boolean | null | undefined): void {
    this.videoFeature.handleVideoLinkClick(event, index, messageId, isMine)
  }

  async confirmDeletePhoto(): Promise<void> {
    await this.photoFeature.confirmDeletePhoto(this.selectedMessageId)
  }

  async confirmDeleteVideo(): Promise<void> {
    await this.videoFeature.confirmDeleteVideo(this.selectedMessageId)
  }

  ouvrirEditionMessage(): void {
    if (this.modalMessageIndex == null || !this.selectedMessageId) {
      return
    }
    if (this.modalMessageIndex < 0 || this.modalMessageIndex >= this.messages.length) {
      return
    }
    const msg = this.messages[this.modalMessageIndex]
    if (!msg) {
      return
    }
    if (msg.photoUrl) {
      return
    }
    if (msg.videoUrl) {
      return
    }
    if (msg.text) {
      this.brouillonEdition = msg.text
    }
    else {
      this.brouillonEdition = ""
    }
    this.editMessageId = this.selectedMessageId
    this.showActionModal = false
    this.showEditModal = true
  }

  fermerEdition(): void {
    this.showEditModal = false
    this.brouillonEdition = ""
    this.editMessageId = null
  }

  async confirmRename(): Promise<void> {
    const id = this.editMessageId
    const nouveauTexte = this.brouillonEdition
    if (!id) {
      return
    }
    try {
      await this.modifyMessageService.modifyMessage(id, nouveauTexte)
      const idx = this.messages.findIndex(m => m.id === id)
      if (idx !== -1) {
        this.messages[idx] = { ...this.messages[idx], text: String(nouveauTexte) }
      }
      this.fermerEdition()
    }
    catch (err) {
      console.error("[confirmRename] erreur :", err)
    }
  }

  async handleUploadPhoto(event: Event): Promise<void> {
    await this.photoFeature.handleUploadPhoto(event)
  }

  async deletePhotoFromPreview(): Promise<void> {
    await this.photoFeature.deletePhotoFromPreview()
  }

  openPhotoPreview(url: string, photoId: string | null, messageId: string | null, isMine: boolean | null): void {
    this.photoFeature.openPhotoPreview(url, photoId, messageId, isMine)
  }

  closePhotoPreview(event: MouseEvent): void {
    this.photoFeature.closePhotoPreview(event)
  }

  cancelPhotoPreview(): void {
    this.photoFeature.cancelPhotoPreview()
  }

  async handleUploadVideo(event: Event): Promise<void> {
    await this.videoFeature.handleUploadVideo(event)
  }

  openConfirm(kind: "message" | "photo" | "video" | "photo-preview"): void {
    this.showActionModal = false
    this.confirmKind = kind
    this.confirmOpen = true
  }

  openConfirmPhotoFromPreview(): void {
    this.selectedMessageId = this.photoFeature.previewPhotoMessageId
    this.openConfirm("photo-preview")
  }

  closeConfirm(): void {
    this.confirmOpen = false
    this.confirmKind = null
  }

  async confirmAction(): Promise<void> {
    const kind = this.confirmKind
    this.closeConfirm()
    if (kind === "message") {
      await this.confirmDelete()
    }
    else if (kind === "photo") {
      await this.confirmDeletePhoto()
    }
    else if (kind === "photo-preview") {
      await this.deletePhotoFromPreview()
    }
    else if (kind === "video") {
      await this.confirmDeleteVideo()
    }
  }

  getSelectedVideoName(): string {
    const id = this.editMessageId
    if (!id) {
      return ""
    }
    const m = this.messages.find(x => x.id === id)
    return m?.videoName || "la video"
  }

}