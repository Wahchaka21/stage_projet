import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

@Injectable({
    providedIn: "root"
})
export class RemoveExerciseService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async remove(planClientId: string, exerciseId: string): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/exercises/${encodeURIComponent(exerciseId)}`
        return await firstValueFrom(
            this.http.delete(url, { withCredentials: true })
        )
    }
}
