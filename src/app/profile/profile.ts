import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../services/auth.service';
import { CreateUserRequestPayload } from '../models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DashboardSidebar],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class Profile {
  profile = signal({ name: '', email: '' });

  newPassword: string = '';
  confirmPassword: string = '';


  private readonly router = inject(Router);
  private readonly toast = inject(NgToastService);
  private readonly auth = inject(AuthService);

  /** Logout */
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch { }
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  /** SALVA PROFILO */
  async saveProfile(): Promise<void> {
    const payload: CreateUserRequestPayload = {
      username: this.profile().name,
      email: this.profile().email,
      password: this.newPassword || this.confirmPassword || '',
      firstName: '',
      lastName: ''
    };

    if (this.newPassword !== this.confirmPassword) {
      this.toast.danger('Errore', 'Le password non coincidono.');
      return;
    }


    try {
      await this.auth.editUser(payload);
      this.toast.success('Profilo aggiornato', 'I dati sono stati aggiornati correttamente.');
    } catch (err) {
      this.toast.danger('Errore', 'Impossibile aggiornare il profilo.');
    }
  }
}
