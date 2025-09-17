import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatMessage } from './chat.service';

type UiMessage = {
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
  private route = inject(ActivatedRoute)
  private http = inject(HttpClient)
  private chat = inject(ChatService)

  //l'id de la personne à qui on parle
  peerId: string = ""
  //ce que tu tapes dans l’input
  input = signal("")
  //messages affichés
  messages: UiMessage[] = []
  //ton propre id utilisateur
  myUserId = signal<string | null>(null)
  //nom affiché du peer (ex: “Coach”)
  peerName = signal<string>("")

  //on garde la référence à l’abonnement pour pouvoir unsubscribe
  private messageSub: any = null

  ngOnInit(): void {
    //Récupérer mon propre userId (pour tagger “moi” / “lui”)
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
    this.http.get<any>(`http://localhost:3000/users/${this.peerId}`).subscribe({
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

    const opened = this.chat.connect(this.peerId)
    if (!opened) {
      console.warn("[chat] socket non ouverte (token manquant ?)")
      return
    }

    //S’abonner aux messages entrants
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

      this.messages.push({
        me: isMe,
        text: msg?.text || "",
        at,
      })

      //scroll en bas après ajout
      queueMicrotask(() => this.scrollToBottom())
    })
  }

  send(): void {
    //lire le texte, trim et valider
    const text = this.input().trim()
    if (!text) return

    //envoyer au back via socket
    const ok = this.chat.send(text)
    if (!ok) return

    //afficher immédiatement côté UI
    this.messages.push({
      me: true,
      text,
      at: new Date().toLocaleTimeString(),
    })

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

  //optionnel : si ton *ngFor a trackBy
  trackByIdx(i: number, _m: UiMessage) { return i }

  ngOnDestroy(): void {
    //se désabonner proprement
    if (this.messageSub && typeof this.messageSub.unsubscribe === "function") {
      this.messageSub.unsubscribe()
    }
    //fermer la socket
    this.chat.disconnect()
  }
}