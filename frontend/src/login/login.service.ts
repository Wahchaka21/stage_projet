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
    //acessToken est donc un signal, on l'utilise pour garder en mémoire le token du user, on l'utilise avec "this.accessToken()" et le mettre à jour avec "this.accessToken.set(...)"
    accessToken = signal<string | null>(null)

    constructor(private http: HttpClient) { }

    login({ email, password, remember = false }: LoginPayload) {
        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/login`, { email, password, remember }, {
                withCredentials: true
            })
            //enfaite sans le pipe au aurais directement la l'observable brut de la réponse http
            .pipe(
                //tap est un opérateur qui "espionne" la donnée qui passe dans le flux
                //quand une réponse arrive (res) il prend le res.token et le met dans le signal accessToken
                tap(res => this.accessToken.set(res.token))
            )
    }

    refresh() {
        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .pipe(tap(res => this.accessToken.set(res.token)))
    }

    logout() {
        //on vide le signal accessToken
        this.accessToken.set(null);
        return this.http.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
    }
}