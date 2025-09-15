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
  waiting = signal(false);
  serverError = signal<string | null>(null);
  serverOk = signal<string | null>(null);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: LoginService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false],
    });
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.serverError.set(null);
    this.serverOk.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.value;
    this.waiting.set(true);

    this.auth.login({ email, password }).subscribe({
      next: (res) => {
        this.serverOk.set('Connexion réussie !');

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('token', res.token);

        this.router.navigateByUrl('/accueil');
      },
      error: (err) => {
        const msg = err?.error?.error || 'Email ou mot de passe incorrect';
        this.serverError.set(msg);
      },
      complete: () => this.waiting.set(false),
    });
  }
}