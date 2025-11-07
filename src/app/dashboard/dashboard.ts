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

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(NgToastService);
  private readonly phaseSrv = inject(PhaseService);
  private readonly taskSrv = inject(TaskService);

  /** ======= Fallback locale: 3 colonne standard ======= */
  private static readonly DEFAULT_PHASES: Phase[] = [
    { _id: 'todo',        project_id: '__local__', title: 'Da fare',     order: 1 },
    { _id: 'in_progress', project_id: '__local__', title: 'In corso',    order: 2 },
    { _id: 'done',        project_id: '__local__', title: 'Completato',  order: 3, is_done: true },
  ];

  private useFallbackPhases(reason: 'no-project' | 'empty' | 'error'): void {
    const cols = Dashboard.DEFAULT_PHASES;
    this.phases.set(cols);
    const map: Record<string, Task[]> = {};
    cols.forEach(c => (map[c._id] = []));
    this.tasksByPhase.set(map);
    this.loading.set(false);

    if (reason === 'no-project') {
      this.errorMsg.set('Nessun projectId. Mostro colonne di default.');
    } else if (reason === 'empty') {
      this.errorMsg.set('Nessuna phase trovata. Mostro colonne di default.');
    } else {
      this.errorMsg.set('Errore API. Mostro colonne di default.');
    }
  }

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.paramMap.get('projectId');
    const fallback = localStorage.getItem('project_id');
    const pid = fromRoute || fallback;

    if (!pid) {
      // Nessun projectId -> mostra colonne base
      this.useFallbackPhases('no-project');
      return;
    }

    this.projectId.set(pid);
    localStorage.setItem('project_id', pid);
    this.loadBoard();
  }

  /** ======= Load board ======= */
  loadBoard(): void {
    const pid = this.projectId();
    if (!pid) {
      this.useFallbackPhases('no-project');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    this.phaseSrv.list(pid).subscribe({
      next: (cols) => {
        const ordered = [...(cols || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        if (!ordered.length) {
          // Nessuna fase dal backend -> 3 colonne default
          this.useFallbackPhases('empty');
          return;
        }

        this.phases.set(ordered);

        // inizializza mappa vuota
        const blank: Record<string, Task[]> = {};
        ordered.forEach((p) => (blank[p._id] = []));
        this.tasksByPhase.set(blank);

        // carica tasks di ogni colonna
        ordered.forEach((p) => this.loadPhaseTasks(p._id));
      },
      error: (err) => {
        console.error(err);
        // Errore API -> 3 colonne default
        this.useFallbackPhases('error');
      },
    });
  }

  private loadPhaseTasks(phase_id: string): void {
    const pid = this.projectId();
    if (!pid) return;

    this.taskSrv.list({ project_id: pid, phase_id }).subscribe({
      next: (items) => {
        const map = { ...this.tasksByPhase() };
        map[phase_id] = items ?? [];
        this.tasksByPhase.set(map);
      },
      error: (err) => {
        console.error('Errore caricamento tasks per phase', phase_id, err);
        this.toast.danger('Errore', 'Impossibile caricare i task della colonna.');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  /** Helper per template */
  tasksFor(phaseId: string): Task[] {
    return this.tasksByPhase()[phaseId] ?? [];
  }

  /** ======= Navbar: Logout ======= */
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {}
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  /** ======= Modale ======= */
  openModal(type: 'task' | 'project' = 'task', phaseId?: string): void {
    this.modalType.set(type);
    const target = phaseId || this.phases()[0]?._id || null;
    this.draftPhaseId.set(target);
    this.modalOpen.set(true);
  }
  closeModal(): void {
    this.modalOpen.set(false);
  }

  /** onSave: collega i valori reali del form (stub minimo pronto) */
  onSave(ev?: Event): void {
    ev?.preventDefault();
    const pid = this.projectId();
    const dest = this.draftPhaseId();

    if (this.modalType() !== 'task') {
      this.toast.info('Info', 'Crea progetto: integra la tua API /projects.');
      this.closeModal();
      return;
    }

    if (!pid) {
      // Se stai usando le colonne fallback, non chiamiamo l’API
      this.toast.warning('Attenzione', 'Nessun projectId: il task non verrà creato sul backend.');
      this.closeModal();
      return;
    }

    if (!dest) {
      this.toast.warning('Attenzione', 'Seleziona una colonna di destinazione.');
      return;
    }

    const payload = {
      project_id: pid,
      phase_id: dest,
      title: 'Nuovo task',
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
  }

  /** ======= Pannello task ======= */
  openPanel(task?: Task): void {
    this.panelOpen.set(true);

    // Se stai usando fallback (no projectId), apro solo in lettura locale
    if (!this.projectId() || !task?._id) {
      this.selectedTask.set(task ?? null);
      return;
    }

    this.taskSrv.getById(task._id).subscribe({
      next: (full) => this.selectedTask.set(full),
      error: () => {
        this.selectedTask.set(task ?? null);
        this.toast.warning('Attenzione', 'Dettagli non disponibili.');
      },
    });
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedTask.set(null);
  }

  /** ESC per chiudere modale/pannello */
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.modalOpen()) this.closeModal();
    if (this.panelOpen()) this.closePanel();
  }

  /** ======= Azioni task ======= */
  moveTaskToPhase(task: Task, toPhaseId: string, position = 0): void {
    if (!this.projectId()) {
      this.toast.warning('Attenzione', 'Spostamento non disponibile senza backend.');
      return;
    }

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

  /** Sposta in "done" se esiste una phase con is_done = true */
  markCompleted(task: Task): void {
    const donePhase = this.phases().find((p) => p.is_done);
    if (!donePhase) {
      this.toast.warning('Attenzione', 'Non esiste una colonna "completato".');
      return;
    }
    this.moveTaskToPhase(task, donePhase._id, 0);
  }

  deleteTask(task: Task): void {
    if (!this.projectId()) {
      // rimozione solo lato UI in fallback
      this.removeFromBoard(task._id);
      if (this.selectedTask()?._id === task._id) this.closePanel();
      this.toast.success('Eliminato', 'Task rimosso localmente.');
      return;
    }

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

  /** ======= Helper trackBy ======= */
  trackById(_i: number, item: { _id: string }): string {
    return item._id;
  }
}
