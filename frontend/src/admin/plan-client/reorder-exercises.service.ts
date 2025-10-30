import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

@Injectable({
    providedIn: "root"
})
export class ReorderExercisesService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async reorder(planClientId: string, orderedIds: string[]): Promise<any> {
        const url = `${this.api}/planClient/${encodeURIComponent(planClientId)}/exercises/reorder`
        const body = { orderedIds }
        return await firstValueFrom(
            this.http.patch(url, body, { withCredentials: true })
        )
    }
}
