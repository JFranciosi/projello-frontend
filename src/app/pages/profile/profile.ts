import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../services/auth.service';
import { CreateUserRequestPayload, ChangePasswordRequest } from '../../models/models';
import { Navbar } from "../../components/navbar/navbar";
import { ProjectModal } from "../../components/project-modal/project-modal";
import { ProjectsService } from '../../services/project.service';

type ProfileTab = 'personal' | 'security';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardSidebar,
    Navbar,
    ProjectModal
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class Profile {
  // Dati profilo
  profile = signal({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });

  // Dati cambio password
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  selectedTab = signal<ProfileTab>('personal');
  
  // Stato editing campi
  editing = {
    username: false,
    email: false,
    firstName: false,
    lastName: false,
  };

  sidebarCollapsed = signal(false);
  projectModalOpen = signal(false);

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
  private readonly projectsService = inject(ProjectsService);

  constructor() {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed.set(JSON.parse(saved));
    }
    this.loadProfileFromLocalStorage();
  }

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

  selectTab(tab: ProfileTab): void {
    this.selectedTab.set(tab);
    // Reset password fields when switching tabs
    if (tab === 'security') {
      this.resetPasswordFields();
    }
  }

  toggleFieldEdit(field: 'username' | 'email' | 'firstName' | 'lastName'): void {
    this.editing[field] = !this.editing[field];
  }

  logout(): void {
    this.auth.logout();
  }

  // --- LOGICA AGGIORNAMENTO DATI PERSONALI ---
  async onUpdateProfile(): Promise<void> {
    const current = this.profile();

    const payload: CreateUserRequestPayload = {
      username: current.username,
      email: current.email,
      firstName: current.firstName,
      lastName: current.lastName,
      // Non inviamo la password qui
      password: '' 
    };

    try {
      await this.auth.editUser(payload);

      // Aggiorna local storage
      localStorage.setItem('user', JSON.stringify(payload));
      
      // Blocca modifica
      this.editing.username = false;
      this.editing.email = false;
      this.editing.firstName = false;
      this.editing.lastName = false;

      this.toast.success('Successo', 'Profilo aggiornato correttamente.');
    } catch (error) {
      console.error(error);
      this.toast.danger('Errore', 'Impossibile aggiornare il profilo.');
    }
  }

  // --- LOGICA CAMBIO PASSWORD ---
  async onChangePassword(): Promise<void> {
    // Validazioni base
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.toast.warning('Attenzione', 'Compila tutti i campi della password.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toast.danger('Errore', 'Le nuove password non coincidono.');
      return;
    }

    const payload: ChangePasswordRequest = {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    };

    try {
      await this.auth.changePassword(payload);
      this.toast.success('Successo', 'Password aggiornata con successo.');
      this.resetPasswordFields();
    } catch (error: any) {
      console.error(error);
      // Gestione errore specifico dal backend
      if (error.status === 400 || error.status === 404) {
         this.toast.danger('Errore', error.error || 'La vecchia password non è corretta.');
      } else {
         this.toast.danger('Errore', 'Errore durante il cambio password.');
      }
    }
  }

  private resetPasswordFields() {
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  // --- SIDEBAR & MODAL ---
  onSidebarCollapse(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  openModal(_type: 'project'): void {
    this.projectModalOpen.set(true);
  }

  closeModal(): void {
    this.projectModalOpen.set(false);
  }

  async onCreateProject(data: { title: string; collaborators: string[] }): Promise<void> {
    const title = data.title.trim();
    if (!title) {
      this.toast.info('Info', 'Inserisci un titolo per il progetto.', 3000);
      return;
    }

    try {
      await this.projectsService.createProject({
        title,
        collaborators: []
      });
      this.toast.success('Successo', 'Progetto creato correttamente.', 3000);
      this.projectModalOpen.set(false);
    } catch (err) {
      console.error('Errore creazione progetto:', err);
      this.toast.danger('Errore', 'Creazione progetto fallita', 3000);
    }
  }
}