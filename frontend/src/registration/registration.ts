import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { AuthService } from './auth.service';
import { Router, RouterLink } from '@angular/router';


function passwordRules(ctrl: AbstractControl): ValidationErrors | null {
  const v = String(ctrl.value ?? '');
  const errors: Record<string, boolean> = {};

  if (v.length < 8) errors['minLen'] = true;
  if (!/[a-z]/.test(v)) errors['lower'] = true;
  if (!/[A-Z]/.test(v)) errors['upper'] = true;
  if (!/\d/.test(v)) errors['digit'] = true;
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v)) errors['special'] = true;

  const common = ['123456', 'password', 'azerty', 'qwerty', 'admin', 'mot de passe', '111', '222', '333', 'abc'];
  const low = v.toLowerCase();
  if (common.some(p => low.includes(p))) errors['common'] = true;

  return Object.keys(errors).length ? errors : null;
}

function match(other: () => string) {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    return ctrl.value === other() ? null : { mismatch: true };
  };
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrls: ['./registration.css'],
})
export class Registration {
  waiting = signal(false);
  serverError = signal<string | null>(null);
  serverOk = signal<string | null>(null);

  form!: FormGroup

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordRules]],
      confirm: ['', [Validators.required]],
      nickname: [''],
      name: [''],
      lastname: [''],
    });

    this.form.get('confirm')?.addValidators(
      match(() => String(this.form.get('password')?.value ?? ''))
    );
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.serverError.set(null);
    this.serverOk.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, nickname, name, lastname } = this.form.value;

    this.waiting.set(true);
    this.auth.register({
      email: email!, password: password!,
      nickname: nickname || undefined,
      name: name || undefined,
      lastname: lastname || undefined
    })
      .subscribe({
        next: () => {
          this.serverOk.set('Compte créé ! Vous pouvez vous connecter.');
          this.form.reset();

          setTimeout(() => {
            this.router.navigateByUrl("/connexion")
          }, 1000)
        },
        error: (err) => {
          const msg = err?.error?.error || 'Erreur lors de la création du compte';
          this.serverError.set(msg);
        },
        complete: () => this.waiting.set(false),
      });
  }
}