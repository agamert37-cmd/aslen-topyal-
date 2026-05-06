import { useEffect, useRef } from 'react';
import { getDb } from '../lib/pouchdb';
import { useNotifications } from '../contexts/NotificationContext';

const CHECK_INTERVAL = 1000 * 60 * 15; // 15 dakika
const LOW_STOCK_THRESHOLD = 5;

// Bildirim spamı yapmamak için o gün gösterilenlerin id kaydını tutabiliriz
const getNotifiedKey = () => `notified_${new Date().toISOString().split('T')[0]}`;

export function useAutoReminders() {
  const { addNotification } = useNotifications();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function checkReminders() {
      const todayKey = getNotifiedKey();
      const notifiedSetParam = localStorage.getItem(todayKey) || '[]';
      let notifiedSet = new Set<string>();
      try { notifiedSet = new Set(JSON.parse(notifiedSetParam)); } catch (e) {}

      const newNotifications: { id: string; category: any; title: string; message: string; priority: any; actionUrl?: string; type: any }[] = [];

      // 1. Stok Kontrolü
      try {
        const urunlerDb = getDb('urunler');
        const urunlerDocs = await urunlerDb.allDocs({ include_docs: true });
        
        let azalanStoklar = 0;
        urunlerDocs.rows.forEach(r => {
          const u: any = r.doc;
          const stock = u.currentStock || u.current_stock || 0;
          if (stock <= LOW_STOCK_THRESHOLD && stock > 0 && !notifiedSet.has(`stock_${u._id}`)) {
            azalanStoklar++;
            notifiedSet.add(`stock_${u._id}`);
          }
        });

        if (azalanStoklar > 0) {
          newNotifications.push({
            id: `stock_${Date.now()}`,
            type: 'warning',
            category: 'stok',
            title: 'Kritik Stok Uyarısı',
            message: `${azalanStoklar} adet ürün kritik stok seviyesinde (≤${LOW_STOCK_THRESHOLD}).`,
            priority: 'medium',
            actionUrl: '/stok'
          });
        }
      } catch(e) { console.warn("Stok kontrol hatası", e); }

      // 2. Çek Vade Kontrolü (Örn. 3 günden az kalanlar)
      try {
        const ceklerDb = getDb('cek_senet');
        const ceklerDocs = await ceklerDb.allDocs({ include_docs: true });
        const now = new Date();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        
        ceklerDocs.rows.forEach(r => {
          const c: any = r.doc;
          if (c.status === 'portfoyde' || c.status === 'bekliyor') {
            const dueDate = new Date(c.dueDate);
            const diff = dueDate.getTime() - now.getTime();
            
            if (diff > 0 && diff <= threeDaysMs && !notifiedSet.has(`cek_${c._id}`)) {
              newNotifications.push({
                id: `cek_${c._id}`,
                type: 'warning',
                category: 'odeme',
                title: 'Yaklaşan Çek Vadesi',
                message: `${c.amount?.toLocaleString('tr-TR')} TL tutarındaki ${c.bank || ''} çekinin vadesine çok az kaldı.`,
                priority: 'high',
                actionUrl: '/finans/cekler'
              });
              notifiedSet.add(`cek_${c._id}`);
            }
          }
        });
      } catch(e) { console.warn("Çek kontrol hatası", e); }

      // Bildirimleri ekle ve kaydet
      if (newNotifications.length > 0) {
        newNotifications.forEach(n => addNotification(n));
        localStorage.setItem(todayKey, JSON.stringify(Array.from(notifiedSet)));
      }
    }

    // İlk kontrol (Hemen)
    setTimeout(checkReminders, 2000);

    // Periyodik kontrol
    const interval = setInterval(checkReminders, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [addNotification]);
}
