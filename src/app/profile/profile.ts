import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { NgToastService } from 'ng-angular-popup';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DashboardSidebar],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class Profile {
  profile = signal({ name: '', email: '' });

  private readonly router = inject(Router);
  private readonly toast = inject(NgToastService);

  /** Logout */
  logout(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch {}
    this.router.navigateByUrl('/login').catch(() => (window.location.href = '/login'));
  }

  saveProfile(): void {
    // chiamata API 
    this.toast.success('Profilo salvato', 'Le modifiche al profilo sono state salvate con successo.');
  }
}
