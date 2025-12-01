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
    { label: 'Tutti i progetti', 
      path: '/projects',           
      icon: 'layout-dashboard' },

    { label: 'Notifiche',        
      path: '/notifications',   
      icon: 'Bell' },

    { label: 'Profilo',        
      path: '/profile',   
      icon: 'UserCircle2' },
  ];
}
