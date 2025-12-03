import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectResponse } from '../../models/models';
import { ProjectsService } from '../../services/project.service';

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
  addingCollaborator = signal(false);
  collabEmail = '';

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

    this.addCollaborator.emit(email);
    this.collabEmail = '';
    this.addingCollaborator.set(false);
  }

  onRemoveCollaborator(id: string): void {
    this.projectsService.removeCollaborator(this.project._id, id)  ;
    console.log('Rimuovi collaboratore con ID:', id);
  }
}
