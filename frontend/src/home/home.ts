import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UnreadService } from './unread.service';
import { Subscription } from 'rxjs';

const API = "http://localhost:3000"

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  private http = inject(HttpClient)
  private route = inject(ActivatedRoute)
  private unreads = inject(UnreadService)
  nombreNonLus = 0
  private subNonLus: Subscription | null = null

  me: any | null = null
  coach: any | null = null
  loading = true

  ngOnInit(): void {
    this.unreads.initialiser()

    this.subNonLus = this.unreads.totalObservable().subscribe((valeur) => {
      if (typeof valeur === "number") {
        this.nombreNonLus = valeur
      }
      else {
        this.nombreNonLus = 0
      }
    })

    this.me = this.route.snapshot.data["me"] || null

    let maybeFetchMe: Promise<any>
    if (this.me) {
      maybeFetchMe = Promise.resolve(this.me)
    }
    else {
      maybeFetchMe = (this.http.get(`${API}/auth/me`, { withCredentials: true }) as any).toPromise()
    }

    maybeFetchMe.then((u: any) => {
      if (u) {
        this.me = u
      }

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

  ngOnDestroy(): void {
    if (this.subNonLus) {
      this.subNonLus.unsubscribe()
    }
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
    if (id) {
      return ["/discussion", id]
    }
    return null
  }

  isChatDisabled(): boolean {
    return !this.chatPeerId()
  }

  isAdmin(): boolean {
    return !!(this.me && this.me.role === "admin")
  }
}