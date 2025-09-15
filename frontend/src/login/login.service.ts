// login.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

const API_URL = 'http://localhost:3000';

type LoginPayload = {
    email: string;
    password: string;
    remember?: boolean;
};

@Injectable({ providedIn: 'root' })
export class LoginService {
    accessToken = signal<string | null>(null);

    constructor(private http: HttpClient) { }

    login({ email, password, remember = false }: LoginPayload) {
        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/login`, { email, password, remember }, {
                withCredentials: true
            })
            .pipe(tap(res => this.accessToken.set(res.token)));
    }

    refresh() {
        return this.http
            .post<{ token: string; user: any }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .pipe(tap(res => this.accessToken.set(res.token)));
    }

    logout() {
        this.accessToken.set(null);
        return this.http.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    }
}
