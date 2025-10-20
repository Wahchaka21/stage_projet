import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export type PlanAlimentaireId = {
    _id: string
    userId: string
    contenu: string
}

@Injectable({
    providedIn: 'root'
})
export class ListPlanAlimentaireService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async listPlanAlimentaireForUser(userId: string): Promise<{ items: PlanAlimentaireId[] }> {
        const url = `${this.api}/planAlimentaire/user/${encodeURIComponent(userId)}`
        return await firstValueFrom(
            this.http.get<{ items: PlanAlimentaireId[] }>(url, { withCredentials: true })
        )
    }
}