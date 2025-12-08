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

import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { TaskPanel } from '../../components/task-panel/task-panel';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DragDropModule,
    DashboardSidebar,
    Navbar,
    ProjectTopbar,
    ProjectModal,
    ConfirmModal,
    TaskPanel
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {

  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.item.data as Task;
      const newPhaseId = event.container.id;

      // Optimistic update via Signal
      this.tasksSig.update(tasks =>
        tasks.map(t => (t._id === task._id ? { ...t, phase_id: newPhaseId } : t))
      );

      // Call Backend
      this.taskService.update(task._id, { phase_id: newPhaseId }).subscribe({
        next: () => {
          // Success
        },
        error: (err) => {
          console.error('Drag drop update failed', err);
          this.toast.danger('Errore', 'Spostamento fallito', 3000);
        }
      });
    }
  }
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private toast = inject(NgToastService);

  assigneeFilter = signal('');
  projectModalOpen = signal(false);
  deletePhaseConfirmOpen = signal(false);
  phaseToDelete = signal<Phase | null>(null);
  sidebarCollapsed = signal(false);

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  project = signal<ProjectResponse | null>(null);
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
    assigneeIds: string[];
  }>({
    title: '',
    description: undefined,
    expiration_date: undefined,
    priority: 'medium',
    assigneeIds: []
  });
  panelOpen = signal(false);
  selectedTask = signal<Task | null>(null);
  assignableMembers = computed(() => {
    const p = this.project();
    if (!p) return [];

    const membersMap = new Map<string, { id: string; label: string }>();

    if (p.creator?.id) {
      membersMap.set(p.creator.id, {
        id: p.creator.id,
        label: this.formatUserName(p.creator)
      });
    }

    (p.collaborators || []).forEach((c) => {
      if (!c?.id) return;
      if (!membersMap.has(c.id)) {
        membersMap.set(c.id, {
          id: c.id,
          label: this.formatUserName(c)
        });
      }
    });

    return Array.from(membersMap.values());
  });

  phases = computed(() => this.phasesSig());

  tasksFor = (phaseId: string) => {
    const tasksInPhase = this.tasksSig().filter((t) => t.phase_id === phaseId);

    const filterText = this.assigneeFilter().toLowerCase().trim();

    if (!filterText) {
      return tasksInPhase;
    }

    return tasksInPhase.filter(task => {
      if (!task.assignees || task.assignees.length === 0) return false;

      return task.assignees.some(assigneeId => {
        const member = this.assignableMembers().find(m => m.id === assigneeId);
        if (!member) return false;
        return member.label.toLowerCase().includes(filterText);
      });
    });
  };

  currentProject = () => this.project();
  inlineTaskForPhase = () => this.inlineTaskPhaseId();
  updateFilter(text: string) {
    this.assigneeFilter.set(text);
  }

  ngOnInit(): void {
    // Carica lo stato della sidebar dalla localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed.set(JSON.parse(saved));
    }

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

      const allTasks: Task[] = [];

      const tasksPromises = normalizedPhases.map(phase =>
        this.taskService.getByPhaseId(phase._id)
      );

      const results = await Promise.all(tasksPromises);

      results.forEach(tasksList => {
        if (tasksList && tasksList.length > 0) {
          allTasks.push(...tasksList);
        }
      });

      this.tasksSig.set(allTasks);

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
      _id: id ? String(id) : '',
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
      _id: id ? String(id) : '',
      project_id: projId ? String(projId) : '',
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

    const assignees: string[] = Array.isArray(raw.assignees)
      ? raw.assignees.map((a: any) => (typeof a === 'string' ? a : a.id ?? a._id))
      : [];

    return {
      _id: id ? String(id) : '',
      project_id: String(raw.project_id ?? raw.projectId ?? projectId),
      phase_id: phaseId ? String(phaseId) : '',
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
      description: undefined,
      expiration_date: undefined,
      priority: 'medium',
      assigneeIds: creatorId ? [creatorId] : []
    });
  }

  cancelInlineTask(): void {
    const creatorId = this.project()?.creator?.id;
    this.inlineTaskPhaseId.set(null);
    this.inlineDraft.set({
      title: '',
      description: undefined,
      expiration_date: undefined,
      priority: 'medium',
      assigneeIds: creatorId ? [creatorId] : []
    });
  }

  setDraftPriority(level: 'high' | 'medium' | 'low'): void {
    this.inlineDraft.set({
      ...this.inlineDraft(),
      priority: level
    });
  }

  toggleAssignee(memberId: string): void {
    const current = this.inlineDraft().assigneeIds;
    if (current.includes(memberId)) {
      this.inlineDraft.update(d => ({ ...d, assigneeIds: current.filter(id => id !== memberId) }));
    } else {
      this.inlineDraft.update(d => ({ ...d, assigneeIds: [...current, memberId] }));
    }
  }

  async saveInlineTask(): Promise<void> {
    const phaseId = this.inlineTaskPhaseId();
    const d = this.inlineDraft();
    const p = this.project();
    if (!phaseId || !d.title?.trim() || !p) return;

    const assigneeEmails: string[] = [];
    (d.assigneeIds || []).forEach(id => {
      if (p.creator?.id === id && p.creator.email) {
        assigneeEmails.push(p.creator.email);
      } else {
        const collaborator = (p.collaborators || []).find((c) => c.id === id);
        if (collaborator?.email) {
          assigneeEmails.push(collaborator.email);
        }
      }
    });

    // FIX: Backend crashes if expiration_date is null. Set default to 7 days from now if missing.
    // Also ensure format is compatible with LocalDateTime (ISO-8601)
    let expirationDate = d.expiration_date;
    if (!expirationDate || !expirationDate.trim()) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      // Format: YYYY-MM-DDTHH:mm:ss
      expirationDate = date.toISOString().split('.')[0];
    } else {
      // Input type="datetime-local" returns "YYYY-MM-DDTHH:mm"
      // We need to append seconds if missing to match LocalDateTime format "YYYY-MM-DDTHH:mm:ss"
      if (expirationDate.length === 16) { // YYYY-MM-DDTHH:mm
        expirationDate += ':00';
      } else if (expirationDate.length === 10) { // YYYY-MM-DD (fallback)
        expirationDate += 'T23:59:59';
      }
    }

    const payload: CreateTaskRequest = {
      project_id: p._id as string,
      phase_id: phaseId,
      title: d.title.trim(),
      description: (d.description || '').trim() || undefined,
      expiration_date: expirationDate,
      priority: d.priority,
      assignees: assigneeEmails
    };

    try {
      const created = await this.taskService.create(payload);

      this.tasksSig.update(list => [...list, {
        ...created,
        assignees: d.assigneeIds,
        priority: d.priority
      }]);

      this.inlineTaskPhaseId.set(null);
      this.toast.success('Ottimo', 'Task creato', 3000);
    } catch (e) {
      console.error('create task error', e);
      this.toast.danger('Errore', 'Creazione task fallita', 3000);
    }
  }

  openPanel(t: Task): void {
    this.selectedTask.set(t);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedTask.set(null);
  }

  async deleteTask(task: Task): Promise<void> {
    if (!task?._id) return;

    try {
      await this.taskService.delete(task._id);

      this.tasksSig.set(
        this.tasksSig().filter((t) => t._id !== task._id)
      );
      this.panelOpen.set(false);
      this.selectedTask.set(null);
      this.toast.success('OK', 'Task eliminato', 3000);

    } catch (e) {
      console.error('delete task error', e);
      this.toast.danger('Errore', 'Eliminazione task fallita', 3000);
    }
  }

  deletePhase(phase: Phase): void {
    if (!phase?._id) return;
    this.phaseToDelete.set(phase);
    this.deletePhaseConfirmOpen.set(true);
  }

  confirmDeletePhase(): void {
    const phase = this.phaseToDelete();
    if (!phase?._id) return;

    this.phaseService.delete(phase._id).subscribe({
      next: () => {
        // Rimuovi la fase dalla lista
        this.phasesSig.set(
          this.phasesSig().filter((p) => p._id !== phase._id)
        );
        // Rimuovi anche tutti i task associati a questa fase
        this.tasksSig.set(
          this.tasksSig().filter((t) => t.phase_id !== phase._id)
        );
        this.toast.success('OK', 'Fase eliminata', 3000);
        this.deletePhaseConfirmOpen.set(false);
        this.phaseToDelete.set(null);
      },
      error: (e) => {
        console.error('delete phase error', e);
        this.toast.danger('Errore', 'Eliminazione fase fallita', 3000);
        this.deletePhaseConfirmOpen.set(false);
        this.phaseToDelete.set(null);
      }
    });
  }

  async markCompleted(task: Task): Promise<void> {
    if (!task?._id) return;

    try {
      await this.taskService.markAsDone(task._id);

      this.toast.success('Completato!', 'Task segnata come completata.', 3000);

      this.tasksSig.update(tasks =>
        tasks.map(t => t._id === task._id ? { ...t, is_done: true } : t)
      );

      // Don't close panel automatically, let user decide or maybe update selectedTask?
      // If we update selectedTask in place, the panel updates automatically.
      if (this.selectedTask()?._id === task._id) {
        this.selectedTask.update(t => t ? ({ ...t, is_done: true }) : null);
      }

    } catch (e) {
      console.error('Errore completamento task', e);
      this.toast.danger('Errore', 'Impossibile completare il task.', 3000);
    }
  }

  async markAsIncomplete(task: Task): Promise<void> {
    if (!task?._id) return;

    try {
      await this.taskService.markAsIncomplete(task._id);

      this.toast.info('Ripristinato', 'Task segnata come da fare.', 3000);

      this.tasksSig.update(tasks =>
        tasks.map(t => t._id === task._id ? { ...t, is_done: false } : t)
      );

      if (this.selectedTask()?._id === task._id) {
        this.selectedTask.update(t => t ? ({ ...t, is_done: false }) : null);
      }

    } catch (e) {
      console.error('Errore', e);
      this.toast.danger('Errore', 'Impossibile aggiornare il task.', 3000);
    }
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
        collaborators: data.collaborators
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

  onSidebarCollapse(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private formatUserName(user?: UserResponse | null): string {
    if (!user) return 'Membro senza nome';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.username || user.email || 'Membro del progetto';
  }

  private assigneeLabelById(id: string | undefined, project: ProjectResponse | null): string | null {
    if (!id || !project) return null;
    if (project.creator?.id === id) {
      return this.formatUserName(project.creator);
    }
    const collaborator = (project.collaborators || []).find((c) => c.id === id);
    return collaborator ? this.formatUserName(collaborator) : null;
  }

  getSelectedNames(): string {
    const ids = this.inlineDraft().assigneeIds;
    if (ids.length === 0) return '';

    const p = this.project();
    if (!p) return '';

    const names = ids.map(id => this.assigneeLabelById(id, p)).filter(n => n !== null) as string[];

    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names.length} selezionati`;
  }

  getTaskAssigneeLabel(task: Task): string | null {
    if (!task.assignees || task.assignees.length === 0) return null;

    // Tenta di risolvere il nome del primo assegnatario
    const firstId = task.assignees[0];
    const member = this.assignableMembers().find((m) => m.id === firstId);

    if (!member) return null;

    if (task.assignees.length > 1) {
      return `${member.label} +${task.assignees.length - 1}`;
    }
    return member.label;
  }
  async onUpdateTask(event: { taskId: string, data: Partial<Task> }) {
    const { taskId, data } = event;
    try {
      this.tasksSig.update(tasks =>
        tasks.map(t => (t._id === taskId ? { ...t, ...data } : t))
      );

      this.selectedTask.update(t => t && t._id === taskId ? { ...t, ...data } : t);

      const serverPayload = { ...data };

      if (serverPayload.assignees && Array.isArray(serverPayload.assignees)) {
        const p = this.project();
        if (p) {
          const emailList: string[] = [];
          serverPayload.assignees.forEach(id => {
            if (p.creator?.id === id && p.creator.email) {
              emailList.push(p.creator.email);
            } else {
              const collaborator = (p.collaborators || []).find((c) => c.id === id);
              if (collaborator?.email) {
                emailList.push(collaborator.email);
              }
            }
          });
          serverPayload.assignees = emailList;
        }
      }

      await firstValueFrom(this.taskService.update(taskId, serverPayload));

      this.toast.success('Salvato', 'Task aggiornato con successo', 3000);
    } catch (e) {
      console.error('Update failed', e);
      this.toast.danger('Errore', 'Impossibile aggiornare il task', 3000);
    }
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}