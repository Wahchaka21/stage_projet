import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

type UpdateCetteSemainePayload = {
    title?: string
    contenu?: string
}

Injectable({
    providedIn: 'root'
})
export class ModifiyCetteSemaineService {
    private apiUrl = "http://localhost:3000/admin/updateCetteSemaine"

    constructor(private http: HttpClient) { }

    async updateCetteSemaine(id: string, patch: UpdateCetteSemainePayload): Promise<any> {
        try {
            const url = `${this.apiUrl}/${id}`
            const response = await firstValueFrom(
                this.http.patch(url, patch, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err?.error.error?.message || err?.error?.message || "Erreur lors de la modification de \"cette semaine\""
        }
    }
}