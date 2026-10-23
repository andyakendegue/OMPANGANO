import { AppNotification } from '../types';

export class NotificationService {
  private static STORAGE_KEY = 'nkala_notifications_settings';
  private static ALERTS_KEY = 'nkala_inapp_alerts';

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('Erreur demande permission notifications:', err);
      return false;
    }
  }

  public static sendLocalNotification(title: string, options?: NotificationOptions): void {
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=192&q=80',
          badge: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=96&q=80',
          ...options
        });
      } catch (err) {
        console.warn('Erreur affichage notification push:', err);
      }
    }

    // Save in-app notification
    this.addInAppNotification({
      id: 'alert-' + Date.now(),
      userId: 'current',
      title,
      message: options?.body || '',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  public static getInAppNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(this.ALERTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addInAppNotification(item: AppNotification): void {
    try {
      const current = this.getInAppNotifications();
      const updated = [item, ...current].slice(0, 30);
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving in-app alert', e);
    }
  }

  public static markAllAsRead(): void {
    try {
      const current = this.getInAppNotifications().map(n => ({ ...n, read: true }));
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed marking read', e);
    }
  }

  public static getReminderTime(): string {
    return localStorage.getItem('nkala_daily_reminder_time') || '18:30';
  }

  public static setReminderTime(timeStr: string): void {
    localStorage.setItem('nkala_daily_reminder_time', timeStr);
  }

  public static isReminderEnabled(): boolean {
    return localStorage.getItem('nkala_daily_reminder_active') === 'true';
  }

  public static setReminderEnabled(enabled: boolean): void {
    localStorage.setItem('nkala_daily_reminder_active', enabled ? 'true' : 'false');
    if (enabled) {
      this.sendLocalNotification('Rappel Quotidien Activé !', {
        body: `Vous recevrez une invitation à préserver l'Enenga chaque jour à ${this.getReminderTime()}.`
      });
    }
  }
}
