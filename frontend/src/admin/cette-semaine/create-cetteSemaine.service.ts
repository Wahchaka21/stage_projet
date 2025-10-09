import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AddCetteSemaineService {
    private apiUrl = "http://localhost:3000/admin/createCetteSemaine"

    constructor(private http: HttpClient) { }

    async addCetteSemaine(payload: { sharedWithClientId: string; contenu: string; title?: string }): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.post(this.apiUrl, payload, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err?.error.error?.message || err?.error?.message || "Erreur lors de l'envoie de \"cette semaine\""
        }
    }
}