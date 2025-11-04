import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CreateUserRequestPayload } from '../services/auth.service';

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
      await this.router.navigateByUrl('/login');
    } catch (e: any) {
      this.errorMessage = e?.error ?? 'Registrazione non riuscita.';
    } finally {
      this.loading = false;
    }
  }
}
