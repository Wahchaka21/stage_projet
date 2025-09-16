// home.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type Tuile = {
  titre: string;
  sousTitre?: string;
  bg: string;
  icone: 'semaine' | 'plan' | 'respire' | 'mobilite' | 'perso' | 'biblio' | 'chat' | 'rdv';
  lien: string;
  accent?: boolean;
};

const API = 'http://localhost:3000';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  me: any | null = null;
  coach: any | null = null;
  loading = true;

  prenom = computed(() => {
    const u = this.me
    if (!u) return ''
    const raw = u.name || u.nickname || (u.email ? String(u.email).split('@')[0] : '')
    return String(raw).trim().split(/\s+/)[0] || ''
  })

  tuiles: Tuile[] = [
    { titre: 'Cette semaine', sousTitre: 'Objectifs & séances', bg: 'bg-[#eaf2fb]', icone: 'semaine', lien: '/semaine', accent: true },
    { titre: 'Plan alimentaire', bg: 'bg-[#d7f2b9]', icone: 'plan', lien: '/plan-alimentaire' },
    { titre: 'Respiration', sousTitre: 'Techniques & tempo', bg: 'bg-[#e9f5ff]', icone: 'respire', lien: '/respiration' },
    { titre: 'Mobilité', sousTitre: 'Routine quotidienne', bg: 'bg-[#ffe2c9]', icone: 'mobilite', lien: '/mobilite' },
    { titre: 'Espace perso', bg: 'bg-[#efe9ff]', icone: 'perso', lien: '/perso' },
    { titre: 'Bibliothèque', bg: 'bg-[#dbe8ff]', icone: 'biblio', lien: '/bibliotheque' },
  ];

  imageFor(kind: Tuile['icone']): string {
    switch (kind) {
      case 'semaine': return 'Cette semaine.svg'
      case 'plan': return 'Plan Alimentaire.svg'
      case 'respire': return 'Respiration.svg'
      case 'mobilite': return 'Routine Mobilité.svg'
      case 'perso': return 'espace perso.png'
      case 'biblio': return 'Bibliothèque.svg'
      default: return '/assets/img/tiles/fallback.svg'
    }
  }

  actionsRapides: Tuile[] = [
    { titre: 'Messages', bg: 'bg-white', icone: 'chat', lien: '/discussion', accent: true },
    { titre: 'Mes RDV', bg: 'bg-white', icone: 'rdv', lien: '/rdv' },
  ];

  ngOnInit(): void {
    // 1) Récupération via le Resolver
    this.me = this.route.snapshot.data['me'] || null;

    // 2) Fallback si jamais le resolver n’a rien mis (optionnel)
    let maybeFetchMe: Promise<any>;

    if (this.me) {
      // si on a déjà l'info de l'utilisateur en mémoire
      maybeFetchMe = Promise.resolve(this.me);
    } else {
      // sinon on va la chercher côté API
      maybeFetchMe = this.http.get(`${API}/auth/me`).toPromise();
    }

    // Ensuite, une fois qu’on a récupéré l’utilisateur
    maybeFetchMe.then((u: any) => {
      if (u) {
        this.me = u;
      }

      if (this.me && this.me.role === 'user') {
        // Si c'est un client, on va chercher le coach
        this.http.get(`${API}/admin/users`).subscribe({
          next: (res: any) => {
            let list;

            if (Array.isArray(res?.data)) {
              list = res.data;
            } else {
              list = res;
            }

            if (Array.isArray(list)) {
              this.coach = list.find((x: any) => x.role === 'admin');
            } else {
              this.coach = null;
            }

            this.loading = false;
          },
          error: () => {
            this.coach = null;
            this.loading = false;
          }
        });
      }
      else {

        this.loading = false;
      }
    }).catch(() => { this.loading = false; });
  }

  // Qui est en face dans le chat ?
  chatPeerId(): string | null {
    if (this.me?.role === 'user') {
      return this.coach?._id || null;
    }
    // plus tard: si c’est le coach, tu renverras l’ID du client sélectionné
    return null;
  }

  getActionLink(a: any): any[] | string | null {
    if (a.icone === 'chat') {
      if (this.chatPeerId()) {
        return ['/discussion', this.chatPeerId()]
      } else {
        return null
      }
    } else {
      return a.lien
    }
  }

  isDisabled(a: any): boolean {
    if (a.icone === 'chat' && !this.chatPeerId()) {
      return true
    }
    return false
  }
}
