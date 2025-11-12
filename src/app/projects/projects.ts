import { Component, OnInit, signal, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../services/project.service';
import { ProjectResponse } from '../models/models';
import { DashboardSidebar } from "../dashboard-sidebar/dashboard-sidebar";
import { LucideAngularModule, LogOut, UserCircle2 } from 'lucide-angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule,DashboardSidebar,LucideAngularModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  projects = signal<ProjectResponse[]>([]);
  loading = signal(true);

  // modale aperta dal bottone nella sidebar
  modalOpen = signal(false);
  modalType = signal<'project' | null>(null);

  constructor(
    private router: Router,
    private projectsService: ProjectsService,
    private auth: AuthService
  ) {}

  ngOnInit() { this.loadProjects(); }

  async loadProjects() {
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

  navigateToProject(id: string) {
    this.router.navigate(['/dashboard', id]);
  }

  // eventi dalla sidebar
  openModal(type: 'project'){ this.modalType.set(type); this.modalOpen.set(true); }
  closeModal(){ this.modalOpen.set(false); this.modalType.set(null); }

  onSaveProject(ev: Event){
    ev.preventDefault();
    // TODO: chiama POST createProject() sul service
    this.closeModal();
    this.loadProjects();
  }

  logout(){
    try { this.auth.logout?.(); } catch {}
  }
}
