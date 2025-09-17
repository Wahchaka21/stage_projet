// src/login/login.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from './login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  waiting = signal(false)
  serverError = signal<string | null>(null)
  serverOk = signal<string | null>(null)

  form!: FormGroup

  constructor(
    private fb: FormBuilder,
    private auth: LoginService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false],
    })
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    // reset des messages serveur à chaque tentative
    this.serverError.set(null)
    this.serverOk.set(null)

    // si le form est invalide -> on montre les erreurs et on stoppe
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    // extraire les valeurs et les lit
    const raw = this.form.value
    const email = raw.email as string
    const password = raw.password as string
    const remember = Boolean(raw.remember)

    // passe waiting à true
    this.waiting.set(true)

    // appel API
    this.auth.login({ email, password }).subscribe({
      next: (res) => {
        // message succès
        this.serverOk.set('Connexion réussie !')

        // choisir l'endroit où stocker le token
        let storage: Storage
        if (remember === true) {
          storage = localStorage
        }
        else {
          storage = sessionStorage
        }

        // stocker le token
        storage.setItem('token', res.token)

        this.waiting.set(false)

        // redirection
        this.router.navigateByUrl('/accueil')
      },
      error: (err) => {
        // construire un message d’erreur lisible
        let msg = 'Email ou mot de passe incorrect'
        if (err && err.error && err.error.error) {
          msg = err.error.error
        }
        this.serverError.set(msg)

        this.waiting.set(false)
      },
      complete: () => {
        // spinner OFF
        this.waiting.set(false)
      },
    })
  }
}