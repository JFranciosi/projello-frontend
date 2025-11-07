import {
  Component,
  HostListener,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';

import { PhaseService, Phase } from '../services/phase.service';
import { TaskService, Task } from '../services/task.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DashboardSidebar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  // STATE (camelCase)
  modalOpen = signal(false);
  panelOpen = signal(false);
  modalType = signal<'task' | 'project'>('task');
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  projectId = signal<string | null>(null);
  phases = signal<Phase[]>([]);
  tasksByPhase = signal<Record<string, Task[]>>({});
  selectedTask = signal<Task | null>(null);
  draftPhaseId = signal<string | null>(null);

  totalCount = computed(() =>
    Object.values(this.tasksByPhase()).reduce((acc, arr) => acc + (arr?.length || 0), 0)
  );

  // DI
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(NgToastService);
  private readonly phaseSrv = inject(PhaseService);
  private readonly taskSrv = inject(TaskService);

  // INIT
  ngOnInit(): void {
    const fromRoute =
      this.route.snapshot.paramMap.get('projectId') ??
      this.route.snapshot.paramMap.get('project_id');
    const fallback = localStorage.getItem('project_id');
    const pid = fromRoute || fallback;

    if (!pid) {
      this.toast.warning('Attenzione', 'Project non selezionato.');
      this.errorMsg.set('Nessun project_id.');
      return;
    }

    this.projectId.set(pid);
    localStorage.setItem('project_id', pid);
    this.loadBoard();
  }

  // LOAD BOARD
  loadBoard(): void {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    this.phaseSrv.list(pid).subscribe({
      next: (cols) => {
        const ordered = [...(cols || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.phases.set(ordered);

        // mappa vuota per colonne
        const blank: Record<string, Task[]> = {};
        ordered.forEach((p) => (blank[p._id] = []));
        this.tasksByPhase.set(blank);

        // carica i task di ogni colonna
        ordered.forEach((p) => this.loadPhaseTasks(p._id));
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set('Errore nel caricamento colonne.');
        this.toast.danger('Errore', 'Impossibile caricare le colonne (phases).');
        this.loading.set(false);
      },
    });
  }

  private loadPhaseTasks(phaseId: string): void {
    const pid = this.projectId();
    if (!pid) return;

    // >>> snake_case SOLO nei payload/params <<<
    this.taskSrv.list({ project_id: pid, phase_id: phaseId }).subscribe({
      next: (items) => {
        const map = { ...this.tasksByPhase() };
        map[phaseId] = items ?? [];
        this.tasksByPhase.set(map);
      },
      error: (err) => {
        console.error('Errore caricamento tasks per phase', phaseId, err);
        this.toast.danger('Errore', 'Impossibile caricare i task della colonna.');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  // HELPERS
  tasksFor(phaseId: string): Task[] {
    return this.tasksByPhase()[phaseId] ?? [];
  }

  // NAVBAR
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {}
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  // MODAL
  openModal(type: 'task' | 'project' = 'task', phaseId?: string): void {
    this.modalType.set(type);
    const target = phaseId || this.phases()[0]?._id || null;
    this.draftPhaseId.set(target);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onSave(ev?: Event): void {
    ev?.preventDefault();
    const pid = this.projectId();
    const dest = this.draftPhaseId();

    if (!pid) {
      this.toast.warning('Attenzione', 'Project mancante.');
      return;
    }

    if (this.modalType() === 'task') {
      if (!dest) {
        this.toast.warning('Attenzione', 'Seleziona una colonna di destinazione.');
        return;
      }

      // >>> snake_case SOLO nel payload <<<
      const payload: { project_id: string; phase_id: string; title: string } = {
        project_id: pid,
        phase_id: dest,
        title: 'Nuovo task', // TODO: leggi dal form
      };

      this.taskSrv.create(payload).subscribe({
        next: (created) => {
          const map = { ...this.tasksByPhase() };
          map[dest] = [created, ...(map[dest] || [])];
          this.tasksByPhase.set(map);
          this.toast.success('Creato', 'Task creato con successo.');
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.toast.danger('Errore', 'Creazione task fallita.');
        },
      });
    } else {
      this.toast.info('Info', 'Crea progetto: integra la tua API /projects.');
      this.closeModal();
    }
  }

  // PANEL
  openPanel(task?: Task): void {
    this.panelOpen.set(true);

    if (task?._id) {
      this.taskSrv.getById(task._id).subscribe({
        next: (full) => this.selectedTask.set(full),
        error: () => {
          this.selectedTask.set(task ?? null);
          this.toast.warning('Attenzione', 'Dettagli non disponibili.');
        },
      });
    } else {
      this.selectedTask.set(null);
    }
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedTask.set(null);
  }

  // ESC
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.modalOpen()) this.closeModal();
    if (this.panelOpen()) this.closePanel();
  }

  // TASK ACTIONS
  moveTaskToPhase(task: Task, toPhaseId: string, position = 0): void {
    // >>> snake_case SOLO nel payload <<<
    this.taskSrv.move(task._id, { phase_id: toPhaseId, position }).subscribe({
      next: (updated) => {
        this.removeFromBoard(task._id);
        const map = { ...this.tasksByPhase() };
        map[toPhaseId] = [updated, ...(map[toPhaseId] || [])];
        this.tasksByPhase.set(map);
        this.toast.success('Spostato', 'Task spostato di colonna.');
      },
      error: () => this.toast.danger('Errore', 'Spostamento fallito.'),
    });
  }

  markCompleted(task: Task): void {
    const donePhase = this.phases().find((p) => p.is_done);
    if (!donePhase) {
      this.toast.warning('Attenzione', 'Non esiste una colonna "completato".');
      return;
    }
    this.moveTaskToPhase(task, donePhase._id, 0);
  }

  deleteTask(task: Task): void {
    this.taskSrv.delete(task._id).subscribe({
      next: () => {
        this.removeFromBoard(task._id);
        if (this.selectedTask()?._id === task._id) this.closePanel();
        this.toast.success('Eliminato', 'Task eliminato.');
      },
      error: () => this.toast.danger('Errore', 'Eliminazione fallita.'),
    });
  }

  private removeFromBoard(taskId: string): void {
    const map = { ...this.tasksByPhase() };
    Object.keys(map).forEach((pid) => {
      map[pid] = (map[pid] || []).filter((t) => t._id !== taskId);
    });
    this.tasksByPhase.set(map);
  }

  // TRACK BY (usali nel template: track trackByTask / trackByPhase)
  trackByTask = (_: number, item: Task) => item._id;
  trackByPhase = (_: number, item: Phase) => item._id;
}
