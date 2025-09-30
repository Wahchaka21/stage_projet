import { Injectable } from "@angular/core";
import { BehaviorSubject, Subscription } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { NotificationSocketService } from "./notif-socket.service";
import { firstValueFrom } from "rxjs";

type UnreadMap = Record<string, number>

@Injectable({
    providedIn: 'root'
})
export class UnreadService {
    private parConversation$ = new BehaviorSubject<UnreadMap>({})
    private total$ = new BehaviorSubject<number>(0)
    private api = "http://localhost:3000/chat"

    private socketSub: Subscription | null = null

    constructor(private http: HttpClient, private notify: NotificationSocketService) { }

    async initialiser() {
        const ok = this.notify.connect()
        if (ok) {
            this.notify.on<{ conversationId: String }>("badge:maybe-update", async () => {
                await this.rafraichir()
            })
        }
        await this.rafraichir()
    }

    async rafraichir() {
        try {
            const data = await firstValueFrom(
                this.http.get<{ perConversation: UnreadMap; total: number }>(`${this.api}/me/unread`)
            )

            if (data) {
                if (data.perConversation) {
                    this.parConversation$.next(data.perConversation)
                }
                else {
                    this.parConversation$.next({})
                }

                if (typeof data.total === "number") {
                    this.total$.next(data.total)
                }
                else {
                    this.total$.next(0)
                }
            }
        }
        catch (err) {
            console.warn("unread : rafraichir échoué", err)
        }
    }

    async marquerCommeLu(conversationId: string) {
        try {
            await firstValueFrom(
                this.http.post(`${this.api}/conversation/${conversationId}/read`, {})
            )

            await this.rafraichir()
        }
        catch (err) {
            console.warn("unreads: marquerCommeLu échoué", err)
        }
    }

    totalObservable() {
        return this.total$.asObservable()
    }

    parConversationObservable() {
        return this.parConversation$.asObservable()
    }
}