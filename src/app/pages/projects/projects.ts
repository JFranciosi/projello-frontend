import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/project.service';
import { ProjectResponse, UserResponse } from '../../models/models';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectModal } from '../../components/project-modal/project-modal';
import { ProjectSearchbar } from '../../components/project-searchbar/project-searchbar';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, DashboardSidebar, LucideAngularModule, Navbar, ProjectModal, ProjectSearchbar],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly toast = inject(NgToastService);

  allProjects = signal<ProjectResponse[]>([]);
  searchQuery = signal('');
  loading = signal(true);
  projectModalOpen = signal(false);
  sidebarCollapsed = signal(false);
  currentUser = signal<UserResponse | null>(null);

  avatarInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'PJ';
    
    if (user.firstName || user.lastName) {
      const fi = user.firstName?.trim()[0] ?? '';
      const li = user.lastName?.trim()[0] ?? '';
      const res = (fi + li).toUpperCase();
      if (res) return res;
    }
    if (user.username) {
      return user.username.trim().slice(0, 2).toUpperCase();
    }
    return 'PJ';
  });

  // Progetti filtrati in base alla ricerca
  projects = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.allProjects();
    }

    return this.allProjects().filter(project => {
      const titleMatch = project.title?.toLowerCase().includes(query);
      const descriptionMatch = project.description?.toLowerCase().includes(query);
      const creatorMatch = project.creator?.username?.toLowerCase().includes(query) ||
                         project.creator?.firstName?.toLowerCase().includes(query) ||
                         project.creator?.lastName?.toLowerCase().includes(query);
      
      return titleMatch || descriptionMatch || creatorMatch;
    });
  });

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
    
    // Carica i dati dell'utente corrente
    this.loadCurrentUser();
    
    this.loadProjects();
  }

  private loadCurrentUser(): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUser.set(user as UserResponse);
      } catch (e) {
        console.error('Errore nel caricamento dell\'utente:', e);
      }
    }
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
      this.allProjects.set(normalized);
    } catch (e) {
      console.error('Errore nel caricamento dei progetti:', e);
      this.allProjects.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
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
      this.allProjects.update((list) =>
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