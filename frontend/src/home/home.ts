// src/home/home.ts
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
    //Essayer d'utiliser la donnée du user
    this.me = this.route.snapshot.data['me'] || null

    //Si pas de me, on va le chercher côté API
    let maybeFetchMe: Promise<any>
    if (this.me) {
      maybeFetchMe = Promise.resolve(this.me)
    }
    else {
      maybeFetchMe = (this.http.get(`${API}/auth/me`) as any).toPromise()
    }

    //Quand on connaît l’utilisateur, si c’est un client -> chercher le coach
    maybeFetchMe.then((u: any) => {
      if (u) {
        this.me = u
      }

      if (this.me && this.me.role === 'user') {
        this.http.get(`${API}/admin/users`).subscribe({
          next: (res: any) => {

            let list

            if (Array.isArray(res?.data)) {
              list = res.data
            }
            else {
              list = res
            }

            if (Array.isArray(list)) {
              this.coach = list.find((x: any) => x.role === 'admin')
            }
            else {
              this.coach = null
            }

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

  /** Prénom pour "Salut {{ ... }}" */
  getPrenom(): string {
    if (!this.me) {
      return ""
    }
    let base = this.me.name || this.me.nickname
    if (!base && this.me.email) {
      const beforeAt = String(this.me.email).split('@')[0]
      base = beforeAt
    }
    if (!base) return ""
    const firstWord = String(base).trim().split(/\s+/)[0]
    return firstWord || ""
  }

  /** Qui est en face dans le chat ? (pour le client -> le coach) */
  chatPeerId(): string | null {
    if (this.me && this.me.role === "user") {
      if (this.coach && this.coach._id) {
        return this.coach._id
      }
      else {
        return null
      }
    } else {
      return null
    }
  }

  /** Lien de discussion (null = désactivé dans le template) */
  getChatLink(): any[] | null {
    const pid = this.chatPeerId()
    if (pid) {
      return ['/discussion', pid]
    }
    else {
      return null
    }
  }

  /** Le bouton "Messages" doit-il être désactivé ? */
  isChatDisabled(): boolean {
    const pid = this.chatPeerId()
    if (pid) {
      return false
    }
    return true
  }

  isAdmin(): boolean {
    if (this.me && this.me.role === 'admin') {
      return true
    }
    return false
  }
}
