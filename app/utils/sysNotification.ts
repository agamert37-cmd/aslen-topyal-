import { getNotificationSettings } from '../pages/SettingsPage';

let lastNotificationTime = 0;

export function sendSystemNotification(title: string, body: string, isCritical = false) {
  const settings = getNotificationSettings();
  
  if (!settings.enabled) return;

  const now = Date.now();
  
  // Basit Sıklık Logiği
  if (!isCritical) {
    if (settings.frequency === 'hourly' && now - lastNotificationTime < 1000 * 60 * 60) {
       return; // Saatlik - atla
    }
    if (settings.frequency === 'daily' && now - lastNotificationTime < 1000 * 60 * 60 * 24) {
       return; // Günlük - atla
    }
  }

  // Masaüstü (Electron) native bildirim
  if (window.electronAPI && window.electronAPI.showNotification) {
    window.electronAPI.showNotification(title, body);
    lastNotificationTime = now;
  } else if ('Notification' in window && Notification.permission === 'granted') {
    // Tarayıcı (Web Native) bildirim fallback
    new Notification(title, { body });
    lastNotificationTime = now;
  }
}
