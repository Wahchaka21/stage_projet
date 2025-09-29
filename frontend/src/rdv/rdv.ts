import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { rdvClientService, rdv } from './rdv-client.service';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const api = "http://localhost:3000"
@Component({
  selector: 'app-rdv',
  imports: [CommonModule, RouterLink],
  templateUrl: './rdv.html',
  styleUrl: './rdv.css'
})
export class Rdv implements OnInit {
  loading = false
  error: string | null = null

  upcoming: rdv[] = []
  past: rdv[] = []

  constructor(private rdvSvc: rdvClientService, private http: HttpClient) { }

  coach: any | null = null

  async ngOnInit() {
    await this.load()
    this.http.get(`${api}/user/coach`, { withCredentials: true }).subscribe({
      next: (res: any) => this.coach = res?.data || null,
      error: () => this.coach = null
    })
  }

  async load() {
    this.loading = true
    this.error = null
    try {
      const list = await this.rdvSvc.listMine()

      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const now = Date.now()
      this.upcoming = list.filter(r => new Date(r.date).getTime() >= now)
      this.past = list.filter(r => new Date(r.date).getTime() < now).reverse()
    }
    catch (e: any) {
      this.error = e?.error?.message || "Impossible de récupérer vos rendez-vous."
    }
    finally {
      this.loading = false
    }
  }

  formatFull(d: string) {
    const date = new Date(d)
    return date.toLocaleString(undefined, {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  }

  formatShort(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })
      + " · " +
      date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }

  isToday(d: string) {
    const x = new Date(d)
    const now = new Date()
    return x.getFullYear() === now.getFullYear()
      && x.getMonth() === now.getMonth()
      && x.getDate() === now.getDate()
  }

  private chatPeerId(): string | null {
    return this.coach?._id || null
  }

  getChatLink(): any[] | null {
    const id = this.chatPeerId()
    return id ? ["/discussion", id] : null
  }
}