import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

export type CreateExercisePayload = {
    name: string
    type: string
    sets: number
    reps: number
    workSec: number
    restSec: number
    loadKg: number
    rpe: number
    hrZone: string
    notes: string
    video: {
        url: string
        name: string
        duration: number
    }
}

@Injectable({
    providedIn: "root"
})
export class AddPlanClientService {
    private apiUrl = "http://localhost:3000/admin/createPlanClient"

    constructor(private http: HttpClient) { }

    async addPlanClient(payload: { sharedWithClientId: string; title?: string; exercises: CreateExercisePayload[] }): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.post(this.apiUrl, payload, { withCredentials: true })
            )
            return response
        }
        catch (err: any) {
            throw err?.error?.error?.message || err?.error?.message || "Erreur creation plan client"
        }
    }
}
