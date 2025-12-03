import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/project.service';
import { ProjectResponse } from '../../models/models';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectModal } from '../../components/project-modal/project-modal';
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
  projectModalOpen = signal(false);
  sidebarCollapsed = signal(false);

  constructor(
    private router: Router,
    private projectsService: ProjectsService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Carica lo stato della sidebar dalla localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed.set(JSON.parse(saved));
    }
    
    this.loadProjects();
  }

  onSidebarCollapse(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }

  private normalizeProject(project: any): ProjectResponse {
    let rawId: any;

    if (project?._id && typeof project._id === 'object' && '$oid' in project._id) {
      rawId = project._id.$oid;
    } else if (project?._id) {
      rawId = project._id;
    } else if (project?.id) {
      rawId = project.id;
    } else {
      rawId = '';
    }

    const id = typeof rawId === 'string' ? rawId.trim() : String(rawId ?? '').trim();
    console.log('🔧 normalizeProject – rawId:', rawId, '→ id:', id);

    return {
      ...project,
      _id: id,
    } as ProjectResponse;
  }

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.projectsService.getProjects();
      const normalized = (data || []).map((p: any) => this.normalizeProject(p));
      this.projects.set(normalized);
    } catch (e) {
      console.error('Errore nel caricamento dei progetti:', e);
      this.projects.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  navigateToProject(project: ProjectResponse): void {
    const id = project._id;
    if (!id) {
      console.error('ID progetto non valido per navigate:', project);
      this.toast.danger('Errore', 'ID progetto non valido.', 3000);
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
        await this.loadProjects();
      } else {
        this.toast.danger('Errore', 'Creazione progetto fallita.', 3000);
      }

      this.projectModalOpen.set(false);
    } catch (err) {
      console.error('Errore nella creazione del progetto:', err);
      this.toast.danger('Errore', 'Creazione progetto fallita.', 3000);
    }
  }

  async onDeleteProject(p: ProjectResponse, event: Event): Promise<void> {
    event.stopPropagation();

    const confirmed = confirm(`Sei sicuro di voler eliminare "${p.title}"?`);
    if (!confirmed) return;

    const projectId = p._id;

    if (!projectId || projectId.length !== 24) {
      this.toast.danger('Errore', 'ID progetto non valido per eliminazione.', 3000);
      return;
    }

    const ok = await this.projectsService.deleteProject(projectId);

    if (ok) {
      this.projects.update((list) =>
        list.filter((prj) => prj._id !== projectId)
      );
      this.toast.success('Progetto eliminato', 'Il progetto è stato eliminato correttamente.', 3000);
    } else {
      this.toast.danger('Errore', 'Eliminazione progetto fallita.', 3000);
    }
  }

  async onSaveProject(ev: Event): Promise<void> {
    ev.preventDefault();
    this.closeModal();
    await this.loadProjects();
  }

  logout(): void {
    try {
      this.auth.logout();
    } catch (err) {
      console.warn('Errore durante il logout:', err);
    } finally {
      this.router
        .navigateByUrl('/login')
        .catch(() => {
          window.location.href = '/login';
        });
    }
  }
}