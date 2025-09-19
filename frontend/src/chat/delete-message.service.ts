import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeleteMessageService {
    private apiUrl = "http://localhost:3000/chat/delete"

    constructor(private http: HttpClient) { }

    async deleteMessage(messageId: String): Promise<any> {
        try {
            const url = `${this.apiUrl}/${messageId}`
            const response = await firstValueFrom(
                this.http.delete(url, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            let msg: string
            if (err && err.error && err.error.error && err.error.error.message) {
                msg = err.error.error.message
            }
            else if (err && err.error && err.error.message) {
                msg = err.error.message
            }
            else {
                msg = "Erreur lors de la suppression du message"
            }
            throw msg
        }
    }
}