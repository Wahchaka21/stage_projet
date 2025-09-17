import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { AuthService } from './auth.service';
import { Router, RouterLink } from '@angular/router';

/** Validateur front pour le mot de passe (retourne un objet d’erreurs lisible par l’UI) */
function passwordRules(ctrl: AbstractControl): ValidationErrors | null {
  const value = String(ctrl.value ?? '')
  const errors: Record<string, boolean> = {}

  //si le mot de passe est plus petit que 8
  if (value.length < 8) {
    errors['minLen'] = true
  }

  //si il y a une minuscule
  if (!/[a-z]/.test(value)) {
    errors['lower'] = true
  }

  //si il y a une majuscule
  if (!/[A-Z]/.test(value)) {
    errors['upper'] = true
  }

  //si il y a un chiffre
  if (!/\d/.test(value)) {
    errors['digit'] = true
  }

  //si il y a un caractère spécial
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
    errors['special'] = true
  }

  //ici c'est si le mot de passe n'est que ce qui est énumérer dans la const common, alors le mot de passe est faux car trop commun
  const common = ['123456', 'password', 'azerty', 'qwerty', 'admin', 'mot de passe', '111', '123', '222', '333', 'abc']
  const low = value.toLowerCase()
  for (const pattern of common) {
    if (low.includes(pattern)) {
      errors['common'] = true
      break
    }
  }

  if (Object.keys(errors).length > 0) {
    return errors // au moins une règle KO
  }
  else {
    return null  // toutes les règles OK
  }
}

/** Validateur pour confirmer le mot de passe, la fonction getOther() sait récupérer la valeur du champ à comparer*/
function match(getOther: () => string) {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    //appelle la fonction pour avoir la valeur du mot de passe actuel (celui saisi au-dessus)
    const other = getOther()
    //si les deux mdp match, pas d'erreur donc null
    if (ctrl.value === other) {
      return null
    }
    else {
      return { mismatch: true }
    }
  }
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrls: ['./registration.css'],
})
export class Registration {
  // états simples, les signal() c'est la "récativité" façon angular
  waiting = signal(false)
  serverError = signal<string | null>(null)
  serverOk = signal<string | null>(null)

  //ça c'est pour dire à angular je te promet (!) que "form" sera assigné avant utilisation
  form!: FormGroup

  constructor(
    //et c'est ici que form est assigné
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // la construction du formuulaire
    //on créer un FormGroup avec des FormControl à l'intérieur
    this.form = this.fb.group({
      //on init "" et deux validateurs -> requis et le format email
      email: ["", [Validators.required, Validators.email]],
      //pareil ici -> requis et on utilise la fonction passwordRules créer plus haut
      password: ["", [Validators.required, passwordRules]],
      //la confirmation mdp requis
      confirm: ["", [Validators.required]],
      nickname: [""],
      name: [""],
      lastname: [""],
    })

    // Règle "confirm = password"
    //ici ces deux const servent à récupéré le mdp et la confirmation du mdp
    const passwordCtrl = this.form.get('password')
    const confirmCtrl = this.form.get('confirm')

    if (confirmCtrl) {
      //on ajout un validateur au champ confirm
      confirmCtrl.addValidators(
        //on passe une fonction qui renvoie la valuer courante du mdp
        match(() => String(
          // les ?? '' c'est si valeur null/undefined, on compare à une chaîne vide (ça évite les err)
          passwordCtrl?.value ?? ''
        ))
      )
    }
  }

  /** Raccourci pratique pour le template c'est juste pour dire d'écrire "this.f['email']" au lieu de this.form.controls['email'] */
  get f() { return this.form.controls }

  /** Texte d’erreur pour le champ email (sans opérateurs ternaires) */
  emailErrorText(): string | null {
    //on lit le controle email
    const ctrl = this.f['email']
    //si le champ n'a pas encore été touché, on affiche rien
    if (!ctrl.touched) {
      return null
    }
    //sinon on regarde quelles erreurs
    if (ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'Email requis'
      }
      else if (ctrl.errors['email']) {
        return 'Email invalide'
      }
    }
    return null
  }

  /** Indique si une règle password donnée est OK (true = verte, false = grise/rouge) */
  isPasswordRuleOk(ruleKey: 'minLen' | 'lower' | 'upper' | 'digit' | 'special'): boolean {
    //pareil ici on lit le mbp
    const ctrl = this.f['password']
    const touched = ctrl?.touched
    if (!touched) {
      return false // avant touche, on ne met pas en vert
    }
    const errs = ctrl?.errors
    if (!errs) {
      return true  // aucune erreur => toutes les règles OK
    }
    // règle spécifique absente => OK, règle présente => KO
    return !Boolean(errs[ruleKey])
  }

  /** Indique si la règle "common" est déclenchée */
  hasCommonPasswordPattern(): boolean {
    const ctrl = this.f['password']
    return Boolean(ctrl?.touched && ctrl?.errors?.['common'])
  }

  /** Bouton envoyer désactivé ? */
  isSubmitDisabled(): boolean {
    if (this.waiting()) {
      return true
    }
    if (this.form.invalid) {
      return true
    }
    return false
  }

  onSubmit(): void {
    // reset messages serveur
    this.serverError.set(null)
    this.serverOk.set(null)

    // validation front
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    // préparer la payload
    const raw = this.form.value
    const payload = {
      email: raw.email as string,
      password: raw.password as string,
      nickname: raw.nickname || undefined,
      name: raw.name || undefined,
      lastname: raw.lastname || undefined,
    }

    // appel API
    this.waiting.set(true)

    this.auth.register(payload).subscribe({
      next: () => {
        this.serverOk.set('Compte créé ! Vous pouvez vous connecter.')
        this.form.reset()

        // petite redirection après succès
        setTimeout(() => {
          this.router.navigateByUrl('/connexion')
        }, 1000)
      },
      error: (err) => {
        let msg = 'Erreur lors de la création du compte'
        if (err && err.error && err.error.error) {
          msg = err.error.error;
        }
        this.serverError.set(msg)
      },
      complete: () => {
        this.waiting.set(false)
      },
    })
  }
}