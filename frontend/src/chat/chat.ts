// src/chat/chat.ts
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { ChatService, ChatMessage } from './chat.service'
import { Subject, takeUntil } from 'rxjs'

type UiMessage = { me: boolean; text: string; at: string }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
})
export class Chat implements OnInit, OnDestroy {
  // --- injections
  private route = inject(ActivatedRoute)
  private chatService = inject(ChatService)

  // --- état local
  peerId = ''                                  // l'id de la personne en face, lu dans l'URL
  input = signal('')                           // contenu de l'input message
  messages: UiMessage[] = []                   // messages pour l'UI
  myUserId = signal<string | null>(null)       // ton propre id (si tu le connais)
  private destroy$ = new Subject<void>()       // pour unsubscribe proprement

  ngOnInit(): void {
    // 1) lire :peerId depuis l'URL
    this.peerId = String(this.route.snapshot.paramMap.get('peerId') || '')
    if (!this.peerId) {
      console.warn('[chat] pas de peerId dans l’URL, je n’ouvre pas la socket')
      return
    }

    // 2) ouvrir la connexion socket
    const ok = this.chatService.connect(this.peerId)
    if (!ok) {
      console.warn('[chat] connexion socket non ouverte (token manquant ?)')
      return
    }

    // 3) s’abonner au flux des messages
    this.chatService
      .stream()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg: ChatMessage) => {
        const iAmSender = this.myUserId() && msg.userId === this.myUserId()
        this.messages.push({
          me: !!iAmSender,
          text: msg.text,
          at: new Date(msg.at).toLocaleTimeString(),
        })
        queueMicrotask(this.scrollToBottom)
      })

    // 4) si tu connais ton userId côté front, tu peux l’assigner ici
    // Exemple : this.myUserId.set(monStore.userId)
  }

  send(): void {
    const text = this.input().trim()
    if (!text) return

    // Envoi au back via socket
    const sent = this.chatService.send(text)
    if (!sent) return

    // Affichage immédiat côté UI (sans attendre l’echo serveur)
    this.messages.push({
      me: true,
      text,
      at: new Date().toLocaleTimeString(),
    })
    this.input.set('')
    queueMicrotask(this.scrollToBottom)
  }

  private scrollToBottom() {
    const el = document.getElementById('messages')
    if (el) el.scrollTop = el.scrollHeight
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    this.chatService.disconnect()
  }
}
