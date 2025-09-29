import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000'

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private http = inject(HttpClient)
  private route = inject(ActivatedRoute)

  me: any | null = null
  coach: any | null = null
  loading = true

  ngOnInit(): void {
    this.me = this.route.snapshot.data["me"] || null

    let maybeFetchMe: Promise<any>
    if (this.me) {
      maybeFetchMe = Promise.resolve(this.me)
    }
    else {
      maybeFetchMe = (this.http.get(`${API}/auth/me`, { withCredentials: true }) as any).toPromise()
    }

    // 3) si user => chercher le coach via /user/coach (cookies!)
    maybeFetchMe.then((u: any) => {
      if (u) this.me = u

      if (this.me && this.me.role === "user") {
        this.http.get(`${API}/user/coach`, { withCredentials: true }).subscribe({
          next: (res: any) => {
            this.coach = res?.data || null
            this.loading = false
          },
          error: () => {
            this.coach = null
            this.loading = false
          }
        })
      }
      else {
        this.loading = false
      }
    }).catch(() => { this.loading = false })
  }

  getPrenom(): string {
    if (!this.me) {
      return ""
    }
    let base = this.me.name || this.me.nickname
    if (!base && this.me.email) {
      base = String(this.me.email).split("@")[0]
    }
    if (!base) {
      return ""
    }
    return String(base).trim().split(/\s+/)[0] || ""
  }

  chatPeerId(): string | null {
    if (this.me && this.me.role === "user") {
      return this.coach?._id || null
    }
    return null
  }

  getChatLink(): any[] | null {
    const id = this.chatPeerId()
    return id ? ["/discussion", id] : null
  }

  isChatDisabled(): boolean {
    return !this.chatPeerId()
  }

  isAdmin(): boolean {
    return !!(this.me && this.me.role === "admin")
  }
}