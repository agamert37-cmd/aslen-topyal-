import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

// ─── POLYFILL FOR HTTP (No HTTPS) ENVIRONMENTS ─────────────
if (!window.crypto) {
  (window as any).crypto = {};
}
if (!window.crypto.randomUUID) {
  window.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}
// ──────────────────────────────────────────────────────────

// Service Worker kaydı — PWA offline desteği
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      console.info('[SW] Kayıtlı:', reg.scope);

      // Arka plan sync kaydı — sayfa arka plandayken sync tetiklensin
      if ('SyncManager' in window) {
        (reg as any).sync?.register('mert-db-sync').catch(() => {});
      }
    }).catch(err => console.warn('[SW] Kayıt başarısız:', err));

    // Service Worker'dan gelen "sync tetiklendi" mesajını dinle
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
        import('./app/lib/pouchdb').then(({ restartAllSync }) => {
          restartAllSync();
        });
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
