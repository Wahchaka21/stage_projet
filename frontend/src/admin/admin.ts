import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../chat/chat.service';
import { DeleteMessageService } from '../chat/delete-message.service';
import { modifyMessageService } from '../chat/modify-message.service';

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
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
})
export class Admin implements OnInit, OnDestroy {
  private API = "http://localhost:3000"

  users: AdminUser[] = []
  usersLoading = false
  usersError: string | null = null
  selectedUser: AdminUser | null = null
  initialSelectionDone = false
  messages: UiMessage[] = []
  messagesLoading = false
  messagesError: string | null = null
  messageDraft = ""
  editMessageId: string | null = null
  editDraft = ""
  editError: string | null = null
  me: any | null = null
  myUserId: string | null = null

  private currentPeerId: string | null = null
  private messageSub: Subscription | null = null

  constructor(
    private http: HttpClient,
    private chat: ChatService,
    private deleteService: DeleteMessageService,
    private modifyService: modifyMessageService
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser()
  }

  ngOnDestroy(): void {
    if (this.messageSub) {
      this.messageSub.unsubscribe()
      this.messageSub = null
    }
    this.chat.disconnect()
  }

  getDisplayName(user: AdminUser | null): string {
    if (!user) {
      return "Utilisateur"
    }

    if (user.name && String(user.name).trim().length > 0) {
      return String(user.name)
    }

    if (user.nickname && String(user.nickname).trim().length > 0) {
      return String(user.nickname)
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

    const trimmed = this.messageDraft.trim()
    if (trimmed.length === 0) {
      return true
    }

    return false
  }

  selectUser(user: AdminUser): void {
    if (!user || !user._id) {
      return
    }

    if (this.selectedUser && this.selectedUser._id === user._id && this.currentPeerId === String(user._id)) {
      return
    }

    this.selectedUser = user
    this.initialSelectionDone = true
    this.currentPeerId = String(user._id)
    this.messages = []
    this.messagesLoading = true
    this.messagesError = null
    this.messageDraft = ""
    this.editMessageId = null
    this.editDraft = ""
    this.editError = null

    if (this.messageSub) {
      this.messageSub.unsubscribe()
      this.messageSub = null
    }
    this.chat.disconnect()

    const opened = this.chat.connect(this.currentPeerId)
    if (opened) {
      this.messageSub = this.chat.stream().subscribe((msg) => {
        this.handleIncoming(msg)
      })
    }
    else {
      this.messagesError = "Impossible d'ouvrir la connexion temps réel"
    }

    const targetId = this.currentPeerId
    this.chat.getHistoryWithPeer(targetId, 100).subscribe({
      next: (res) => {
        if (this.currentPeerId !== targetId) {
          return
        }
        if (res && Array.isArray(res.messages)) {
          const mapped: UiMessage[] = []
          for (const item of res.messages) {
            const ui = this.mapMessage(item)
            if (ui.id) {
              mapped.push(ui)
            }
          }
          this.messages = mapped
          this.scrollToBottom()
        }
        else {
          this.messages = []
        }
        this.messagesLoading = false
      },
      error: () => {
        if (this.currentPeerId !== targetId) {
          return
        }
        this.messagesLoading = false
        this.messagesError = "Impossible de charger les messages"
      }
    })
  }

  sendMessage(): void {
    if (!this.selectedUser) {
      return
    }
    this.messagesError = null

    const text = this.messageDraft
    if (!text) {
      return
    }

    const trimmed = text.trim()
    if (trimmed.length === 0) {
      return
    }

    const ok = this.chat.send(trimmed)
    if (!ok) {
      this.messagesError = "Impossible d'envoyer le message"
      return
    }

    this.messageDraft = ""
  }

  openEdit(message: UiMessage): void {
    if (!message || !message.id) {
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
    this.editError = null

    const draft = this.editDraft
    if (!draft) {
      this.editError = "Le message ne peut pas être vide"
      return
    }
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      this.editError = "Le message ne peut pas être vide"
      return
    }

    try {
      const result = await this.modifyService.modifyMessage(this.editMessageId, trimmed)
      for (const item of this.messages) {
        if (item.id === this.editMessageId) {
          item.text = trimmed
          let updatedLabel = ""
          if (result && result.updatedAt) {
            const updatedDate = new Date(result.updatedAt)
            if (!isNaN(updatedDate.getTime())) {
              updatedLabel = updatedDate.toLocaleString()
            }
          }
          if (!updatedLabel) {
            const now = new Date()
            updatedLabel = now.toLocaleString()
          }
          item.updatedAt = updatedLabel
        }
      }
      this.editMessageId = null
      this.editDraft = ""
    }
    catch (err: any) {
      if (typeof err === "string") {
        this.editError = err
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
    try {
      await this.deleteService.deleteMessage(messageId)
      const filtered: UiMessage[] = []
      for (const item of this.messages) {
        if (item.id !== messageId) {
          filtered.push(item)
        }
      }
      this.messages = filtered
    }
    catch (err: any) {
      if (typeof err === "string") {
        this.messagesError = err
      } else {
        this.messagesError = "Erreur lors de la suppression du message"
      }
    }
  }

  async copyMessage(messageId: string): Promise<void> {
    if (!messageId) {
      return
    }
    this.messagesError = null
    const item = this.messages.find((m) => m.id === messageId)
    if (!item) {
      return
    }
    if (!navigator || !navigator.clipboard) {
      this.messagesError = "La copie n'est pas disponible sur ce navigateur"
      return
    }
    try {
      await navigator.clipboard.writeText(item.text)
    }
    catch (_err) {
      this.messagesError = "Erreur lors de la copie du message"
    }
  }

  getAuthorLabel(message: UiMessage): string {
    if (message && message.me) {
      return "Moi"
    }
    return this.getDisplayName(this.selectedUser)
  }

  trackByMessage(index: number, item: UiMessage): string {
    if (item && item.id) {
      return item.id
    }
    return String(index)
  }

  private loadCurrentUser(): void {
    this.usersLoading = true
    this.usersError = null

    this.http.get<any>(`${this.API}/auth/me`, { withCredentials: true }).subscribe({
      next: (user) => {
        if (user && user._id) {
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
    this.usersError = null
    this.usersLoading = true

    this.http.get<any>(`${this.API}/admin/users`, { withCredentials: true }).subscribe({
      next: (res) => {
        let list: AdminUser[] = []
        if (res && Array.isArray(res.data)) {
          list = res.data
        }
        else if (Array.isArray(res)) {
          list = res
        }
        this.users = list
        this.usersLoading = false

        if (!this.initialSelectionDone && this.users.length > 0) {
          this.selectUser(this.users[0])
        }
      },
      error: () => {
        this.usersLoading = false
        this.users = []
        this.usersError = "Impossible de recuperer la liste des utilisateurs"
      }
    })
  }

  private handleIncoming(msg: ChatMessage): void {
    const ui = this.mapMessage(msg)
    if (!ui.id) {
      return
    }

    let updated = false
    for (const item of this.messages) {
      if (item.id === ui.id) {
        item.text = ui.text
        item.at = ui.at
        item.updatedAt = ui.updatedAt
        updated = true
      }
    }

    if (!updated) {
      this.messages.push(ui)
    }

    this.scrollToBottom()
  }

  private mapMessage(msg: ChatMessage | any): UiMessage {
    const id = this.extractId(msg)
    const me = this.isFromMe(msg)
    const text = this.extractText(msg)
    let atSource: any = undefined
    if (msg && msg.at) {
      atSource = msg.at
    }
    const at = this.formatDate(atSource)

    let updatedSource: any = undefined
    if (msg && msg.updatedAt) {
      updatedSource = msg.updatedAt
    }
    const updatedAt = this.formatDate(updatedSource, true)

    const result: UiMessage = {
      id,
      me,
      text,
      at
    }

    if (updatedAt) {
      result.updatedAt = updatedAt
    }

    return result
  }

  private extractId(msg: any): string {
    if (msg && msg._id) {
      return String(msg._id)
    }

    if (msg && msg.id) {
      return String(msg.id)
    }

    return ""
  }

  private isFromMe(msg: any): boolean {
    if (!this.myUserId) {
      return false
    }

    if (msg && msg.userId) {
      if (String(msg.userId) === String(this.myUserId)) {
        return true
      }
    }
    return false
  }

  private extractText(msg: any): string {
    if (!msg) {
      return ""
    }

    if (typeof msg.text === "string") {
      return msg.text
    }

    if (msg.text != null) {
      return String(msg.text)
    }
    return ""
  }

  private formatDate(value: any, allowEmpty: boolean = false): string {
    if (!value) {
      if (allowEmpty) {
        return ""
      }
      const now = new Date()
      return now.toLocaleString()
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      if (allowEmpty) {
        return ""
      }
      const now = new Date()
      return now.toLocaleString()
    }
    return date.toLocaleString()
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const area = document.getElementById('adminMessages')
      if (!area) {
        return
      }
      area.scrollTop = area.scrollHeight
    })
  }
}
