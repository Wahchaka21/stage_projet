import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeletePlanClientService {
    private apiUrl = "http://localhost:3000/admin/deletePlanClient"

    constructor(private http: HttpClient) { }

    async DeletePlanClient(planClientId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.delete(`${this.apiUrl}/${planClientId}`, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de la suppression du plan client"
        }
    }
}