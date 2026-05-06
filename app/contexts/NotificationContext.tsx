import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CURRENT_VERSION, SEEN_VERSION_KEY, UPDATE_NOTES } from '../utils/updateNotes';
import { kvSet } from '../lib/pouchdb-kv';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'stok' | 'odeme' | 'sistem' | 'genel' | 'guncelleme';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // LocalStorage'dan bildirimleri yükle
    const saved = localStorage.getItem('isleyen_et_notifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    }
    return [];
  });

  // LocalStorage'a kaydet + KV store'a yaz (CouchDB yedekleme)
  useEffect(() => {
    localStorage.setItem('isleyen_et_notifications', JSON.stringify(notifications));
    kvSet('app_notifications', notifications).catch(() => {});
  }, [notifications]);

  // Yeni versiyon bildirimi — sayfa yüklenince bir kez kontrol et
  useEffect(() => {
    const seen = localStorage.getItem(SEEN_VERSION_KEY);
    if (!seen || seen !== CURRENT_VERSION) {
      const newCount = UPDATE_NOTES.filter(n => n.isNew).length;
      if (newCount > 0) {
        // Aynı versiyon bildirimi daha önce eklenmediyse ekle
        const existing = JSON.parse(localStorage.getItem('isleyen_et_notifications') || '[]');
        const alreadyAdded = existing.some((n: any) => n.category === 'guncelleme' && n.title?.includes(CURRENT_VERSION));
        if (!alreadyAdded) {
          const notif = {
            type: 'success' as const,
            category: 'guncelleme' as const,
            title: `Yeni Güncelleme: ${CURRENT_VERSION}`,
            message: `${newCount} yeni iyileştirme ve düzeltme mevcut. Güncelleme notlarını görüntülemek için tıklayın.`,
            priority: 'medium' as const,
            actionUrl: '/guncelleme-notlari',
          };
          queueMicrotask(() => {
            setNotifications(prev => [{
              ...notif,
              id: `update-${CURRENT_VERSION}`,
              timestamp: new Date(),
              read: false,
            }, ...prev]);
          });
        }
      }
    }

    // "Okundu işaretle" eventi dinle — UpdateNotesPage'den tetiklenir
    const handleSeen = () => {
      setNotifications(prev =>
        prev.map(n => n.category === 'guncelleme' ? { ...n, read: true } : n)
      );
    };
    window.addEventListener('update_notes_seen', handleSeen);
    return () => window.removeEventListener('update_notes_seen', handleSeen);
  }, []);

  const checkStockLevels = async () => {
    try {
      const { getDb } = await import('../lib/pouchdb');
      const urunlerDb = getDb('urunler');
      const res = await urunlerDb.allDocs({ include_docs: true });
      let azalanStoklar = 0;
      const todayKey = 'notified_' + new Date().toISOString().split('T')[0];
      const alertedStr = localStorage.getItem(todayKey) || '[]';
      const alerted = new Set(JSON.parse(alertedStr));

      res.rows.forEach(r => {
        const u = r.doc as any;
        const stock = u.currentStock ?? u.current_stock ?? 0;
        if (stock <= 5 && stock > 0 && !alerted.has(`stok_${u._id}`)) {
          azalanStoklar++;
          alerted.add(`stok_${u._id}`);
        }
      });

      if (azalanStoklar > 0) {
        localStorage.setItem(todayKey, JSON.stringify(Array.from(alerted)));
        setNotifications(prev => [{
          id: `stock_${Date.now()}`,
          type: 'warning',
          category: 'stok',
          title: 'Kritik Stok Uyarısı',
          message: `${azalanStoklar} adet ürün kritik stok seviyesinde (5 ve altı).`,
          priority: 'medium',
          actionUrl: '/stok',
          timestamp: new Date(),
          read: false
        }, ...prev]);
      }
    } catch(e) {}
  };

  const checkPaymentDueDates = async () => {
    try {
      const { getDb } = await import('../lib/pouchdb');
      const ceklerDb = getDb('cek_senet');
      const res = await ceklerDb.allDocs({ include_docs: true });
      
      const now = new Date();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      let yaklasan = 0;
      const todayKey = 'notified_' + new Date().toISOString().split('T')[0];
      const alertedStr = localStorage.getItem(todayKey) || '[]';
      const alerted = new Set(JSON.parse(alertedStr));

      res.rows.forEach(r => {
        const c = r.doc as any;
        if (c.status === 'portfoyde' || c.status === 'bekliyor') {
          if (c.dueDate) {
            const diff = new Date(c.dueDate).getTime() - now.getTime();
            if (diff > 0 && diff <= threeDays && !alerted.has(`cek_${c._id}`)) {
              yaklasan++;
              alerted.add(`cek_${c._id}`);
            }
          }
        }
      });

      if (yaklasan > 0) {
        localStorage.setItem(todayKey, JSON.stringify(Array.from(alerted)));
        setNotifications(prev => [{
          id: `cek_${Date.now()}`,
          type: 'error',
          category: 'odeme',
          title: 'Yaklaşan Çek/Senet Vadesi',
          message: `${yaklasan} adet çek/senet için vade tarihine 3 günden az kaldı!`,
          priority: 'high',
          actionUrl: '/cekler',
          timestamp: new Date(),
          read: false
        }, ...prev]);
      }
    } catch(e) {}
  };

  // Otomatik bildirim kontrolleri
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkStockLevels();
      checkPaymentDueDates();
    }, 60000); // Her dakika kontrol et

    setTimeout(() => {
      checkStockLevels();
      checkPaymentDueDates();
    }, 3000); // İlk açılışta 3 saniye sonra kontrol et

    return () => clearInterval(checkInterval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}