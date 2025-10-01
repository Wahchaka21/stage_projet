import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export type PlanClientItem = {
    _id: string
    userId: string
    contenu: string
}

@Injectable({
    providedIn: 'root'
})
export class ListPlanClientService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async listPlanClientForUser(userId: string): Promise<{ items: PlanClientItem[] }> {
        const url = `${this.api}/planClient/user/${encodeURIComponent(userId)}`
        return await firstValueFrom(
            this.http.get<{ items: PlanClientItem[] }>(url, { withCredentials: true })
        )
    }
}