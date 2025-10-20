import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeletePlanAlimentaireService {
    private apiUrl = "http://localhost:3000/admin/deletePlanAlimentaire"

    constructor(private http: HttpClient) { }

    async DeletePlanAlimentaire(planAlimentaireId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.delete(`${this.apiUrl}/${planAlimentaireId}`, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de la suppression d \"plan alimentaire\"."
        }
    }
}