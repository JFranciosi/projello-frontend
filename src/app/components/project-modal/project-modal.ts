import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-modal.html',
  styleUrl: './project-modal.css'
})
export class ProjectModal {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{ title: string; collaborators: string[] }>();

  title: string = '';
  emailInput: string = '';
  collaborators: string[] = [];

  addEmail() {
    const email = this.emailInput.trim();
    if (!email || !email.includes('@') || this.collaborators.includes(email)) return;

    this.collaborators.push(email);
    this.emailInput = '';
  }

  removeEmail(email: string) {
    this.collaborators = this.collaborators.filter(c => c !== email);
  }

  onEmailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addEmail();
    }
  }

  private resetForm(): void {
    this.title = '';
    this.emailInput = '';
    this.collaborators = [];
  }

  closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  submit() {
    if (!this.title.trim()) return;
    this.create.emit({
      title: this.title.trim(),
      collaborators: this.collaborators
    });
    this.resetForm();
  }
}
