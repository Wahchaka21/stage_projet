import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AttachVideoToPlanService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async attach(planClientId: string, videoId: string): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/attachVideo`
        const body = { videoId }
        return await firstValueFrom(
            this.http.post(url, body, { withCredentials: true })
        )
    }

    async detach(planClientId: string, videoId: string): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/video/${encodeURIComponent(videoId)}`
        return await firstValueFrom(
            this.http.delete(url, { withCredentials: true })
        )
    }
}