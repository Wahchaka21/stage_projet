import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type RdvItem = {
    _id: string
    userId: string
    at: string
    description?: string
}

@Injectable({ providedIn: 'root' })
export class ListRdvService {
    private API = "http://localhost:3000"
    constructor(private http: HttpClient) { }

    async listForUser(userId: string): Promise<{ items: RdvItem[] }> {
        const url = `${this.API}/admin/rdv/user/${encodeURIComponent(userId)}`
        return await firstValueFrom(
            this.http.get<{ items: RdvItem[] }>(url, { withCredentials: true })
        )
    }
}