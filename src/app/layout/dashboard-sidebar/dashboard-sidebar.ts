import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  styleUrl: './dashboard-sidebar.css',
})
export class DashboardSidebar {
  @Output() createProject = new EventEmitter<void>();
  @Output() collapseChanged = new EventEmitter<boolean>();
  @Input() collapsed:boolean = false;


  nav: NavItem[] = [
    {
      label: 'Progetti',
      path: '/projects',
      icon: 'layout-dashboard',
    },
    {
      label: 'Notifiche',
      path: '/notifications',
      icon: 'Bell',
    },
    {
      label: 'Profilo',
      path: '/profile',
      icon: 'UserCircle2',
    },
  ];

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapseChanged.emit(this.collapsed);
  }
}
