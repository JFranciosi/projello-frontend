import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgToastService } from 'ng-angular-popup';
import { DashboardSidebar } from '../../layout/dashboard-sidebar/dashboard-sidebar';
import { firstValueFrom } from 'rxjs';
import { ProjectsService } from '../../services/project.service';
import { PhaseService } from '../../services/phase.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

import {
  ProjectResponse,
  Phase,
  Task,
  UserResponse,
  CreateTaskRequest
} from '../../models/models';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectTopbar } from '../../components/project-topbar/project-topbar';
import { ProjectModal } from '../../components/project-modal/project-modal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardSidebar,
    Navbar,
    ProjectTopbar,
    ProjectModal
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private toast = inject(NgToastService);

  projectModalOpen = signal(false);
  sidebarCollapsed = false;

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  project = signal<ProjectResponse | null>(null);
  addingCollaborator = signal(false);
  collabEmail = '';
  phasesSig = signal<Phase[]>([]);
  tasksSig = signal<Task[]>([]);
  addingPhase = signal(false);
  phaseDraft = signal<{ title: string; description?: string }>({
    title: '',
    description: ''
  });
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
  panelOpen = signal(false);
  selectedTask = signal<Task | null>(null);

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

  private async loadProject(id: string) {
    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      const rawProj = await this.projectsService.getProjectById(id);
      if (!rawProj) throw new Error('Project not found');

      const proj = this.normalizeProject(rawProj);
      this.project.set(proj);

      const phases = await firstValueFrom(
        this.phaseService.getByProject(proj._id as string)
      );

      const normalizedPhases = phases.map((p) =>
        this.normalizePhase(p, proj._id as string)
      );

      this.phasesSig.set(normalizedPhases);
    } catch (err) {
      console.error('loadProject error:', err);
      this.toast.danger('Errore', 'Caricamento progetto fallito', 3000);
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeProject(raw: any): ProjectResponse {
    const id = raw._id ?? raw.id;
    const creator: UserResponse = raw.creator as UserResponse;
    const collaborators: UserResponse[] =
      (raw.collaborators ?? []) as UserResponse[];

    return {
      ...(raw as ProjectResponse),
      _id: id,
      title: raw.title,
      description: raw.description,
      creator,
      collaborators,
      createdAt: raw.createdAt ?? raw.created_at,
      updatedAt: raw.updatedAt ?? raw.updated_at
    };
  }

  private normalizePhase(raw: any, projectId: string): Phase {
    const id = raw._id ?? raw.id;
    const projId = raw.project_id ?? raw.projectId ?? projectId;

    return {
      _id: String(id),
      project_id: String(projId),
      title: raw.title ?? '',
      description: raw.description,
      is_done: raw.is_done ?? raw.isDone,
      wip_limit: raw.wip_limit ?? raw.wipLimit,
      createdAt: raw.createdAt ?? raw.created_at,
      updatedAt: raw.updatedAt ?? raw.updated_at
    };
  }

  private normalizeTask(raw: any, projectId: string): Task {
    const id = raw._id ?? raw.id;
    const phaseId =
      raw.phase_id ??
      raw.phaseId ??
      raw['phase-id'] ??
      raw.phase?.id ??
      raw.phase?._id;

    const expiration =
      raw.expiration_date ??
      raw.expirationDate ??
      raw['expiration-date'] ??
      undefined;

    let assignees: any = raw.assignees;
    if (Array.isArray(assignees)) {
      if (assignees.length && typeof assignees[0] === 'object') {
        assignees = assignees.map((a: any) => a.id ?? JSON.stringify(a));
      }
    }

    return {
      _id: String(id),
      project_id: String(raw.project_id ?? raw.projectId ?? projectId),
      phase_id: String(phaseId),
      title: raw.title ?? '',
      description: raw.description,
      expiration_date: expiration,
      priority: raw.priority,
      attachments: raw.attachments,
      assignees,
      createdAt: raw.createdAt ?? raw.created_at,
      updatedAt: raw.updatedAt ?? raw.updated_at
    };
  }

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
      this.toast.danger('Errore', 'Nessun progetto selezionato.', 2500);
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

    this.phaseService
      .createPhase({ title: d.title.trim(), projectId: p._id as string })
      .subscribe({
        next: (created) => {
          const normalized = this.normalizePhase(created, p._id as string);
          this.phasesSig.set([...this.phasesSig(), normalized]);
          this.toast.success('OK', 'Fase creata', 3000);
          this.addingPhase.set(false);
          this.startInlineTask(normalized._id);
        },
        error: (err) => {
          console.error(err);
          this.toast.danger('Errore', 'Creazione fase fallita', 3000);
        }
      });
  }

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
    this.inlineDraft.set({
      ...this.inlineDraft(),
      priority: level
    });
  }

  saveInlineTask(): void {
    const phaseId = this.inlineTaskPhaseId();
    const d = this.inlineDraft();
    const p = this.project();
    if (!phaseId || !d.title?.trim() || !p) return;

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

    const payload: CreateTaskRequest = {
      project_id: p._id as string,
      phase_id: phaseId,
      title: d.title.trim(),
      description: (d.description || '').trim() || undefined,
      expiration_date: d.expiration_date || undefined,
      priority: d.priority
    };

    this.taskService.create(payload as any).subscribe({
      next: (created: Task) => {
        const normalized = this.normalizeTask(created, p._id as string);
        this.tasksSig.set([
          ...this.tasksSig(),
          {
            ...normalized,
            assignees: assigneesLabels,
            priority: d.priority
          }
        ]);
        this.inlineTaskPhaseId.set(null);
        this.toast.success('OK', 'Task creato', 3000);
      },
      error: (e) => {
        console.error('create task error', e);
        this.toast.danger('Errore', 'Creazione task fallita', 3000);
      }
    });
  }

  openPanel(t: Task): void {
    this.selectedTask.set(t);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedTask.set(null);
  }

  deleteTask(task: Task): void {
    if (!task?._id) return;

    this.taskService.delete(task._id).subscribe({
      next: () => {
        this.tasksSig.set(
          this.tasksSig().filter((t) => t._id !== task._id)
        );
        this.panelOpen.set(false);
        this.selectedTask.set(null);
        this.toast.success('OK', 'Task eliminato', 3000);
      },
      error: (e) => {
        console.error('delete task error', e);
        this.toast.danger('Errore', 'Eliminazione task fallita', 3000);
      }
    });
  }

  markCompleted(task: Task): void {
    if (!task?._id) return;

    this.taskService.update(task._id, { status: 'done' } as any).subscribe({
      next: () => {
        this.toast.success(
          'Completato',
          'Task marcato come completato',
          3000
        );
      },
      error: (e) => {
        console.error('update task error', e);
        this.toast.danger(
          'Errore',
          'Impossibile aggiornare il task',
          3000
        );
      }
    });
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
      console.error('Errore creazione progetto (dashboard):', err);
      this.toast.danger('Errore', 'Creazione progetto fallita', 3000);
    }
  }

  onSidebarCollapse() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}