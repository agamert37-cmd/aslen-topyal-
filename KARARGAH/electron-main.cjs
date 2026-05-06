const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, fork } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Arka plan dayanıklılık mekanizması: Uygulamanın kesinlikle çökmemesini sağlamak
process.on('uncaughtException', (err) => {
  console.error('Electron Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Electron Unhandled Rejection:', reason);
});

let mainWindow;
let appTray = null;
let isQuitting = false;
let serverProcess = null;

function startBackgroundServer() {
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  const projectRoot = path.join(__dirname, '..');
  
  // If in production, ensure there's a way to start the server or it might just be static in Electron
  // We'll use tsx to run server.ts or node server.js if it exists
  let serverScript = 'server.ts';
  if (!isDev) {
     if (fs.existsSync(path.join(projectRoot, 'server.js'))) {
       serverScript = 'server.js';
     } else if (fs.existsSync(path.join(projectRoot, 'server.cjs'))) {
       serverScript = 'server.cjs';
     }
  }

  // Use npx tsx in dev, node in prod
  try {
    if (isDev) {
      serverProcess = exec('npx tsx server.ts', { cwd: projectRoot });
    } else {
      serverProcess = exec(`node ${serverScript}`, { cwd: projectRoot });
    }
    
    serverProcess.stdout.on('data', data => console.log(`[SERVER]: ${data}`));
    serverProcess.stderr.on('data', data => console.error(`[SERVER ERR]: ${data}`));
    serverProcess.on('exit', code => console.log(`Background server exited with code ${code}`));
  } catch(e) {
    console.error("Failed to start background server", e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    title: "KARARGAH Operasyon Merkezi",
    // Boğa ikonunu uygulamanın kendisinde pencere ikonu olarak göster
    icon: path.join(__dirname, 'bull.svg'),
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

  // Hide the window instead of closing it, to keep it alive in the background
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // Optional: Görev çubuğunda gizleyip sadece tepside (tray) göstermek için
      // isWin && mainWindow.setSkipTaskbar(true); 
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.isleyenet.karargah');
  
  // Start the backend server for Public Site and Express endpoints
  startBackgroundServer();
  
  createWindow();

  // ----- TRAY (Arka Planda Çalışma & Boğa İkonu) BAŞLANGIÇ -----
  let trayIconPath = path.join(__dirname, 'bull.svg');
  // SVG'den NativeImage oluştur - Windows'ta sorun olmasın diye PNG data URI fallback
  // Basit mavi/lacivert K logolu 16x16 PNG fallback'i
  const fallbackPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZ0lEQVQ4T2NkoBAwUqifYdQABmIYhJ/+//+fwcTExEBPMwYGhkDqGMBwEGk4xDCQZgY2NhZGPn4+BglJCQZ0MTxmMzBxwS1nYGBgZ0B2IR5DcBqCD0zINZgbMDZgDAxMB2ADuIYDBwAAQ04yv6Y7O1IAAAAASUVORK5CYII=';
  
  let trayIcon;
  try {
     trayIcon = nativeImage.createFromPath(trayIconPath);
     if (trayIcon.isEmpty()) {
       trayIcon = nativeImage.createFromDataURL(fallbackPngBase64);
     } else {
       trayIcon = trayIcon.resize({ width: 16, height: 16 });
     }
  } catch(e) {
     trayIcon = nativeImage.createFromDataURL(fallbackPngBase64);
  }

  appTray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Ana Ekranı Göster', 
      click: () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.restore();
            mainWindow.focus();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Uygulamadan Çık (Tamamen Kapat)', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  appTray.setToolTip('KARARGAH Operasyon Merkezi');
  appTray.setContextMenu(contextMenu);
  
  // Sol tıkla gizle / göster togglesi
  appTray.on('click', () => {
    if (mainWindow) {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.restore();
            mainWindow.focus();
        }
    }
  });
  // ----- TRAY BİTİŞ -----

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('window-all-closed', function () {
  // We handle close event in mainWindow to keep it alive in tray.
  // We don't want app to quit when window closes if it's meant to run in background
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

// IPC communication examples for custom title bar (if used)
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on('window-close', () => { 
  if (mainWindow) {
    // Hide instead of close
    mainWindow.hide(); 
  }
});

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
    ? 'set GIT_TERMINAL_PROMPT=0 && git fetch --all && git reset --hard origin/main && git pull origin main --no-edit && docker-compose down && docker-compose up -d --build || docker compose down && docker compose up -d --build'
    : 'env GIT_TERMINAL_PROMPT=0 git fetch --all && git reset --hard origin/main && git pull origin main --no-edit && docker-compose down && docker-compose up -d --build || docker compose down && docker compose up -d --build || sh update.sh';
  
  // Gelişmiş exec ayarları ile stream (Timeout 10dk, maxBuffer limitini çok yüksek tut ki taşmasın)
  const child = exec(cmd, { cwd: path.join(__dirname, '..'), timeout: 600000, maxBuffer: 100 * 1024 * 1024 });

  child.stdout.on('data', (data) => {
    mainWindow.webContents.send('update-log', data.toString());
  });

  child.stderr.on('data', (data) => {
    mainWindow.webContents.send('update-log', `[HATA_VEYA_UYARI]: ${data.toString()}`);
  });

  child.on('close', (code) => {
    mainWindow.webContents.send('update-finished', { success: code === 0 || code === null });
  });
});

ipcMain.handle('docker-update-restart', async (event) => {
  return new Promise((resolve) => {
    // We use "docker compose" instead of the older "docker-compose"
    const isWin = process.platform === 'win32';
    // Fallback: try docker-compose first, if it fails try docker compose
    const cmd = isWin 
      ? 'set GIT_TERMINAL_PROMPT=0 && git fetch --all && git reset --hard origin/main && git pull origin main --no-edit && docker-compose down && docker-compose up -d --build || docker compose down && docker compose up -d --build'
      : 'env GIT_TERMINAL_PROMPT=0 git fetch --all && git reset --hard origin/main && git pull origin main --no-edit && docker-compose down && docker-compose up -d --build || docker compose down && docker compose up -d --build || sh update.sh';
      
    // Gelişmiş exec: 5 dakika timeout (300000ms), 50MB bellek (derleme için)
    exec(cmd, { cwd: path.join(__dirname, '..'), timeout: 300000, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      let combinedLog = '';
      if (stdout) combinedLog += stdout + '\n';
      if (stderr) combinedLog += 'HATA ÇIKTISI:\n' + stderr + '\n';

      if (error) {
        combinedLog += '\nİŞLEM BAŞARISIZ OLDU VEYA UYARILAR VAR. LOG: ' + error.message;
        // Eğer build log taşıyorsa success true/false esnek olmalı, fakat genellikle exit code != 0 error demektir.
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
    if (!command) {
       resolve({ success: false, error: "Boş komut gönderilemez." });
       return;
    }
    
    // Gelişmiş exec ayarları: 1 dakika zaman aşımı, 10MB bellek
    exec(command, { cwd: __dirname, timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
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
