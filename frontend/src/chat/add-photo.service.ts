import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AddPhotoService {
    private apiUrl = "http://localhost:3000/chat/upload"

    constructor(private http: HttpClient) { }

    async addPhoto(file: File): Promise<any> {
        try {
            const formData = new FormData()
            formData.append("photo", file)

            const response = await firstValueFrom(
                this.http.post(this.apiUrl, formData, { withCredentials: true })
            )

            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de lenvoi de la photo"
        }
    }
}