import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatMessage } from './chat.service';
import { DeleteMessageService } from './delete-message.service';

type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
})
export class Chat implements OnInit, OnDestroy {

  // --- état UI pour la modale d’actions ---
  showActionModal: boolean = false
  modalMessageIndex: number | null = null
  selectedMessageId: string | null = null
  showEditModal: boolean = false
  brouillonEdition: string = ""
  editMessageId: string | null = null

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private chat: ChatService,
    private deleteMessageService: DeleteMessageService
  ) { }

  //l'id de la personne a qui on parle
  peerId: string = ""
  //ce que tu tapes dans l’input
  input = signal("")
  //messages affiches
  messages: UiMessage[] = []
  //ton propre id utilisateur
  myUserId = signal<string | null>(null)
  //nom affiche du peer (ex: “Coach”)
  peerName = signal<string>("")

  //on garde la reference a l’abonnement pour pouvoir unsubscribe
  private messageSub: any = null

  ngOnInit(): void {
    //Recuperer mon propre userId (pour tagger “moi” / “lui”)
    this.http.get<any>("http://localhost:3000/auth/me").subscribe({
      next: (u) => {
        if (u && u._id) {
          this.myUserId.set(String(u._id))
        } else {
          this.myUserId.set(null)
        }
      },
      error: () => {
        this.myUserId.set(null)
      }
    })

    //Lire l’ID du peer dans l’URL
    //si pas de peerId, on arrête
    const fromUrl = this.route.snapshot.paramMap.get("peerId")
    if (typeof fromUrl === "string") {
      this.peerId = fromUrl
    }
    else {
      this.peerId = ""
    }

    if (!this.peerId) {
      console.warn("[chat] pas de peerId dans l'URL, j'arrête ici")
      return
    }

    //Afficher un nom sympa pour le header (en option)
    this.http.get<any>(`http://localhost:3000/user/${this.peerId}`).subscribe({
      next: (u) => {
        if (u && (u.name || u.nickname || u.email)) {
          this.peerName.set(u.name || u.nickname || u.email)
        }
        else {
          this.peerName.set("Coach")
        }
      },
      error: () => {
        this.peerName.set("Coach")
      }
    })

    //Charger l’historique AVANT d’ouvrir la socket
    this.chat.getHistoryWithPeer(this.peerId, 50).subscribe({
      next: (res) => {
        // securiser
        if (res && Array.isArray(res.messages)) {
          const myId = this.myUserId()

          for (const msg of res.messages) {
            let isMe = false
            if (myId && msg && msg.userId) {
              if (String(msg.userId) === String(myId)) {
                isMe = true
              }
            }

            let when: Date
            if (msg && msg.at) {
              when = new Date(msg.at)
            }
            else {
              when = new Date()
            }

            const at = when.toLocaleTimeString()

            let id = ""
            if (msg && typeof (msg as any)._id === "string") {
              id = (msg as any)._id
            }
            else if (msg && typeof (msg as any).id === "string") {
              id = (msg as any).id
            }
            else {
              id = ""
            }

            this.messages.push({
              id: id,
              me: isMe,
              text: msg?.text || "",
              at: at,
            })
          }

          //scroller après rendu
          queueMicrotask(() => this.scrollToBottom())
        }

        //ensuite ouvrir la socket
        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant e)")
          return
        }

        //S’abonner aux messages temps reel
        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false

          if (myId && msg && msg.userId) {
            if (String(msg.userId) === String(myId)) {
              isMe = true
            }
          }

          let when: Date
          if (msg && msg.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }

          const at = when.toLocaleTimeString()

          let id = ""
          if (msg && typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (msg && typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          else {
            id = ""
          }

          this.messages.push({
            id: id,
            me: isMe,
            text: msg?.text || "",
            at,
          })

          queueMicrotask(() => this.scrollToBottom())
        })
      },
      error: () => {
        console.warn("[chat] impossible de charger l'historique, j'ouvre quand même la socket")

        // même si l’historique echoue, on ouvre la socket pour le temps reel
        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant e)")
          return
        }

        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false

          if (myId && msg && msg.userId) {
            if (String(msg.userId) === String(myId)) {
              isMe = true
            }
          }

          let when: Date
          if (msg && msg.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }

          const at = when.toLocaleTimeString()

          let id = ""
          if (msg && typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (msg && typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          else {
            id = ""
          }

          this.messages.push({
            id: id,
            me: isMe,
            text: msg?.text || "",
            at,
          })

          queueMicrotask(() => this.scrollToBottom())
        })
      }
    })
  }

  send(): void {
    //lire le texte, trim et valider
    const text = this.input().trim()
    if (!text) {
      return
    }

    //envoyer au back via socket
    const ok = this.chat.send(text)
    if (!ok) {
      return
    }

    //vider l’input + scroll en bas
    this.input.set("")
    queueMicrotask(() => this.scrollToBottom())
  }

  private scrollToBottom(): void {
    const el = document.getElementById("messages")
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }

  trackByIdx(i: number, _m: UiMessage) { return i }

  ngOnDestroy(): void {
    if (this.messageSub && typeof this.messageSub.unsubscribe === "function") {
      this.messageSub.unsubscribe()
    }
    this.chat.disconnect()
  }

  async handleDelete(messageId: string): Promise<void> {
    try {
      await this.deleteMessageService.deleteMessage(messageId)
      this.messages = this.messages.filter(m => m.id !== messageId)
      this.closeActionModal()
    }
    catch (err) {
      console.error("Erreur de suppresion du message :", err)
    }
  }

  openActionModal(i: number, messageId: string): void {
    this.modalMessageIndex = i
    this.selectedMessageId = messageId
    this.showActionModal = true
  }

  closeActionModal(): void {
    this.showActionModal = false
    this.modalMessageIndex = null
    this.selectedMessageId = null
  }

  async confirmDelete(): Promise<void> {
    const id = this.selectedMessageId
    if (!id) {
      return
    }
    await this.handleDelete(id)
  }

  async copierMessageSelectionne(): Promise<void> {
    const id = this.selectedMessageId
    if (!id) { return }
    const item = this.messages.find(m => m.id === id)
    const texte = item?.text ?? ""
    try { await navigator.clipboard.writeText(texte) } catch { }
    this.closeActionModal()
  }

  ouvrirEditionMessage(): void {
    if (this.modalMessageIndex == null || !this.selectedMessageId) return
    const msg = this.messages[this.modalMessageIndex]
    this.brouillonEdition = msg?.text || ""
    this.editMessageId = this.selectedMessageId
    this.showActionModal = false
    this.showEditModal = true
  }

  fermerEdition(): void {
    this.showEditModal = false
    this.brouillonEdition = ""
    this.editMessageId = null
  }

  async validerEdition(): Promise<void> {
    const id = this.editMessageId
    const nouveau = (this.brouillonEdition || "").trim()
    if (!id || !nouveau) { this.fermerEdition(); return }

    const cible = this.messages.find(m => m.id === id)
    if (cible) {
      cible.text = nouveau
    }
    this.fermerEdition()
  }

}