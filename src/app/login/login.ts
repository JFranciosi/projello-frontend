import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(NgToastService);

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.auth.login(this.form.value.email!, this.form.value.password!);

      // Toast di successo
      this.toast.success('Accesso effettuato con successo!', 'Benvenuto ', 4000);

      await this.router.navigate(['/projects']);
    } catch (err: any) {
      this.errorMessage = err?.error?.message || 'Credenziali non valide';

      // Toast di errore
      this.toast.danger('Credenziali non valide', 'Accesso fallito', 4000);
    } finally {
      this.loading = false;
    }
  }
}
