import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

export type PlanClientVideo = {
    videoId: string
    url: string
    name: string
    size: number
    format: string
    duration: number
}

export type PlanClientExercise = {
    _id: string
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

export type PlanClientItem = {
    _id: string
    userId: string
    sharedWithClientId: string
    title: string
    contenu?: string
    createdAt?: string
    videos: PlanClientVideo[]
    exercises: PlanClientExercise[]
}

@Injectable({
    providedIn: "root"
})
export class ListPlanClientService {
    private api = "http://localhost:3000/admin"

    constructor(private http: HttpClient) { }

    async listPlanClientForUser(userId: string): Promise<{ items: PlanClientItem[] }> {
        const url = `${this.api}/planClient/user/${encodeURIComponent(userId)}`
        return await firstValueFrom(
            this.http.get<{ items: PlanClientItem[] }>(url, { withCredentials: true })
        )
    }
}
