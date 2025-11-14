import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../services/project.service';
import { ProjectResponse } from '../models/models';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, DashboardSidebar, LucideAngularModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  /** Lista progetti */
  projects = signal<ProjectResponse[]>([]);
  loading = signal(true);

  /** Gestione modale (creazione progetto) */
  modalOpen = signal(false);
  modalType = signal<'project' | null>(null);

  constructor(
    private router: Router,
    private projectsService: ProjectsService,
    private auth: AuthService
  ) {}

  /** Al caricamento, ottiene tutti i progetti dell’utente */
  ngOnInit(): void {
    this.loadProjects();
  }

  /** Chiama il backend per caricare i progetti */
  async loadProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.projectsService.getProjects();
      this.projects.set(data || []);
    } catch (e) {
      console.error('Errore nel caricamento dei progetti:', e);
      this.projects.set([]);
    } finally {
      this.loading.set(false);
    }
  }

navigateToProject(project: ProjectResponse): void {
  console.log(' project ricevuto:', project);

  const id =
    (project as any)?._id?.$oid ??
    (project as any)?._id ??
    (project as any)?.id ??
    '';

  console.log('🆔 id calcolato:', id);

  if (!id) {
    console.error(' ID progetto non valido:', project);
    return;
  }

  this.router.navigate(['/dashboard', id]);
}



  /** Apertura e chiusura modale */
  openModal(type: 'project'): void {
    this.modalType.set(type);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.modalType.set(null);
  }

  /** Evento di salvataggio del progetto (TODO: chiamare createProject) */
  async onSaveProject(ev: Event): Promise<void> {
    ev.preventDefault();
    // TODO: chiamare projectsService.createProject() con i dati del form
    this.closeModal();
    await this.loadProjects();
  }

  /** Logout utente */
  logout(): void {
    try {
      this.auth.logout();
    } catch (err) {
      console.warn('Errore durante il logout:', err);
    } finally {
      this.router.navigateByUrl('/login').catch(() => {
        window.location.href = '/login';
      });
    }
  }
}
