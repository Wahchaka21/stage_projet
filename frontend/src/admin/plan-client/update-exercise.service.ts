import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

@Injectable({
    providedIn: "root"
})
export class UpdateExerciseService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async update(planClientId: string, exerciseId: string, patch: any): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/exercises/${encodeURIComponent(exerciseId)}`
        return await firstValueFrom(
            this.http.patch(url, patch, { withCredentials: true })
        )
    }
}
