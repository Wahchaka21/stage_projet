import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

type UpdatePlanAlimentairePayload = {
    title?: string
    contenu?: string
}

@Injectable({
    providedIn: 'root'
})
export class ModifiyPlanAlimentaireService {
    private apiUrl = "http://localhost:3000/admin/updatePlanAlimentaire"

    constructor(private http: HttpClient) { }

    async updatePlanAlimentaire(id: string, patch: UpdatePlanAlimentairePayload): Promise<any> {
        try {
            const url = `${this.apiUrl}/${id}`
            const response = await firstValueFrom(
                this.http.patch(url, patch, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err?.error.error?.message || err?.error?.message || "Erreur lors de la modification du \"plan alimentaire\""
        }
    }
}