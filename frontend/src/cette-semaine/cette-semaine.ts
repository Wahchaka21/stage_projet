import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { planClientService, planClient } from './plan-client.service'
import { firstValueFrom } from 'rxjs'

const API = "http://localhost:3000"

@Component({
  selector: 'app-cette-semaine',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cette-semaine.html',
  styleUrls: ['./cette-semaine.css']
})
export class CetteSemaine implements OnInit {
  loading = false
  error: string | null = null

  sessions: planClient[] = []
  expandedId: string | null = null

  nombreNonLus = 0
  coach: any | null = null

  getChatLink(): any[] | null {
    const id = this.chatPeerId()
    if (id) {
      return ["/discussion", id]
    }
    else {
      return null
    }
  }

  constructor(
    private planClientService: planClientService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) { }

  async ngOnInit() {
    await this.loadThisWeek()
    await this.fetchCoach()
  }

  private startOfWeek(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay() || 7
    if (day !== 1) {
      date.setDate(date.getDate() - (day - 1))
    }
    date.setHours(0, 0, 0, 0)
    return date
  }

  private endOfWeek(d: Date): Date {
    const start = this.startOfWeek(d)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setMilliseconds(-1)
    return end
  }

  async loadThisWeek() {
    this.loading = true
    this.error = null
    try {
      const now = new Date()
      const from = this.startOfWeek(now)
      const to = this.endOfWeek(now)
      const list = await this.planClientService.listMyPlanClient({ from, to })
      const sorted = [...list].sort((a, b) => {
        let ta = 0
        if (a.createdAt) {
          ta = new Date(a.createdAt).getTime()
        }

        let tb = 0
        if (b.createdAt) {
          tb = new Date(b.createdAt).getTime()
        }

        return ta - tb
      })
      this.sessions = sorted
    }
    catch (err: any) {
      this.error = err?.error?.message || "Impossible de récupérer vos séances"
    }
    finally {
      this.loading = false
    }
  }

  toggle(id: string) {
    if (this.expandedId === id) {
      this.expandedId = null
    }
    else {
      this.expandedId = id
    }
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
    else {
      return null
    }
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || "")
  }

  formatDate(iso?: string): string {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleString("fr-FR", {
      weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    })
  }

  trackById(_: number, it: planClient) {
    return it._id
  }
}
