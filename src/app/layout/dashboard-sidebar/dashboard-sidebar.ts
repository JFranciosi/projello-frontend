import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotifyService } from '../../services/notify.service';
import { Observable } from 'rxjs';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: Observable<number>;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.css',
})
export class DashboardSidebar implements OnInit {
  @Output() createProject = new EventEmitter<void>();
  @Output() collapseChanged = new EventEmitter<boolean>();
  @Input() collapsed:boolean = false;
  noTransition = true;
  private notifyService = inject(NotifyService);
  unreadCount$ = this.notifyService.unreadCount$;

  ngOnInit(): void {
    // Carica lo stato dalla localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.collapsed = JSON.parse(saved);
    }
    // Disabilita la transizione solo al caricamento iniziale
    setTimeout(() => {
      this.noTransition = false;
    }, 10);
  }

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
      badge: this.unreadCount$,
    },
    {
      label: 'Profilo',
      path: '/profile',
      icon: 'UserCircle2',
    },
  ];

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    // Salva lo stato nella localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.collapsed));
    this.collapseChanged.emit(this.collapsed);
  }
}
