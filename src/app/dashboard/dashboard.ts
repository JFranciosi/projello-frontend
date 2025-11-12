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
import { NgToastService } from 'ng-angular-popup';

import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { PhaseService, } from '../services/phase.service';
import { TaskService } from '../services/task.service';
import { Task } from '../models/models';
import { Phase } from '../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DashboardSidebar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  // UI state
  modalOpen = signal(false);
  panelOpen = signal(false);
  modalType = signal<'task' | 'project' | 'phase'>('task');
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  // Data state
  projectId = signal<string | null>(null);
  phases = signal<Phase[]>([]);
  tasksByPhase = signal<Record<string, Task[]>>({});
  selectedTask = signal<Task | null>(null);
  draftPhaseId = signal<string | null>(null);

  totalCount = computed(() =>
    Object.values(this.tasksByPhase()).reduce((acc, arr) => acc + (arr?.length || 0), 0)
  );

  // Services
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(NgToastService);
  private readonly phaseSrv = inject(PhaseService);
  private readonly taskSrv = inject(TaskService);

  ngOnInit(): void {
    // project id dalla route o dal localStorage
    const fromRoute = this.route.snapshot.paramMap.get('id');
    const fallback = localStorage.getItem('project_id');
    const pid = fromRoute || fallback;

    if (!pid) {
      // se non ho un progetto, rimando alla lista progetti
      this.router.navigateByUrl('/projects');
      return;
    }

    this.projectId.set(pid);
    localStorage.setItem('project_id', pid);
    this.loadBoard();
  }

  /** Carica fasi e task (ordine: lasciamo quello di creazione) */
  loadBoard(): void {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    this.phaseSrv.list(pid).subscribe({
      next: (cols) => {
        const ordered = [...(cols || [])]; // niente sort: l'ordine è quello di creazione
        this.phases.set(ordered);

        // se non ci sono fasi, resetto e chiudo
        if (!ordered.length) {
          this.tasksByPhase.set({});
          this.loading.set(false);
          return;
        }

        // mappa task per ogni fase
        const map: Record<string, Task[]> = {};
        ordered.forEach((p) => (map[p._id] = []));
        this.tasksByPhase.set(map);

        ordered.forEach((p) => this.loadPhaseTasks(p._id));
      },
      error: (err) => {
        console.error('Errore caricamento fasi:', err);
        this.errorMsg.set('Impossibile caricare le fasi.');
        this.phases.set([]);
        this.tasksByPhase.set({});
        this.loading.set(false);
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
        console.error('Errore caricamento tasks per fase', phase_id, err);
        this.toast.danger('Errore', 'Impossibile caricare i task della colonna.');
      },
      complete: () => this.loading.set(false),
    });
  }

  /** Helpers */
  tasksFor(phaseId: string): Task[] {
    return this.tasksByPhase()[phaseId] ?? [];
  }

  trackById(_i: number, item: { _id: string }): string {
    return item._id;
  }

  /** Navbar / Logout */
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {}
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  /** Modale */
  openModal(type: 'task' | 'project' | 'phase' = 'task', phaseId?: string): void {
    this.modalType.set(type);
    const target = phaseId || this.phases()[0]?._id || null;
    this.draftPhaseId.set(target);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  /** Salvataggi */
  onSave(ev?: Event): void {
    ev?.preventDefault();

    const pid = this.projectId();
    const type = this.modalType();

    if (type === 'phase') {
      if (!pid) return;

      const titleInput = document.getElementById('titolo') as HTMLInputElement | null;
      const descInput  = document.getElementById('descrizioneFase') as HTMLTextAreaElement | null;

      const title = titleInput?.value?.trim();
      const description = descInput?.value?.trim() || undefined;

      if (!title) {
        this.toast.warning('Attenzione', 'Inserisci un nome per la colonna.');
        return;
      }

      // crea fase con solo titolo (+ descrizione opzionale), legata al project_id
      this.phaseSrv.create(pid, { title, ...(description ? { description } : {}) }).subscribe({
        next: (created) => {
          // append a destra (ordine di creazione)
          const updated = [...this.phases(), created];
          this.phases.set(updated);

          // inizializza colonna vuota nella mappa task
          const map = { ...this.tasksByPhase() };
          map[created._id] = [];
          this.tasksByPhase.set(map);

          this.toast.success('Colonna creata', `"${created.title}" aggiunta con successo.`);
          this.closeModal();
        },
        error: (err) => {
          console.error('Errore creazione fase:', err);
          this.toast.danger('Errore', 'Creazione colonna fallita.');
        },
      });

      return;
    }

    if (type === 'task') {
      const dest = this.draftPhaseId();
      if (!pid || !dest) {
        this.toast.warning('Attenzione', 'Seleziona prima una colonna.');
        return;
      }

      const titleInput = document.getElementById('titolo') as HTMLInputElement | null;
      const descInput  = document.getElementById('descrizione') as HTMLTextAreaElement | null;
      const dueInput   = document.getElementById('scadenza') as HTMLInputElement | null;
      const prioSelect = document.getElementById('priorita') as HTMLSelectElement | null;

      const title = (titleInput?.value || 'Nuovo task').trim();
      const description = descInput?.value?.trim() || '';
      const expiration_date = dueInput?.value || undefined;
      const priority = (prioSelect?.value as Task['priority']) || 'medium';

      const payload: { project_id: string; phase_id: string; title: string } & Partial<Task> = {
        project_id: pid,
        phase_id: dest,
        title,
        description,
        expiration_date,
        priority,
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
          console.error('Errore creazione task:', err);
          this.toast.danger('Errore', 'Creazione task fallita.');
        },
      });

      return;
    }

    // project: placeholder
    this.toast.info('Info', 'Crea progetto: integra la tua API /projects.');
    this.closeModal();
  }

  /** Pannello task */
  openPanel(task?: Task): void {
    this.panelOpen.set(true);

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

  /** Esc chiude modale/pannello */
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.modalOpen()) this.closeModal();
    if (this.panelOpen()) this.closePanel();
  }

  /** Azioni Task */
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

  markCompleted(task: Task): void {
    // se non c'è una colonna "done" dedicata, manteniamo lo spostamento manuale
    const donePhase = this.phases().find((p: any) => (p as any).is_done);
    if (!donePhase) {
      this.toast.warning('Attenzione', 'Non esiste una colonna "Completato".');
      return;
    }
    this.moveTaskToPhase(task, donePhase._id, 0);
  }

  deleteTask(task: Task): void {
    if (!this.projectId()) {
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
}
