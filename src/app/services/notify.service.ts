import { Injectable } from '@angular/core';
import { Notify } from '../models/models';

const NOTIFICATIONS_KEY = 'notifications';

@Injectable({ providedIn: 'root' })
export class NotifyService {
 
  saveNotifications(notifies: Notify[]): void {
    try {
      console.log('saveNotifications called with:', notifies);
      // Rimuovi duplicati mantenendo solo la prima occorrenza di ogni notifica
      const uniqueNotifies = Array.from(
        new Map(notifies.map(n => [n.id, n])).values()
      );
      console.log('After deduplication:', uniqueNotifies);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(uniqueNotifies));
      console.log('Notifications saved to localStorage');
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
      const notifies = this.getLocalNotifications();
      const filtered = notifies.filter(n => n.id !== notifyId);
      this.saveNotifications(filtered);
      return true;
    } catch (error) {
      console.error('Errore nell\'eliminazione della notifica:', error);
      return false;
    }
  }

  async deleteAllNotifications(): Promise<boolean> {
    try {
      this.clearLocalNotifications();
      return true;
    } catch (error) {
      console.error('Errore nell\'eliminazione di tutte le notifiche:', error);
      return false;
    }
  }
}
