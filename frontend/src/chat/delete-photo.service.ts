import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeletePhotoService {
    private apiUrl = "http://localhost:3000/chat/deletePhoto"

    constructor(private http: HttpClient) { }

    async deletePhoto(photoId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.delete(`${this.apiUrl}/${photoId}`, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de la suppression de la photo"
        }
    }
}