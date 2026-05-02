export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getSystemStats: () => Promise<{ cpu: string; ramTotal: number; ramFree: number; uptime: number; platform: string }>;
      dockerUpdateRestart: () => Promise<{ success: boolean; log: string }>;
      saveBackupLocal: (backupData: string) => Promise<{ success: boolean; path?: string; reason?: string }>;
      loadBackupLocal: () => Promise<{ success: boolean; data?: string; reason?: string }>;
      syncGithub: (token: string, repoUrl: string) => Promise<{ success: boolean; message: string }>;
      showNotification: (title: string, body: string) => void;
      telegramSendMessage: (token: string, chatId: string, message: string) => Promise<{ success: boolean; message: string }>;
      execCommand: (command: string) => Promise<{ success: boolean; stdout: string; stderr: string; error: string | null }>;
      askAi: (prompt: string) => Promise<{ success: boolean; text?: string; message?: string }>;
      startMonitoring: (url: string, token: string, chatId: string, interval: number) => Promise<{ success: boolean; message: string }>;
      stopMonitoring: () => Promise<{ success: boolean }>;
    };
  }
}
