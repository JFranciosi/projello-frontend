import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar {
  /** Evento emesso quando si clicca su Logout */
  @Output() logout = new EventEmitter<void>();

  onLogoutClick(): void {
    this.logout.emit();
  }
}
