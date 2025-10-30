import { CommonModule } from "@angular/common"
import { HttpClient } from "@angular/common/http"
import { Component, OnInit } from "@angular/core"
import { RouterLink } from "@angular/router"
import { DomSanitizer, SafeHtml } from "@angular/platform-browser"
import { planClientService, planClient, cetteSemaineInt, PlanExercise } from "./plan-client.service"
import { firstValueFrom } from "rxjs"

const API = "http://localhost:3000"

@Component({
  selector: "app-cette-semaine",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./cette-semaine.html",
  styleUrls: ["./cette-semaine.css"]
})
export class CetteSemaine implements OnInit {
  loading = false
  error: string | null = null

  sessions: planClient[] = []
  semaines: cetteSemaineInt[] = []
  expandedId: string | null = null

  nombreNonLus = 0
  coach: any | null = null

  constructor(
    private planClientService: planClientService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadPlans()
    await this.loadCetteSemaines()
    await this.fetchCoach()
  }

  async loadPlans(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const list = await this.planClientService.listMyPlanClient()
      const sorted = [...list].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      this.sessions = sorted
    }
    catch (err: any) {
      this.error = err?.error?.message || "Impossible de recuperer vos seances"
    }
    finally {
      this.loading = false
    }
  }

  async loadCetteSemaines(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const list = await this.planClientService.listMyCetteSemaine()
      this.semaines = list
    }
    catch (err: any) {
      this.error = err?.error?.message || "Impossible de recuperer la semaine"
    }
    finally {
      this.loading = false
    }
  }

  toggle(id: string): void {
    if (this.expandedId === id) {
      this.expandedId = null
    }
    else {
      this.expandedId = id
    }
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || "")
  }

  planTitle(plan: planClient, index: number): string {
    if (plan.title && plan.title.trim()) {
      return plan.title.trim()
    }
    return `Seance ${index + 1}`
  }

  formatDate(value?: string): string {
    if (!value) {
      return ""
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ""
    }
    return date.toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  exerciseTitle(ex: PlanExercise, index: number): string {
    if (ex && ex.name && ex.name.trim()) {
      return `${index + 1}- ${ex.name.trim()}`
    }
    return `${index + 1}- Exercice`
  }

  formatSetsReps(ex: PlanExercise): string {
    const sets = typeof ex.sets === "number" && ex.sets > 0 ? ex.sets : 0
    const reps = typeof ex.reps === "number" && ex.reps > 0 ? ex.reps : 0
    if (sets > 0 && reps > 0) {
      return `${sets} series x ${reps} reps`
    }
    if (sets > 0) {
      return `${sets} series`
    }
    if (reps > 0) {
      return `${reps} reps`
    }
    return ""
  }

  formatSeconds(value: number | undefined | null): string {
    if (!value || value <= 0) {
      return "0s"
    }
    const total = Math.floor(value)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    if (mins > 0 && secs > 0) {
      return `${mins}m${secs}s`
    }
    if (mins > 0) {
      return `${mins}m`
    }
    return `${secs}s`
  }

  formatLoad(value: number | undefined | null): string {
    if (!value || value <= 0) {
      return "Charge libre"
    }
    return `${value} kg`
  }

  videoLabel(ex: PlanExercise): string {
    if (ex.video && ex.video.name && ex.video.name.trim()) {
      return ex.video.name.trim()
    }
    return "Voir la video"
  }

  hasVideo(ex: PlanExercise): boolean {
    return !!(ex.video && ex.video.url)
  }

  trackById(_: number, it: planClient): string {
    return it._id
  }

  getChatLink(): any[] | null {
    const id = this.chatPeerId()
    if (id) {
      return ["/discussion", id]
    }
    return null
  }

  private async fetchCoach(): Promise<void> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${API}/user/coach`, { withCredentials: true })
      )
      this.coach = res?.data || null
    }
    catch {
      this.coach = null
    }
  }

  private chatPeerId(): string | null {
    if (this.coach && this.coach._id) {
      return String(this.coach._id)
    }
    return null
  }
}
