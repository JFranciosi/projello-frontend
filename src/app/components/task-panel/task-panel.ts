import {
    Component,
    EventEmitter,
    Input,
    Output,
    computed,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectResponse, Task, UserResponse } from '../../models/models';

@Component({
    selector: 'app-task-panel',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './task-panel.html',
    styleUrls: ['./task-panel.css']
})
export class TaskPanel {
    @Input() task: Task | null = null;
    @Input() isOpen = false;
    @Input() project: ProjectResponse | null = null;
    @Input() phases: any[] = [];

    @Output() close = new EventEmitter<void>();
    @Output() markCompleted = new EventEmitter<Task>();
    @Output() markIncomplete = new EventEmitter<Task>();
    @Output() deleteTask = new EventEmitter<Task>();

    onClose() {
        this.close.emit();
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
