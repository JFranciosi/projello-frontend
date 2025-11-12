import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CreateUserRequestPayload } from '../models/models';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(NgToastService); 

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName:  ['', [Validators.required, Validators.minLength(2)]],
    username:  ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordsMatch() });

  get f() { return this.form.controls; }

  private passwordsMatch(): ValidatorFn {
    return (g: AbstractControl): ValidationErrors | null => {
      const p  = g.get('password')?.value;
      const cp = g.get('confirmPassword')?.value;
      return p && cp && p !== cp ? { passwordMismatch: true } : null;
    };
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const v = this.form.value as any;
    const payload: CreateUserRequestPayload = {
      firstName: v.firstName!,
      lastName:  v.lastName!,
      username:  v.username!,
      email:     v.email!,
      password:  v.password!,
    };

    try {
      await this.auth.register(payload);

      // Mostra toast di successo
      this.toast.success('Registrazione completata con successo!', 'Benvenuto 👋', 4000);

      await this.router.navigateByUrl('/login');
    } catch (e: any) {
      this.errorMessage = e?.error ?? 'Registrazione non riuscita.';

      // Mostra toast di errore
      this.toast.danger('Errore durante la registrazione', 'Riprova più tardi', 4000);
    } finally {
      this.loading = false;
    }
  }
}
