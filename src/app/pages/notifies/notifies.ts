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



//
  notifications = signal<Array<{ _id: string; type: 'informazione' | 'scadenza'; message: string; content: string }>>([
    { _id: 'n1', type: 'informazione', message: 'Benvenuto su Projello! 🎉', content: 'Benvenuto su Projello! 🎉' },
    { _id: 'n2', type: 'scadenza', message: 'Un collaboratore ha commentato il tuo task', content: 'Task: Implementare login' },
    { _id: 'n3', type: 'informazione', message: 'Nuovo progetto assegnato a te', content: 'Progetto: E-commerce' },
    { _id: 'n4', type: 'scadenza', message: 'Un task è stato completato', content: 'Scadenza: 15 dicembre' },
    { _id: 'n5', type: 'informazione', message: 'Sei stato aggiunto a un nuovo progetto', content: 'Progetto: Redesign' },
  ]);

  constructor() {}

  deleteNotification = (id: string, event: Event) => {
    event.stopPropagation();
    this.notifications.set(this.notifications().filter(n => n._id !== id));
    this.toast.success('Notifica eliminata', 'La notifica è stata rimossa.', 3000);
  };

  deleteAllNotifications = () => {
    this.notifications.set([]);
    this.toast.success('Tutte le notifiche eliminate', 'Tutte le notifiche sono state rimosse.', 3000);
  };


//



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
      console.error('Errore creazione progetto (notifies):', err);
      this.toast.danger('Errore', 'Creazione progetto fallita', 3000);
    }
  }
}
