import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export type CetteSemaineItem = {
    _id: string
    userId: string
    contenu: string
}

@Injectable({
    providedIn: 'root'
})
export class ListCetteSemaineService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async listCetteSemaineForUser(userId: string): Promise<{ items: CetteSemaineItem[] }> {
        const url = `${this.api}/cetteSemaine/user/${encodeURIComponent(userId)}`
        return await firstValueFrom(
            this.http.get<{ items: CetteSemaineItem[] }>(url, { withCredentials: true })
        )
    }
}