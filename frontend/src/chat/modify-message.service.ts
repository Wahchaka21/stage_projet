import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class modifyMessageService {
    private apiUrl = "http://localhost:3000/chat/modify"

    constructor(private http: HttpClient) { }

    async modifyMessage(messageId: string, nouveauTexte: string | number): Promise<any> {
        try {
            const body = { nouveauTexte }
            const res = await firstValueFrom(
                this.http.put(`${this.apiUrl}/${encodeURIComponent(messageId)}`, body, {
                    withCredentials: true
                })
            )
            return res
        }
        catch (err: any) {
            const msg =
                err?.error?.error?.message ||
                err?.error?.message ||
                "Erreur lors de la modification du message"
            throw msg
        }
    }
}