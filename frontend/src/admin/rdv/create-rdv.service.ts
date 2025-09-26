import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AddRdvService {
    private apiUrl = "http://localhost:3000/admin/createRdv"

    constructor(private http: HttpClient) { }

    async addRdv(rdvData: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.post(this.apiUrl, rdvData, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err?.error.error?.message || err?.error?.message || "Erreur lors de l'envoie du rendez-vous"
        }
    }
}