import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export interface rdv {
    _id: string,
    userId: string,
    sharedWithClientId: string,
    date: string,
    description?: string,
    craetedAt?: string,
    updatedAt?: string
}

@Injectable({
    providedIn: 'root'
})
export class rdvClientService {
    private api = "http://localhost:3000/rdv/mine"

    constructor(private http: HttpClient) { }

    async listMine(): Promise<rdv[]> {
        const result = await firstValueFrom(
            this.http.get<rdv[]>(this.api, { withCredentials: true })
        )
        return Array.isArray(result) ? result : []
    }
}