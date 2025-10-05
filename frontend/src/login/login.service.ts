import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

const API_URL = 'http://localhost:3000'

type LoginPayload = {
    email: string
    password: string
    remember?: boolean
}

@Injectable({ providedIn: 'root' })
export class LoginService {
    accessToken = signal<string | null>(null)

    constructor(private http: HttpClient) {
        const storedLocal = this.readStorage(localStorage)
        if (storedLocal) {
            this.accessToken.set(storedLocal)
        }
        else {
            const storedSession = this.readStorage(sessionStorage)
            if (storedSession) {
                this.accessToken.set(storedSession)
            }
        }

    }

    private readStorage(storage: Storage): string | null {
        try {
            const value = storage.getItem("token")
            if (value && typeof value === "string" && value.trim().length > 0) {
                return value
            }
            else {
                return null
            }
        }
        catch {
            return null
        }
    }

    private persistToken(token: string | null, remember: boolean): void {
        try {
            localStorage.removeItem('token')
        }
        catch (err) {
            console.error(err)
        }

        try {
            sessionStorage.removeItem("token")
        }
        catch (err) {
            console.error(err)
        }

        if (!token) {
            return
        }

        if (remember) {
            try {
                localStorage.setItem("token", token)
            }
            catch (err) {
                console.error(err)
            }
        }
        else {
            try {
                sessionStorage.setItem("token", token)
            }
            catch (err) {
                console.error(err)
            }
        }
    }

    private wasRemembered(): boolean {
        const local = this.readStorage(localStorage)
        if (local) {
            return true
        }
        return false
    }

    login({ email, password, remember = false }: LoginPayload) {
        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/login`, { email, password, remember }, {
                withCredentials: true
            })
            .pipe(
                tap(res => {
                    this.accessToken.set(res.token)
                    this.persistToken(res.token, remember)
                })
            )
    }

    refresh() {
        const remember = this.wasRemembered()

        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .pipe(tap(res => {
                this.accessToken.set(res.token)
                this.persistToken(res.token, remember)
            }))
    }

    logout() {
        this.accessToken.set(null)
        this.persistToken(null, false)
        return this.http.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
    }
}
