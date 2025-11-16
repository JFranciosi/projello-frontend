import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';

import { ProjectsService } from '../services/project.service';
import { PhaseService } from '../services/phase.service';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';

import {
  ProjectResponse,
  Phase,
  Task,
  UserResponse
} from '../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DashboardSidebar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  // router/services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private toast = inject(NgToastService);

  // UI state
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  // Project (topbar)
  project = signal<ProjectResponse | null>(null);
  addingCollaborator = signal(false);
  collabEmail = '';

  // Board data
  phasesSig = signal<Phase[]>([]);
  tasksSig = signal<Task[]>([]);

  // Inline Phase
  addingPhase = signal(false);
  phaseDraft = signal<{ title: string; description?: string }>({
    title: '',
    description: ''
  });

  // Inline Task
  inlineTaskPhaseId = signal<string | null>(null);
  inlineDraft = signal<{
    title: string;
    description?: string;
    expiration_date?: string;
    priority: 'high' | 'medium' | 'low';
    assigneeId?: string;
  }>({
    title: '',
    description: '',
    expiration_date: '',
    priority: 'medium',
    assigneeId: ''
  });

  // Panel
  panelOpen = signal(false);
  selectedTask = signal<Task | null>(null);

  // Helpers
  phases = computed(() => this.phasesSig());
  tasksFor = (phaseId: string) =>
  this.tasksSig().filter((t) => t.phase_id === phaseId);
  currentProject = () => this.project();
  inlineTaskForPhase = () => this.inlineTaskPhaseId();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/projects');
      return;
    }
    this.loadProject(id);
  }

  // ===== LOAD via GET /project/:id (Bearer gestito nel service/interceptor) =====
  private async loadProject(id: string) {
    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      const res: any = await this.projectsService.getProjectById(id);
      // accetto sia wrapper {project, phases, tasks} sia oggetto progetto piatto
      const proj: ProjectResponse = res.project ?? res;
      const phases: Phase[] = res.phases ?? res.project?.phases ?? [];
      const tasks: Task[] = (res.tasks ?? res.project?.tasks ?? []).map(
        (t: any) => ({
          ...t,
          phase_id: t.phase_id ?? t.phaseId // normalizza naming
        })
      );

      this.project.set(proj);
      this.phasesSig.set(phases);
      this.tasksSig.set(tasks);
    } catch (err) {
      console.error('GET /project/:id error', err);
      this.errorMsg.set('Impossibile caricare il progetto.');
      this.toast.danger('Errore', 'Caricamento progetto fallito', 3000);
    } finally {
      this.loading.set(false);
    }
  }

  // ===== Collaboratori (per ora solo UI) =====

  /**
   * Chiamata dal bottone "+" nella topbar.
   * Si limita ad abilitare la piccola UI di input (associata a `addingCollaborator`),
   * resettando l'email ed evitando di procedere se il progetto non è caricato.
   */
  openAddCollaboratorModal(): void {
    const p = this.project();
    if (!p) {
      this.toast.danger(
        'Errore',
        'Seleziona o carica un progetto prima di aggiungere collaboratori.',
        2500
      );
      return;
    }

    this.collabEmail = '';
    this.addingCollaborator.set(true);
  }

  /**
   * Aggiunge un collaboratore *solo lato UI* partendo da `collabEmail`.
   * Puoi sostituire questa logica con una chiamata al backend quando avrai l’endpoint.
   */
  addCollaborator(): void {
    const email = (this.collabEmail || '').trim();
    if (!email) {
      this.toast.info('Info', 'Inserisci una email valida.', 2000);
      return;
    }

    const [local] = email.split('@');
    const pretty = (local || 'User').replace(/[._-]+/g, ' ').trim();
    const firstName = pretty.split(' ')[0] || 'User';
    const lastName = pretty.split(' ').slice(1).join(' ') || '';

    const p = this.project();
    if (!p) {
      this.toast.danger(
        'Errore',
        'Nessun progetto selezionato.',
        2500
      );
      return;
    }

    const newC: UserResponse = {
      id: 'tmp-' + uid(),
      email,
      username: pretty || 'user',
      firstName,
      lastName,
      notifies: []
    };

    this.project.set({
      ...p,
      collaborators: [...(p.collaborators || []), newC]
    });

    this.collabEmail = '';
    this.addingCollaborator.set(false);
    this.toast.success('Aggiunto', 'Collaboratore aggiunto (solo UI)', 2000);
  }

  removeCollaborator(id: string): void {
    const p = this.project();
    if (!p) return;

    this.project.set({
      ...p,
      collaborators: (p.collaborators || []).filter((c) => c.id !== id)
    });

    this.toast.info('Rimosso', 'Collaboratore rimosso (solo UI)', 2000);
  }

  // ===== Fasi =====
  startInlinePhase(): void {
    this.addingPhase.set(true);
    this.phaseDraft.set({ title: '', description: '' });
  }

  cancelInlinePhase(): void {
    this.addingPhase.set(false);
    this.phaseDraft.set({ title: '', description: '' });
  }

  saveInlinePhase(): void {
    const d = this.phaseDraft();
    const p = this.project();
    if (!p || !d.title?.trim()) return;

    // Includo project_id come da tuoi models
    this.phaseService
      .create(p._id, {
        title: d.title.trim(),
        description: (d.description || '').trim()
      } as any)
      .subscribe({
        next: (created: Phase) => {
          this.phasesSig.set([...this.phasesSig(), created]);
          this.addingPhase.set(false);
          this.startInlineTask(created._id);
          this.toast.success('OK', 'Fase creata', 3000);
        },
        error: (e) => {
          console.error('create phase error', e);
          this.toast.danger('Errore', 'Creazione fase fallita', 3000);
        }
      });
  }

  // ===== Task =====
  startInlineTask(phaseId: string): void {
    const creatorId = this.project()?.creator?.id;
    this.inlineTaskPhaseId.set(phaseId);
    this.inlineDraft.set({
      title: '',
      description: '',
      expiration_date: '',
      priority: 'medium',
      assigneeId: creatorId
    });
  }

  cancelInlineTask(): void {
    const creatorId = this.project()?.creator?.id;
    this.inlineTaskPhaseId.set(null);
    this.inlineDraft.set({
      title: '',
      description: '',
      expiration_date: '',
      priority: 'medium',
      assigneeId: creatorId
    });
  }

  setDraftPriority(level: 'high' | 'medium' | 'low'): void {
    this.inlineDraft.set({ ...this.inlineDraft(), priority: level });
  }

  saveInlineTask(): void {
    const phaseId = this.inlineTaskPhaseId();
    const d = this.inlineDraft();
    const p = this.project();
    if (!phaseId || !d.title?.trim() || !p) return;

    // Etichette assegnatari per UI ("Nome Cognome")
    const assigneesLabels: string[] = [];
    const assigneeId = d.assigneeId || p.creator.id;

    if (assigneeId === p.creator.id) {
      assigneesLabels.push(
        `${p.creator.firstName} ${p.creator.lastName}`.trim()
      );
    }
    const c = (p.collaborators || []).find((x) => x.id === assigneeId);
    if (c) {
      assigneesLabels.push(`${c.firstName} ${c.lastName}`.trim());
    }

    this.taskService
      .create({
        project_id: p._id,
        phase_id: phaseId,
        title: d.title.trim(),
        description: (d.description || '').trim(),
        expiration_date: d.expiration_date || undefined,
        priority: d.priority
      } as any)
      .subscribe({
        next: (created: Task) => {
          this.tasksSig.set([
            ...this.tasksSig(),
            { ...created, assignees: assigneesLabels }
          ]);
          this.cancelInlineTask();
          this.toast.success('OK', 'Task creato', 3000);
        },
        error: (e) => {
          console.error('create task error', e);
          this.toast.danger('Errore', 'Creazione task fallita', 3000);
        }
      });
  }

  // ===== Task panel =====
  openPanel(t: Task): void {
    this.selectedTask.set(t);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedTask.set(null);
  }

  deleteTask(t: Task): void {
    this.taskService.delete(t._id).subscribe({
      next: () => {
        this.tasksSig.set(this.tasksSig().filter((x) => x._id !== t._id));
        this.closePanel();
        this.toast.success('OK', 'Task eliminato', 2000);
      },
      error: (e) => {
        console.error('delete task error', e);
        this.toast.danger('Errore', 'Eliminazione task fallita', 3000);
      }
    });
  }

  markCompleted(t: Task): void {
    this.taskService.update(t._id, { status: 'done' } as any).subscribe({
      next: (upd) => {
        this.tasksSig.set(
          this.tasksSig().map((x) => (x._id === t._id ? { ...x, ...upd } : x))
        );
        this.closePanel();
        this.toast.success('OK', 'Task completato', 3000);
      },
      error: (e) => {
        console.error('complete task error', e);
        this.toast.danger('Errore', 'Aggiornamento task fallito', 3000);
      }
    });
  }

  // Stub attuale per altri modali (project/task)
  openModal(kind: 'project' | 'task'): void {
    this.toast.info('Info', `Apro modale: ${kind}`, 1500);
  }

  logout(): void {
    this.auth.logout?.();
  }
}

// helper id
function uid(): string {
  try {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return Array.from(a)
      .map((n) => n.toString(36))
      .join('');
  } catch {
    return (
      Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
  }
}