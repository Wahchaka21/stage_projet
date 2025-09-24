import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AddVideoService {
    private apiUrl = "http://localhost:3000/chat/uploadVideo"

    constructor(private http: HttpClient) { }

    async addVideo(file: File): Promise<any> {
        try {
            const formData = new FormData()
            formData.append("video", file)

            const response = await firstValueFrom(
                this.http.post(this.apiUrl, formData, { withCredentials: true })
            )

            return response
        }
        catch (err: any) {
            throw err.error.details || "Erreur lors de lenvoi de la video"
        }
    }
}