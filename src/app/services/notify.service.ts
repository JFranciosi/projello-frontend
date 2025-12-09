import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Notify } from '../models/models';

const NOTIFICATIONS_KEY = 'notifications';
const UNREAD_KEY = 'unreadNotifications';
const READ_NOTIFICATIONS_KEY = 'readNotifications';
const ACCESS_TOKEN_KEY = 'accessToken';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private NOTIFY_API = 'http://localhost:8080/notify';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private http = inject(HttpClient);

  constructor() {
    this.loadUnreadCount();
  }

  private getAccessToken(): string {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
  }

  private loadUnreadCount(): void {
    const unread = localStorage.getItem(UNREAD_KEY);
    const count = unread ? parseInt(unread, 10) : 0;
    this.unreadCountSubject.next(count);
  }

  private updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
    localStorage.setItem(UNREAD_KEY, count.toString());
  }

  private getReadNotifications(): Set<string> {
    const readStr = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return readStr ? new Set(JSON.parse(readStr)) : new Set();
  }

  private saveReadNotifications(readIds: Set<string>): void {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(Array.from(readIds)));
  }

  saveNotifications(notifies: Notify[]): void {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifies));
      
      const readNotifications = this.getReadNotifications();
      const unreadCount = notifies.filter(n => !readNotifications.has(n.id)).length;
      this.updateUnreadCount(unreadCount);
    } catch (error) {
      console.error('Errore nel salvataggio delle notifiche:', error);
    }
  }

  getLocalNotifications(): Notify[] {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Errore nel recupero delle notifiche da localStorage:', error);
      return [];
    }
  }

  clearLocalNotifications(): void {
    try {
      localStorage.removeItem(NOTIFICATIONS_KEY);
    } catch (error) {
      console.error('Errore nel clearing delle notifiche:', error);
    }
  }

  async getUserNotifications(): Promise<Notify[]> {
    try {
      return this.getLocalNotifications();
    } catch (error) {
      console.error('Errore nel recupero delle notifiche:', error);
      return [];
    }
  }

  async deleteNotification(notifyId: string): Promise<boolean> {
    try {
      // Chiama il backend per eliminare la notifica
      await firstValueFrom(
        this.http.delete(`${this.NOTIFY_API}/${notifyId}`, {
          headers: { Authorization: `Bearer ${this.getAccessToken()}` }
        })
      );

      // Aggiorna il locale
      const notifies = this.getLocalNotifications();
      const filtered = notifies.filter(n => n.id !== notifyId);
      this.saveNotifications(filtered);
      
      const readNotifications = this.getReadNotifications();
      readNotifications.add(notifyId);
      this.saveReadNotifications(readNotifications);
      
      return true;
    } catch (error) {
      console.error('Errore nell\'eliminazione della notifica:', error);
      return false;
    }
  }

  async deleteAllNotifications(): Promise<boolean> {
    try {
      // Chiama il backend per eliminare tutte le notifiche
      await firstValueFrom(
        this.http.delete(`${this.NOTIFY_API}`, {
          headers: { Authorization: `Bearer ${this.getAccessToken()}` }
        })
      );

      // Aggiorna il locale
      this.clearLocalNotifications();
      this.updateUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Errore nell\'eliminazione di tutte le notifiche:', error);
      return false;
    }
  }

  markNotificationsAsRead(): void {
    const notifies = this.getLocalNotifications();
    const readNotifications = this.getReadNotifications();
    
    // Aggiungi tutte le notifiche attuali alle lette
    notifies.forEach(n => readNotifications.add(n.id));
    this.saveReadNotifications(readNotifications);
    
    this.updateUnreadCount(0);
  }

  addUnreadNotification(): void {
    const currentCount = this.unreadCountSubject.value;
    this.updateUnreadCount(currentCount + 1);
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }
}