import { useState, useEffect } from 'react';
import { getAllSyncStatuses, TableSyncState } from '../lib/pouchdb';

export function usePouchSyncStatus() {
  const [statuses, setStatuses] = useState<TableSyncState[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Initial fetch
    setStatuses(getAllSyncStatuses());

    const handleSyncStatus = () => {
      setStatuses(getAllSyncStatuses());
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('pouchdb_sync_status', handleSyncStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check just in case
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('pouchdb_sync_status', handleSyncStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const totalPending = statuses.reduce((acc, s) => acc + (s.pending || 0), 0);
  const isSyncing = statuses.some(s => s.status === 'active' && s.pending && s.pending > 0);
  const errorCount = statuses.filter(s => s.status === 'error').length;

  return {
    isOnline,
    totalPending,
    isSyncing,
    errorCount,
    statuses
  };
}
