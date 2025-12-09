import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectResponse, UserResponse } from '../../models/models';
import { ProjectsService } from '../../services/project.service';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-project-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-topbar.html',
  styleUrls: ['./project-topbar.css'],
})
export class ProjectTopbar implements OnInit {
  @Input({ required: true }) project!: ProjectResponse;
  @Output() filterChange = new EventEmitter<string>();

  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  private toast = inject(NgToastService);

  currentUser = signal<UserResponse | null>(null);

  ngOnInit(): void {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        this.currentUser.set(JSON.parse(u));
      } catch (e) { console.error(e); }
    }
  }

  addingCollaborator = signal(false);
  collabEmail = '';

  addingAssignees = signal(false);
  assigneesEmailName = '';

  isLoading = signal(false);

  isEditingTitle = signal(false);
  newTitle = '';

  startInlineAdd(): void {
    this.addingCollaborator.set(true);
  }

  cancelInlineAdd(): void {
    this.addingCollaborator.set(false);
    this.collabEmail = '';
  }

  async submitInlineAdd(): Promise<void> {

    // Permission check: Only creator can add collaborators
    const user = this.currentUser();
    if (user && this.project.creator && user.id !== this.project.creator.id) {
      this.toast.info('Info', 'Solo il creatore del progetto può aggiungere collaboratori.', 3000);
      return;
    }

    const email = this.collabEmail.trim();

    if (!email || !email.includes('@')) {
      this.toast.info('Attenzione', 'Inserisci un indirizzo email valido.', 3000);
      return;
    }

    const lowerEmail = email.toLowerCase();
    const creatorEmail = this.project.creator?.email?.toLowerCase() || '';
    const alreadyCollab = this.project.collaborators.some(c => (c.email || '').toLowerCase() === lowerEmail);

    if (lowerEmail === creatorEmail || alreadyCollab) {
      this.toast.info('Info', 'L\'utente è già nel progetto.', 3000);
      return;
    }

    this.isLoading.set(true);

    const payload = { "title": null, "collaborators": [email] };

    try {
      await this.projectsService.updateProject(this.project._id, payload);

      const refreshedProject = await this.projectsService.getProjectById(this.project._id);

      if (refreshedProject) {
        const tempProject = refreshedProject as any;

        if (!tempProject._id && tempProject.id) {
          tempProject._id = tempProject.id;
        }

        // Verify if the user was actually added
        const isAdded = (refreshedProject.collaborators || []).some(
          c => (c.email || '').toLowerCase() === email.toLowerCase()
        );

        if (!isAdded) {
          this.toast.danger('Errore', 'Utente non registrato.', 3000);
          this.isLoading.set(false);
          return;
        }

        this.project = refreshedProject;
        this.toast.success('Aggiunto!', `Collaboratore aggiunto: ${email}`, 3000);
        this.collabEmail = '';
        this.addingCollaborator.set(false);
      }

    } catch (error) {
      console.error(error);
      this.toast.danger('Errore', 'Utente non registrato.', 3000);
    }

    this.isLoading.set(false);
  }

  startEditingTitle(): void {
    this.newTitle = this.project.title;
    this.isEditingTitle.set(true);
  }

  cancelEditingTitle(): void {
    this.isEditingTitle.set(false);
    this.newTitle = '';
  }

  async saveTitle(): Promise<void> {
    if (!this.newTitle || !this.newTitle.trim()) {
      this.toast.warning('Attenzione', 'Il titolo non può essere vuoto', 3000);
      return;
    }

    if (this.newTitle === this.project.title) {
      this.cancelEditingTitle();
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.projectsService.updateProject(this.project._id, { title: this.newTitle });
      if (res) {
        this.project.title = this.newTitle;
        this.toast.success('Successo', 'Titolo aggiornato', 3000);
        this.isEditingTitle.set(false);
      } else {
        this.toast.danger('Errore', 'Impossibile aggiornare il titolo', 3000);
      }
    } catch (e) {
      console.error(e);
      this.toast.danger('Errore', 'Errore tecnico durante l\'aggiornamento', 3000);
    }
    this.isLoading.set(false);
  }

  async onRemoveCollaborator(userId: string): Promise<void> {
    if (this.isLoading()) return;

    // Permission check: Only creator can remove collaborators
    const user = this.currentUser();
    if (user && this.project.creator && user.id !== this.project.creator.id) {
      this.toast.info('Info', 'Solo il creatore può rimuovere i collaboratori.', 3000);
      return;
    }

    if (!confirm('Sei sicuro di voler rimuovere questo collaboratore?')) {
      return;
    }

    this.isLoading.set(true);

    try {
      const res = await this.projectsService.removeCollaborator(this.project._id, userId);

      if (res) {
        this.project.collaborators = this.project.collaborators.filter(c => c.id !== userId);
        this.toast.success('Rimosso', 'Collaboratore rimosso con successo!', 4000);
      } else {
        this.toast.danger('Errore', 'Impossibile rimuovere il collaboratore.', 4000);
      }
    } catch (e) {
      this.toast.danger('Errore', 'Si è verificato un errore tecnico.', 4000);
    }

    this.isLoading.set(false);
  }

  startInlineAddAssignees(): void {
    this.addingAssignees.set(true);
  }

  cancelInlineAddAssignees(): void {
    this.assigneesEmailName = '';
    this.filterChange.emit('');
    this.addingAssignees.set(false);
  }

  cancelBlurAddAssignees(): void {

  }

  onFilterChange(newValue: string): void {
    this.assigneesEmailName = newValue;
    this.filterChange.emit(newValue);
  }

  filterByAssignees(): void {
    this.filterChange.emit(this.assigneesEmailName);
  }

  goToProjects(): void {
    this.router.navigate(['/projects']);
  }
}
