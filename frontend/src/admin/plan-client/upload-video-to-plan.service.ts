import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class UploadVideoToPlanService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async upload(planClientId: string, file: File): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/attachVideo`
        const fd = new FormData()
        fd.append("video", file)

        return await firstValueFrom(
            this.http.post(url, fd, { withCredentials: true })
        )
    }
}