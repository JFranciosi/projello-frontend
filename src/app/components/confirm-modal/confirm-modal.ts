import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css'
})
export class ConfirmModal {
  @Input() open = false;
  @Input() title = 'Conferma';
  @Input() message = '';
  @Input() confirmText = 'Conferma';
  @Input() cancelText = 'Annulla';
  @Input() isDangerous = false;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
    this.close.emit();
  }

  onCancel(): void {
    this.close.emit();
  }
}
