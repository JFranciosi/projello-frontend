import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../services/auth.service';
import { CreateUserRequestPayload } from '../../models/models';
import { Navbar } from "../../components/navbar/navbar";

type ProfileTab = 'personal' | 'security';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DashboardSidebar, Navbar],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class Profile {
  profile = signal({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  newPassword = '';
  confirmPassword = '';
  selectedTab = signal<ProfileTab>('personal');
  editing = {
    username: false,
    email: false,
    firstName: false,
    lastName: false,
  };

  /** iniziali avatar (es. "JF") */
  avatarInitials = computed(() => {
    const { firstName, lastName, username } = this.profile();
    if (firstName || lastName) {
      const fi = firstName?.trim()[0] ?? '';
      const li = lastName?.trim()[0] ?? '';
      const res = (fi + li).toUpperCase();
      if (res) return res;
    }
    if (username) {
      return username.trim().slice(0, 2).toUpperCase();
    }
    return 'PJ';
  });

  private readonly router = inject(Router);
  private readonly toast = inject(NgToastService);
  private readonly auth = inject(AuthService);

  constructor() {
    this.loadProfileFromLocalStorage();
  }

  /** Carica i dati dal localStorage */
  private loadProfileFromLocalStorage(): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.profile.set({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }

  /** Cambia tab (Dati personali / Sicurezza) */
  selectTab(tab: ProfileTab): void {
    this.selectedTab.set(tab);
  }

  /** Toggle matitina */
  toggleFieldEdit(field: 'username' | 'email' | 'firstName' | 'lastName'): void {
    this.editing[field] = !this.editing[field];
  }

  /** Logout */
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {
      // ignore
    }
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  /** SALVA PROFILO / PASSWORD */
  async saveProfile(): Promise<void> {
    // valida password solo se scrivi qualcosa
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.toast.danger('Errore', 'Le password non coincidono.');
        return;
      }
    }

    const current = this.profile();

    const payload: CreateUserRequestPayload = {
      username: current.username,
      email: current.email,
      password: this.newPassword || '',
      firstName: current.firstName,
      lastName: current.lastName,
    };

    try {
      await this.auth.editUser(payload);

      // aggiorna localStorage completo
      localStorage.setItem(
        'user',
        JSON.stringify({
          username: payload.username,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
        }),
      );

      // reset password dopo salvataggio
      this.newPassword = '';
      this.confirmPassword = '';

      this.toast.success('Profilo aggiornato', 'I dati sono stati aggiornati correttamente.');
    } catch {
      this.toast.danger('Errore', 'Impossibile aggiornare il profilo.');
    }
  }
}
