// src/chat/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // (pas obligatoire ici, mais utile si tu veux plus tard)
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { LoginService } from '../login/login.service';

export type ChatMessage = {
    _id: string
    conversationId: string
    userId: string
    text: string
    at: string
}

@Injectable({ providedIn: 'root' })
export class ChatService {
    private API_URL = "http://localhost:3000"

    // la connexion socket en cours
    private socket: Socket | null = null
    // avec qui on discute en ce moment
    private peerId: string | null = null
    // flux des messages entrants
    private messages$ = new Subject<ChatMessage>()

    constructor(private auth: LoginService, private _http: HttpClient) { }

    /**
     * Ouvre la socket et rejoint la “salle 1-1” avec peerId.
     * Retourne true si la connexion est lancée, false sinon.
     */
    connect(peerId: string): boolean {
        //vérifier les prérequis
        if (!peerId || typeof peerId !== "string") {
            console.warn("[chat] peerId manquant ou invalide")
            return false
        }

        const token = this.auth.accessToken()
        if (!token) {
            console.warn("[chat] pas de token JWT, impossible d'ouvrir la socket")
            return false
        }

        //fermer toute ancienne socket proprement
        if (this.socket) {
            try {
                this.socket.disconnect()
            }
            catch (err) {
                console.log(err)
            }
            this.socket = null
        }

        //mémoriser le peer courrant
        this.peerId = peerId

        //ouvrir une nouvelle connexion socket
        this.socket = io(this.API_URL, {
            transports: ['websocket'],
            withCredentials: true,
            extraHeaders: { Authorization: `Bearer ${token}` },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        //une fois connecté, rejoindre la salle
        this.socket.on("connect", () => {
            if (this.socket) {
                this.socket.emit("join", { peerId: peerId })
            }
        })

        //écouter les messages entrants et pousser dans le Subject
        this.socket.on("message", (msg: ChatMessage) => {
            this.messages$.next(msg)
        })

        //events pour debug
        this.socket.on("system", (evt: any) => {
            console.log('[chat][system]', evt)
        })

        this.socket.on("disconnect", (reason) => {
            console.log('[chat] disconnect:', reason)
        })

        this.socket.on("connect_error", (err) => {
            console.warn('[chat] connect_error:', err?.message || err)
        })

        return true
    }

    /*  Envoie un message au pair courant.
        Retourne true si le message a été émis, false sinon.
     */
    send(text: string): boolean {
        //vérifier qu’on a une socket ouverte et un peer
        if (!this.socket) {
            return false
        }
        if (!this.peerId) {
            return false
        }

        //vérifier que le texte est correct (string non vide)
        if (typeof text !== 'string') {
            return false
        }

        const trimmed = text.trim()

        if (trimmed.length === 0) {
            return false
        }

        //construire la payload et l’émettre
        const payload = { peerId: this.peerId, text: trimmed }
        this.socket.emit('message', payload)
        return true
    }

    /*  Donne le flux observable des messages entrants.
        (le composant s’y abonne)
     */
    stream(): Observable<ChatMessage> {
        return this.messages$.asObservable()
    }

    /* Coupe proprement la connexion (socket + état interne).*/
    disconnect(): void {
        if (this.socket) {
            try {
                this.socket.disconnect()
            }
            catch (err) {
                console.error(err)
            }
            this.socket = null
        }
        this.peerId = null
    }
}