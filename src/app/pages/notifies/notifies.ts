import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Navbar } from '../../components/navbar/navbar';
import { Router } from '@angular/router';
import { DashboardSidebar } from "../../layout/dashboard-sidebar/dashboard-sidebar";
import { NgToastService } from 'ng-angular-popup';
import { ProjectsService } from '../../services/project.service';
import { ProjectModal } from "../../components/project-modal/project-modal";


@Component({
  selector: 'app-notifies',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, Navbar, DashboardSidebar, ProjectModal],
  templateUrl: './notifies.html',
  styleUrls: ['./notifies.css'],
})
export class Notifies {
  private readonly router = inject(Router);
  private readonly toast = inject(NgToastService);
  private readonly projectsService = inject(ProjectsService);

  sidebarCollapsed = signal(false);
  projectModalOpen = signal(false);

  // Dati e API per la lista notifiche usati nel template
  notifications = signal<Array<{ _id: string; message: string; timestamp: string; read: boolean }>>([
    { _id: 'n1', message: 'Benvenuto su Projello! 🎉', timestamp: new Date().toISOString(), read: false },
  ]);

  markAsRead = (id: string) => {
    this.notifications.set(this.notifications().map(n => n._id === id ? { ...n, read: true } : n));
  };



   logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {}
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

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
      const created = await this.projectsService.createProject({
        title,
        collaborators: []
      });

      if (created) {
        this.toast.success('Progetto creato', 'Il progetto è stato creato correttamente.', 3000);
      } else {
        this.toast.success('Progetto creato', 'Il progetto è stato creato correttamente.', 3000);
      }

      this.projectModalOpen.set(false);

    } catch (err) {
      console.error('Errore creazione progetto (profile):', err);
      this.toast.danger('Errore', 'Creazione progetto fallita', 3000);
    }
  }







  
}
