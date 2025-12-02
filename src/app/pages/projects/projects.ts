import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/project.service';
import { ProjectResponse } from '../../models/models';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectModal } from "../../components/project-modal/project-modal";
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, DashboardSidebar, LucideAngularModule, Navbar, ProjectModal],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly toast = inject(NgToastService); 
  projects = signal<ProjectResponse[]>([]);
  loading = signal(true);
  modalOpen = signal(false);
  modalType = signal<'project' | null>(null);

  projectModalOpen = signal(false);

  constructor(
    private router: Router,
    private projectsService: ProjectsService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

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
      });

      if (created) {
        this.toast.success('Progetto creato', 'Il progetto è stato creato correttamente.', 3000);
      } else {
        this.toast.danger('Progetto creato', 'Il progetto è stato creato correttamente.', 3000);
      }

      this.projectModalOpen.set(false);
    } catch (err) {
      console.error('Errore nella creazione del progetto:', err);
      this.toast.danger('Errore', 'Creazione progetto fallita.', 3000);
    }
  }

  async onSaveProject(ev: Event): Promise<void> {
    ev.preventDefault();
    // TODO: chiamare projectsService.createProject() con i dati del form
    this.closeModal();
    await this.loadProjects();
  }

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
