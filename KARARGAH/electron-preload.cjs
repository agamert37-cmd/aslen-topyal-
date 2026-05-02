const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Data Sync & Export APIs
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  dockerUpdateRestart: () => ipcRenderer.invoke('docker-update-restart'),
  saveBackupLocal: (backupData) => ipcRenderer.invoke('save-backup-local', backupData),
  loadBackupLocal: () => ipcRenderer.invoke('load-backup-local'),
  syncGithub: (token, repoUrl) => ipcRenderer.invoke('sync-github', token, repoUrl),
  
  // Custom Desktop capabilities
  showNotification: (title, body) => ipcRenderer.send('show-notification', title, body),
  telegramSendMessage: (token, chatId, message) => ipcRenderer.invoke('telegram-send-message', token, chatId, message),
  execCommand: (command) => ipcRenderer.invoke('exec-command', command),
  askAi: (prompt) => ipcRenderer.invoke('ask-ai', prompt),
  startMonitoring: (url, token, chatId, interval) => ipcRenderer.invoke('start-monitoring', url, token, chatId, interval),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  
  isElectron: true
});
