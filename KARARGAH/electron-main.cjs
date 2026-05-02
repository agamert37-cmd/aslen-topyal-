const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    frame: true, // User wants a normal app frame, no custom window bars if we want a native look! "normal bir uygulama istiyorum"
    title: "KARARGAH Operasyon Merkezi",
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false 
    }
  });

  // Check if we are running in dev mode
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    // Port 8080 is where our Vite dev server for Electron is running
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html from dist
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC communication examples for custom title bar (if used)
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

// Local Machine System Stats
ipcMain.handle('get-system-stats', async () => {
  const os = require('os');
  return {
    cpu: os.cpus()[0].model,
    ramTotal: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
    ramFree: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
    uptime: Math.floor(os.uptime()),
    platform: os.platform()
  };
});

// Update & Restart Docker Mechanism
ipcMain.on('run-update', (event) => {
  const isWin = process.platform === 'win32';
  const cmd = isWin 
    ? 'git pull && docker compose down && docker compose up -d --build'
    : 'git pull && sh update.sh';
  
  const child = exec(cmd, { cwd: __dirname });

  child.stdout.on('data', (data) => {
    mainWindow.webContents.send('update-log', data.toString());
  });

  child.stderr.on('data', (data) => {
    mainWindow.webContents.send('update-log', `[HATA]: ${data.toString()}`);
  });

  child.on('close', (code) => {
    mainWindow.webContents.send('update-finished', { success: code === 0 });
  });
});

ipcMain.handle('docker-update-restart', async (event) => {
  return new Promise((resolve) => {
    // We use "docker compose" instead of the older "docker-compose"
    const isWin = process.platform === 'win32';
    // Fallback: try docker-compose first, if it fails try docker compose
    const cmd = isWin 
      ? 'git pull && docker-compose down && docker-compose up -d --build || git pull && docker compose down && docker compose up -d --build'
      : 'sh update.sh';
      
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      let combinedLog = '';
      if (stdout) combinedLog += stdout + '\n';
      if (stderr) combinedLog += 'HATA ÇIKTISI:\n' + stderr + '\n';

      if (error) {
        combinedLog += '\nİŞLEM BAŞARISIZ OLDU. HATA KODU: ' + error.code;
        resolve({ success: false, log: combinedLog || error.message });
        return;
      }
      resolve({ success: true, log: combinedLog || stdout });
    });
  });
});

// AI Server / Local Sync Mechanisms
ipcMain.handle('save-backup-local', async (event, backupData) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Veritabanı Yedeğini Kaydet',
    defaultPath: path.join(app.getPath('documents'), `MertERP_Yedek_${new Date().getTime()}.json`),
    filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
  });
  
  if (canceled) return { success: false, reason: 'canceled' };
  
  try {
    fs.writeFileSync(filePath, backupData, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, reason: error.message };
  }
});

ipcMain.handle('load-backup-local', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Veritabanı Yedeği Yükle',
    filters: [{ name: 'JSON Dosyası', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return { success: false, reason: 'canceled' };

  try {
    const data = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, reason: error.message };
  }
});

// Push to GitHub mechanism script call
ipcMain.handle('sync-github', async (event, token, repoUrl) => {
  return new Promise((resolve) => {
    // Basic conceptual wrapper for pushing backup data
    resolve({ success: true, message: 'Simulated GitHub sync executed.' });
  });
});

// Notifications
ipcMain.on('show-notification', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

const https = require('https');
const { GoogleGenAI } = require('@google/genai');

let ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.error("Gemini initialization failed:", e.message);
  }
}

ipcMain.handle('ask-ai', async (event, prompt) => {
  if (!process.env.GEMINI_API_KEY || !ai) {
     return { success: false, message: 'Sunucuda / Sistemde GEMINI_API_KEY tanımlı değil!' };
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return { success: true, text: response.text };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Telegram Bot Integration
ipcMain.handle('telegram-send-message', async (event, token, chatId, message) => {
  return new Promise((resolve) => {
    if (!token || !chatId) {
      resolve({ success: false, message: 'Telegram Token or Chat ID is missing.' });
      return;
    }
    
    const data = JSON.stringify({
      chat_id: chatId,
      text: message
    });
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, response: JSON.parse(responseBody) });
        } else {
          resolve({ success: false, message: `Telegram Error: ${res.statusCode} ${responseBody}` });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, message: `Request Error: ${error.message}` });
    });
    
    req.write(data);
    req.end();
  });
});

ipcMain.handle('exec-command', async (event, command) => {
  return new Promise((resolve) => {
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout ? stdout.toString() : '',
        stderr: stderr ? stderr.toString() : '',
        error: error ? error.message : null
      });
    });
  });
});

let monitoringInterval = null;

ipcMain.handle('start-monitoring', (event, url, token, chatId, intervalMs = 60000) => {
  if (monitoringInterval) clearInterval(monitoringInterval);
  
  monitoringInterval = setInterval(() => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        // Send alert
        const msg = `🚨 UYARI! Sistem cevap vermiyor.\nURL: ${url}\nKod: ${res.statusCode}`;
        ipcMain.emit('telegram-send-message', null, token, chatId, msg);
      }
    }).on('error', (e) => {
       const msg = `⚠️ UYARI! Sisteme ulaşılamıyor (Çökmüş olabilir).\nURL: ${url}\nHata: ${e.message}`;
       // Try sending telegram
       const postData = JSON.stringify({ chat_id: chatId, text: msg });
       const req = https.request({
         hostname: 'api.telegram.org',
         port: 443,
         path: `/bot${token}/sendMessage`,
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
       });
       req.write(postData);
       req.end();
    });
  }, intervalMs);
  
  return { success: true, message: 'Monitoring started' };
});

ipcMain.handle('stop-monitoring', () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  return { success: true };
});
