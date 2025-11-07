import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './dashboard-sidebar.html',
  styleUrls: ['./dashboard-sidebar.css'],
})
export class DashboardSidebar {
  @Output() createProject = new EventEmitter<void>();

  nav: NavItem[] = [
    { label: 'Tutti i progetti', path: '/dashboard',           icon: 'layout-dashboard' },
    { label: 'Oggi',            path: '/dashboard/today',       icon: 'calendar' },
    { label: 'Scadenze',        path: '/dashboard/expiration',   icon: 'calendar-clock' },
    { label: 'Archivio',        path: '/dashboard/archive',   icon: 'archive' },
  ];
}
