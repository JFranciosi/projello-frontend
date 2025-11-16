// src/app/app.config.ts
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideNgToast } from 'ng-angular-popup';
import {
  LucideAngularModule,User,
  Bell, Search, UserCircle2, LogOut,
  LayoutDashboard, Calendar, CalendarClock, Archive,
  Paperclip, MessageSquare, CheckSquare2, Clock, Tag, MoreVertical, Flag,
  Copy, Trash2, X, FileText, Square, Plus
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideNgToast(),

    // Registra TUTTE le icone usate nel progetto
    importProvidersFrom(
      LucideAngularModule.pick({
        Bell, Search, UserCircle2, User, LogOut,
        LayoutDashboard, Calendar, CalendarClock, Archive,
        Paperclip, MessageSquare, CheckSquare2, Clock, Tag, MoreVertical, Flag,
        Copy, Trash2, X, FileText, Square, Plus
      })
    ),
  ],
};
