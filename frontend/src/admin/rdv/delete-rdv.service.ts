import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeleteRdvService {
    private apiUrl = "http://localhost:3000/admin/deleteRdv"

    constructor(private http: HttpClient) { }

    async deleteRdv(rdvId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.delete(`${this.apiUrl}/${rdvId}`, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de la suppression du rendez-vous"
        }
    }
}