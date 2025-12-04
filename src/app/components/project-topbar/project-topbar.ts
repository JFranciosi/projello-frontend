import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectResponse } from '../../models/models';
import { ProjectsService } from '../../services/project.service';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-project-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-topbar.html',
  styleUrls: ['./project-topbar.css'],
})
export class ProjectTopbar {
  @Input({ required: true }) project!: ProjectResponse;
  @Output() addCollaborator = new EventEmitter<string>();   // email
  @Output() removeCollaborator = new EventEmitter<string>(); // id

  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  addingCollaborator = signal(false);
  collabEmail = '';
  private toast = inject(NgToastService);

  startInlineAdd(): void {
    this.addingCollaborator.set(true);
  }

  cancelInlineAdd(): void {
    this.addingCollaborator.set(false);
    this.collabEmail = '';
  }

  submitInlineAdd(): void {
    const email = this.collabEmail.trim();
    if (!email) return;

    const collaborators: string[] = [email]
    const payload = {"title": null, "collaborators": collaborators};
    this.projectsService.updateProject(this.project._id, payload);
  }

  async onRemoveCollaborator(id: string): Promise<void> {
    const res = await this.projectsService.removeCollaborator(this.project._id, id);

    if (res){
      this.toast.success('Collaboratore rimosso con successo!', 'Operazione completata', 4000);
      window.location.reload();
    } else {
      this.toast.danger('Errore durante la rimozione del collaboratore.', 'Operazione fallita', 4000);
    }
  }

  goToProjects(): void {
    this.router.navigate(['/projects']);
  }
}
