import { useState, useEffect } from 'react';

/**
 * useDayControl - Gün sonu kapatma durumunu merkezi olarak yöneten hook.
 * localStorage'ı dinler ve tüm sekmeler/bileşenler arasında senkronizedir.
 */
export function useDayControl() {
  const [isDayClosed, setIsDayClosed] = useState(() => {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`isleyen_et_gun_sonu_${todayISO}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.closed === true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkDay = () => {
      try {
        const todayISO = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem(`isleyen_et_gun_sonu_${todayISO}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setIsDayClosed(parsed.closed === true);
        } else {
          setIsDayClosed(false);
        }
      } catch {
        setIsDayClosed(false);
      }
    };

    // storage_update (özel) ve storage (standart sekmeler arası) eventlerini dinle
    window.addEventListener('storage_update', checkDay);
    window.addEventListener('storage', checkDay);
    
    // Periyodik kontrol (emniyet kemeri)
    const interval = setInterval(checkDay, 30000);
    
    return () => {
      window.removeEventListener('storage_update', checkDay);
      window.removeEventListener('storage', checkDay);
      clearInterval(interval);
    };
  }, []);

  return { isDayClosed };
}

export const checkIsDayClosedSync = (): boolean => {
  try {
    const todayISO = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`isleyen_et_gun_sonu_${todayISO}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.closed === true;
    }
    return false;
  } catch {
    return false;
  }
};
