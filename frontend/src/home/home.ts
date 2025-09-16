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
    const maybeFetchMe = this.me ? Promise.resolve(this.me) : this.http.get(`${API}/auth/me`).toPromise();

    // 3) Une fois `me` connu, si c’est un client → chercher le coach
    Promise.resolve(maybeFetchMe).then((u: any) => {
      this.me = u || this.me;
      if (this.me?.role === 'user') {
        this.http.get(`${API}/admin/users`).subscribe({
          next: (res: any) => {
            const list = Array.isArray(res?.data) ? res.data : res;
            this.coach = Array.isArray(list) ? list.find((x: any) => x.role === 'admin') : null;
            this.loading = false;
          },
          error: () => { this.coach = null; this.loading = false; }
        });
      } else {
        // si c’est le coach connecté → pas besoin de chercher le coach
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
}
