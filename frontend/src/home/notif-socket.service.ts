import { Injectable } from "@angular/core";
import { Socket, io } from "socket.io-client";
import { LoginService } from "../login/login.service";

@Injectable({
    providedIn: 'root'
})
export class NotificationSocketService {
    private socket: Socket | null = null

    constructor(private login: LoginService) { }

    connect(): boolean {
        const token = this.login.accessToken()
        if (!token) {
            console.warn("notify pas de token, pas de socket")
            return false
        }

        if (this.socket) {
            return true
        }

        this.socket = io("http://localhost:3000", {
            transports: ["websocket"],
            auth: { token }
        })

        this.socket.on("connect_error", (e) => {
            console.warn("notify connect_error", e?.message || e)
        })

        return true
    }

    on<T>(eventName: string, handler: (payload: T) => void) {
        if (!this.socket) {
            return
        }
        this.socket.on(eventName, handler)
    }

    off(eventName: string) {
        if (!this.socket) {
            return
        }
        this.socket.off(eventName)
    }
}