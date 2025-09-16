// src/chat/chat.service.ts
import { Injectable, inject } from '@angular/core'
import { io, Socket } from 'socket.io-client'
import { Subject, Observable } from 'rxjs'
import { LoginService } from '../login/login.service'

export type ChatMessage = {
    _id: string
    conversationId: string
    userId: string
    text: string
    at: string
}

@Injectable({ providedIn: 'root' })
export class ChatService {
    private socket?: Socket
    private peerId: string | null = null
    private messages$ = new Subject<ChatMessage>()
    private API_URL = 'http://localhost:3000'

    private auth = inject(LoginService)

    /**
     * Ouvre la socket et rejoint la room 1-à-1.
     * @returns boolean : true si la connexion est lancée, false sinon (ex: pas de token).
     */
    connect(peerId: string): boolean {
        if (!peerId) return false
        this.peerId = peerId

        const token = this.auth.accessToken()
        if (!token) {
            console.warn('[chat] pas de token JWT, impossible d’ouvrir la socket')
            return false
        }

        // Si une socket existe déjà, on la ferme proprement.
        if (this.socket) {
            this.socket.disconnect()
            this.socket = undefined
        }

        this.socket = io(this.API_URL, {
            transports: ['websocket'],
            withCredentials: true,
            extraHeaders: { Authorization: `Bearer ${token}` },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        // Connecté → on rejoint la salle 1-à-1
        this.socket.on('connect', () => {
            this.socket?.emit('join', { peerId })
        })

        // Messages du serveur → poussé dans le flux
        this.socket.on('message', (msg: ChatMessage) => {
            this.messages$.next(msg)
        })

        // Événements système (optionnel, utile pour debug)
        this.socket.on('system', (evt: any) => {
            // console.log('[chat][system]', evt)
        })

        // Déconnexions / erreurs (debug soft)
        this.socket.on('disconnect', (reason) => {
            // console.log('[chat] disconnect:', reason)
        })
        this.socket.on('connect_error', (err) => {
            // console.warn('[chat] connect_error:', err?.message || err)
        })

        return true
    }

    /**
     * Envoie un message au pair courant.
     * @returns boolean : true si émis, false sinon (socket/peerId manquants).
     */
    send(text: string): boolean {
        if (!this.socket || !this.peerId) return false
        const payload = { peerId: this.peerId, text }
        this.socket.emit('message', payload)
        return true
    }

    /**
     * Flux observable des messages entrants.
     */
    stream(): Observable<ChatMessage> {
        return this.messages$.asObservable()
    }

    /**
     * Coupe proprement la connexion.
     */
    disconnect(): void {
        this.socket?.disconnect()
        this.socket = undefined
        this.peerId = null
    }
}
