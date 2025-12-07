import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Navbar } from '../../components/navbar/navbar';
import { Router } from '@angular/router';
import { DashboardSidebar } from "../../layout/dashboard-sidebar/dashboard-sidebar";
import { NgToastService } from 'ng-angular-popup';
import { ProjectsService } from '../../services/project.service';
import { NotifyService } from '../../services/notify.service';
import { ProjectModal } from "../../components/project-modal/project-modal";
import { Notify } from '../../models/models';


@Component({
  selector: 'app-notifies',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, Navbar, DashboardSidebar, ProjectModal],
  templateUrl: './notifies.html',
  styleUrls: ['./notifies.css'],
})
export class Notifies implements OnInit {
  private readonly router = inject(Router);
  private readonly toast = inject(NgToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly notifyService = inject(NotifyService);

  sidebarCollapsed = signal(false);
  projectModalOpen = signal(false);
  notifications = signal<Notify[]>([]);
  loadingNotifications = signal(true);

  ngOnInit(): void {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed.set(JSON.parse(saved));
    }

    this.loadNotifications();
  }

  private async loadNotifications(): Promise<void> {
    this.loadingNotifications.set(true);
    try {
      const notifies = await this.notifyService.getUserNotifications();
      console.log('Loaded notifications:', notifies);
      this.notifications.set(notifies);
    } catch (error) {
      console.error('Errore nel caricamento delle notifiche:', error);
      this.toast.danger('Errore', 'Impossibile caricare le notifiche.', 3000);
    } finally {
      this.loadingNotifications.set(false);
    }
  }

  async deleteNotification(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.notifyService.deleteNotification(id);
    if (success) {
      this.notifications.set(this.notifications().filter(n => n.id !== id));
      this.toast.success('Notifica eliminata', 'La notifica è stata rimossa.', 3000);
    } else {
      this.toast.danger('Errore', 'Impossibile eliminare la notifica.', 3000);
    }
  }

  async deleteAllNotifications(): Promise<void> {
    const success = await this.notifyService.deleteAllNotifications();
    if (success) {
      this.notifications.set([]);
      this.toast.success('Tutte le notifiche eliminate', 'Tutte le notifiche sono state rimosse.', 3000);
    } else {
      this.toast.danger('Errore', 'Impossibile eliminare le notifiche.', 3000);
    }
  }

  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch { }
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
