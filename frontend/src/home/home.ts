import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Tuile = {
  titre: string;
  sousTitre?: string;
  bg: string;           // couleur de fond du visuel
  icone: 'semaine' | 'plan' | 'respire' | 'mobilite' | 'perso' | 'biblio' | 'chat' | 'rdv';
  lien: string;         // route à venir
  accent?: boolean;     // met un accent jaune si true
};

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  prenom = signal('Quentyn');

  // tuiles cliquables (tu peux changer les routes/l’ordonnancement)
  tuiles: Tuile[] = [
    { titre: 'Cette semaine', sousTitre: 'Objectifs & séances', bg: 'bg-[#eaf2fb]', icone: 'semaine', lien: '/semaine', accent: true },
    { titre: 'Plan alimentaire', bg: 'bg-[#d7f2b9]', icone: 'plan', lien: '/plan-alimentaire' },
    { titre: 'Respiration', sousTitre: 'Techniques & tempo', bg: 'bg-[#e9f5ff]', icone: 'respire', lien: '/respiration' },
    { titre: 'Mobilité', sousTitre: 'Routine quotidienne', bg: 'bg-[#ffe2c9]', icone: 'mobilite', lien: '/mobilite' },
    { titre: 'Espace perso', bg: 'bg-[#efe9ff]', icone: 'perso', lien: '/perso' },
    { titre: 'Bibliothèque', bg: 'bg-[#dbe8ff]', icone: 'biblio', lien: '/bibliotheque' },
  ];

  // accès rapides (chat / rdv) — en haut ET en barre fixe bas
  actionsRapides: Tuile[] = [
    { titre: 'Messages', bg: 'bg-white', icone: 'chat', lien: '/chat', accent: true },
    { titre: 'Mes RDV', bg: 'bg-white', icone: 'rdv', lien: '/rdv' },
  ];
}
