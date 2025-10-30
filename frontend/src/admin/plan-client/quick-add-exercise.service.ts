import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

@Injectable({
    providedIn: "root"
})
export class QuickAddExerciseService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async add(planClientId: string): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/exercises/quick-add`
        return await firstValueFrom(
            this.http.post(url, {}, { withCredentials: true })
        )
    }
}
