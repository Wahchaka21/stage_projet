import { Injectable } from "@angular/core"
import { HttpClient, HttpParams } from "@angular/common/http"
import { firstValueFrom } from "rxjs"

export interface PlanVideo {
    videoId: string
    url: string
    name: string
    duration: number
}

export interface planClient {
    _id: string
    userId: string
    sharedWithClientId: string
    contenu: string
    title?: string
    createdAt?: string
    videos?: PlanVideo[]
}

@Injectable({ providedIn: 'root' })
export class planClientService {
    private api = "http://localhost:3000/planClient/mine"

    constructor(private http: HttpClient) { }

    async listMyPlanClient(opts?: { from?: Date | string, to?: Date | string }): Promise<planClient[]> {
        let params = new HttpParams()
        if (opts && opts.from) {
            let f: string
            if (typeof opts.from === "string") {
                f = opts.from
            }
            else {
                f = opts.from.toISOString()
            }
            params = params.set("from", f)
        }
        if (opts && opts.to) {
            let t: string
            if (typeof opts.to === "string") {
                t = opts.to
            }
            else {
                t = opts.to.toISOString()
            }
            params = params.set("to", t)
        }
        const res = await firstValueFrom(
            this.http.get<{ items?: planClient[], data?: planClient[] }>(this.api, {
                withCredentials: true,
                params
            })
        )

        if (Array.isArray(res?.items)) {
            return res.items
        }
        if (Array.isArray(res?.data)) {
            return res.data
        }
        return []
    }
}
