import {
    Component,
    EventEmitter,
    Input,
    Output,
    computed,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectResponse, Task, UserResponse } from '../../models/models';

import { ChangeDetectorRef, inject } from '@angular/core';

@Component({
    selector: 'app-task-panel',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, FormsModule],
    templateUrl: './task-panel.html',
    styleUrls: ['./task-panel.css']
})
export class TaskPanel {
    private cdr = inject(ChangeDetectorRef);
    private _task: Task | null = null;

    @Input() set task(t: Task | null) {
        console.log('TaskPanel input task:', t);
        this._task = t;
        this.isEditing.set(false);
    }
    get task(): Task | null { return this._task; }

    @Input() isOpen = false;
    @Input() project: ProjectResponse | null = null;
    @Input() phases: any[] = [];

    @Output() close = new EventEmitter<void>();
    @Output() markCompleted = new EventEmitter<Task>();
    @Output() markIncomplete = new EventEmitter<Task>();
    @Output() deleteTask = new EventEmitter<Task>();
    @Output() updateTask = new EventEmitter<{ taskId: string, data: Partial<Task> }>();

    isEditing = signal(false);
    editDraft = signal<{
        title: string;
        description: string;
        phase_id: string;
        expiration_date: string;
        assigneeIds: string[];
    }>({
        title: '',
        description: '',
        phase_id: '',
        expiration_date: '',
        assigneeIds: []
    });

    onClose() {
        this.close.emit();
        this.isEditing.set(false);
    }

    startEdit() {
        if (!this.task) return;
        this.editDraft.set({
            title: this.task.title,
            description: this.task.description || '',
            phase_id: this.task.phase_id,
            expiration_date: this.formatDateForInput(this.task.expiration_date),
            assigneeIds: [...(this.task.assignees || [])]
        });
        this.isEditing.set(true);
    }

    private formatDateForInput(dateStr?: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    }

    cancelEdit(event?: Event) {
        if (event) event.stopPropagation();
        console.log('Canceling edit. Current task:', this.task);
        this.isEditing.set(false);
        this.cdr.detectChanges();
    }

    saveEdit() {
        if (!this.task) return;
        const d = this.editDraft();
        let isoDate = undefined;
        if (d.expiration_date) {
            const dateObj = new Date(d.expiration_date);
            isoDate = new Date(d.expiration_date + ':00.000Z').toISOString();
        }

        const updates: Partial<Task> = {
            title: d.title,
            description: d.description,
            phase_id: d.phase_id,
            expiration_date: isoDate,
            assignees: d.assigneeIds
        };

        this.updateTask.emit({ taskId: this.task._id, data: updates });
        this.isEditing.set(false);
    }

    toggleDraftAssignee(memberId: string) {
        const current = this.editDraft().assigneeIds;
        if (current.includes(memberId)) {
            this.editDraft.update(d => ({ ...d, assigneeIds: current.filter(id => id !== memberId) }));
        } else {
            this.editDraft.update(d => ({ ...d, assigneeIds: [...current, memberId] }));
        }
    }

    get assignableMembers() {
        if (!this.project) return [];
        const members: { id: string; label: string }[] = [];
        if (this.project.creator?.id) {
            members.push({ id: this.project.creator.id, label: this.formatUserName(this.project.creator) });
        }
        (this.project.collaborators || []).forEach(c => {
            if (c.id) members.push({ id: c.id, label: this.formatUserName(c) });
        });
        // Remove duplicates
        return members.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    }

    onDelete(event: Event) {
        event.stopPropagation();
        if (this.task) {
            this.deleteTask.emit(this.task);
        }
    }

    onMarkCompleted() {
        if (this.task) {
            this.markCompleted.emit(this.task);
        }
    }

    onMarkIncomplete() {
        if (this.task) {
            this.markIncomplete.emit(this.task);
        }
    }

    getAssigneeNames(task: Task): string {
        if (!task.assignees || task.assignees.length === 0) return '—';
        if (!this.project) return '—';

        const names = task.assignees
            .map((id) => this.assigneeLabelById(id as string, this.project!))
            .filter((n) => n !== null) as string[];

        return names.length > 0 ? names.join(', ') : '—';
    }

    private assigneeLabelById(id: string | undefined, project: ProjectResponse): string | null {
        if (!id) return null;
        if (project.creator?.id === id) {
            return this.formatUserName(project.creator);
        }
        const collaborator = (project.collaborators || []).find((c) => c.id === id);
        return collaborator ? this.formatUserName(collaborator) : null;
    }

    private formatUserName(user?: UserResponse | null): string {
        if (!user) return 'Membro senza nome';
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return fullName || user.username || user.email || 'Membro del progetto';
    }

    getPhaseName(phaseId?: string): string {
        if (!phaseId || !this.phases) return '—';
        const phase = this.phases.find(p => p._id === phaseId);
        return phase ? phase.title : '—';
    }
}
