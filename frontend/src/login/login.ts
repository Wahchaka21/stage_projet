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
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required]],
      remember: [false],
    })
  }

  get f() { return this.form.controls }

  onSubmit(): void {
    this.serverError.set(null)
    this.serverOk.set(null)

    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    const raw = this.form.value
    const email = raw.email as string
    const password = raw.password as string
    const remember = Boolean(raw.remember)

    this.waiting.set(true)

    this.auth.login({ email, password, remember }).subscribe({
      next: () => {
        this.serverOk.set("Connexion reussie !")
        this.waiting.set(false)
        this.router.navigateByUrl("/accueil")
      },
      error: (err) => {
        let msg = "Email ou mot de passe incorrect"
        if (err && err.error && err.error.error) {
          msg = err.error.error
        }
        this.serverError.set(msg)
        this.waiting.set(false)
      },
      complete: () => {
        this.waiting.set(false)
      },
    })
  }
}
