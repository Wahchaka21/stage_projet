import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000';

export interface RegisterPayload {
    email: string;
    password: string;
    nickname?: string;
    name?: string;
    lastname?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    constructor(private http: HttpClient) { }

    register(data: RegisterPayload): Observable<any> {
        return this.http.post(`${API_URL}/auth/register`, data);
    }
}