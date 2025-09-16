// src/chat/chat.ts
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { ChatService, ChatMessage } from './chat.service'
import { Subject, takeUntil } from 'rxjs'
// (optionnel) pour récupérer mon id ou le nom du peer :
import { HttpClient } from '@angular/common/http'

type UiMessage = { me: boolean; text: string; at: string }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
})
export class Chat implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute)
  private chatService = inject(ChatService)
  private http = inject(HttpClient) // optionnel, utile pour /auth/me et /users/:id

  peerId = ''
  input = signal('')
  messages: UiMessage[] = []
  myUserId = signal<string | null>(null)

  // 🔹 pour le titre du header (facultatif mais pratique)
  peerName = signal<string>('')

  private destroy$ = new Subject<void>()

  ngOnInit(): void {
    // (optionnel) connaître mon propre id pour que "Moi/Lui" soit correct
    this.http.get<any>('http://localhost:3000/auth/me').subscribe({
      next: u => this.myUserId.set(u?._id || null),
      error: () => { }
    })

    this.peerId = String(this.route.snapshot.paramMap.get('peerId') || '')
    if (!this.peerId) {
      console.warn('[chat] pas de peerId dans l’URL, je n’ouvre pas la socket')
      return
    }

    // (optionnel) récupérer le nom du peer pour le header
    this.http.get<any>(`http://localhost:3000/users/${this.peerId}`).subscribe({
      next: u => this.peerName.set(u?.name || u?.nickname || u?.email || 'Coach'),
      error: () => this.peerName.set('Coach')
    })

    const ok = this.chatService.connect(this.peerId)
    if (!ok) {
      console.warn('[chat] connexion socket non ouverte (token manquant ?)')
      return
    }

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
  }

  send(): void {
    const text = this.input().trim()
    if (!text) return

    const sent = this.chatService.send(text)
    if (!sent) return

    this.messages.push({ me: true, text, at: new Date().toLocaleTimeString() })
    this.input.set('')
    queueMicrotask(this.scrollToBottom)
  }

  private scrollToBottom() {
    const el = document.getElementById('messages')
    if (el) el.scrollTop = el.scrollHeight
  }

  // 🔹 requis par le template (`trackBy: trackByIdx`)
  trackByIdx = (i: number, _m: UiMessage) => i

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    this.chatService.disconnect()
  }
}
