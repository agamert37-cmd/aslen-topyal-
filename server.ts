import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import os from "os";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GoogleGenAI } from "@google/genai";

// Sunucunun beklenmedik hatalarda çökmesini önlemek için global hata yakalayıcılar
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION: Mühim bir hata oluştu ancak sunucu ayakta tutuluyor.', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION: Beklenmeyen bir promise hatası!', reason);
});

async function startServer() {
  const app = express();
  
  // Custom port configurator from file
  let customPort = 3000;
  const configPath = path.join(process.cwd(), "server-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed.port) customPort = parsed.port;
    } catch (e) {
      console.error("Config parse error", e);
    }
  }

  // AI Studio enforces port 3000, but local desktop can use customized port.
  // By defaulting to process.env.PORT, platforms can override it if needed.
  // Actually, we'll try to listen on customPort, except if we are explicitly forced by AI Studio proxy (which usually ignores what we bind locally and maps port 3000 to external 80/443).
  // Inside docker/cloud run, process.env.PORT is provided.
  const PORT = process.env.PORT || customPort;

  // CouchDB Proxy - CORS hatalarını önlemek için Express üzerinden geçiş
  const couchDbTarget = process.env.VITE_COUCHDB_URL || "http://127.0.0.1:5984";
  app.use(
    "/couchdb",
    (createProxyMiddleware as any)({
      target: couchDbTarget,
      changeOrigin: true,
      pathRewrite: {
        "^/couchdb": "", // remove /couchdb path before forwarding to CouchDB
      },
      ws: true, // Websockets for Sync (if needed)
      onError: (err: any, req: any, res: any) => {
        console.error("CouchDB Proxy Error:", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "CouchDB'ye erişilemiyor", details: err.message }));
      },
    })
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // KARARGAH Terminal / Shell Exec Endpoint
  app.post("/api/exec", (req, res) => {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: "Boş komut gönderilemez." });
    }
    
    // Gelişmiş exec ayarları: 1 dakika zaman aşımı, 10MB bellek üst limiti
    exec(command, { cwd: process.cwd(), timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      res.json({
        success: !error,
        stdout: stdout ? stdout.toString() : "",
        stderr: stderr ? stderr.toString() : "",
        error: error ? error.message : null,
      });
    });
  });

  // Check version
  app.get("/api/version", (req, res) => {
    exec("git log -1 --pretty=%B", { cwd: process.cwd(), timeout: 10000 }, (error, stdout) => {
      res.json({
        success: !error,
        latestCommit: stdout ? stdout.toString().trim() : "Bilinmiyor",
      });
    });
  });

  // Save server config (Port vb.)
  app.post("/api/server-config", (req, res) => {
    const { port } = req.body;
    try {
      const configPath = path.join(process.cwd(), "server-config.json");
      let current: any = {};
      if (fs.existsSync(configPath)) {
        current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      if (port) current.port = Number(port);
      fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
      res.json({ success: true, message: "Port güncellendi. Sistem yeniden başlattıktan sonra aktif olacaktır." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Get server config
  app.get("/api/server-config", (req, res) => {
    try {
      const configPath = path.join(process.cwd(), "server-config.json");
      if (fs.existsSync(configPath)) {
        const current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json({ success: true, config: current });
      } else {
        res.json({ success: true, config: { port: 3000 } });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/update", (req, res) => {
    const { repoUrl, targetDir, branch = "main", clearCache = false, reBuild = true, restartService = true } = req.body;
    const cwd = targetDir || process.cwd();

    let cmdParts = [
      "echo '>>> Güncelleme süreci başlatılıyor...'",
      "git stash",
      "git fetch --all",
      `git reset --hard origin/${branch} || git reset --hard origin/master`
    ];

    if (clearCache) {
      cmdParts.push("echo '>>> NPM önbelleği temizleniyor...'");
      cmdParts.push("npm cache clean --force");
      cmdParts.push("rm -rf node_modules/.vite || true");
    }

    cmdParts.push("echo '>>> Bağımlılıklar yükleniyor...'");
    cmdParts.push("npm install --no-fund --no-audit --omit=optional");

    if (reBuild) {
      cmdParts.push("echo '>>> Uygulama derleniyor (Build)...'");
      cmdParts.push("npm run build");
    }

    if (restartService) {
      cmdParts.push("echo '>>> Servisler yeniden başlatılıyor...'");
      cmdParts.push("(pm2 reload all || docker-compose restart || echo 'PM2/Docker bulunamadı, manuel restart gerekebilir')");
    }

    const cmd = cmdParts.join(" && ");
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    res.write(`Hedef Dizin: ${cwd}\nAktif Dal (Branch): ${branch}\nÖnbellek Temizliği: ${clearCache ? 'Açık' : 'Kapalı'}\nDerleme (Build): ${reBuild ? 'Açık' : 'Kapalı'}\nServis Restart: ${restartService ? 'Açık' : 'Kapalı'}\n\n`);

    const { spawn } = require('child_process');
    
    const child = spawn(cmd, { cwd, shell: true, timeout: 600000 }); // 10 dakika izin ver

    child.stdout.on('data', (data: Buffer) => {
      res.write(data.toString());
    });

    child.stderr.on('data', (data: Buffer) => {
      res.write(data.toString());
    });

    child.on('close', (code: number) => {
      res.write(`\n--- İşlem tamamlandı. Çıkış kodu [${code}] ---`);
      res.end();
    });

    child.on('error', (err: Error) => {
      res.write(`\n--- KRİTİK HATA: ${err.message} ---`);
      res.end();
    });
  });

  // Get locally installed projects from C:\Proje or Desktop\Proje
  app.get("/api/projects", (req, res) => {
    try {
      const baseDir1 = "C:\\Proje";
      const baseDir2 = path.join(os.homedir(), "Desktop", "Proje");
      const dirs: string[] = [];

      [baseDir1, baseDir2].forEach(bd => {
        if (fs.existsSync(bd)) {
          const items = fs.readdirSync(bd);
          items.forEach(item => {
            const fullPath = path.join(bd, item);
            if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, "package.json"))) {
              dirs.push(fullPath);
            }
          });
        }
      });
      res.json({ success: true, projects: dirs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // System stats
  app.get("/api/stats", (req, res) => {
    res.json({
      cpu: os.cpus()[0].model,
      ramTotal: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
      ramFree: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
      uptime: Math.floor(os.uptime()),
      platform: os.platform()
    });
  });

  // AI Chat Endpoint with Gemini
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, systemPrompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
          temperature: 0.2, // Low temp for more accurate data entry parsing
        }
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "AI Yanıt oluşturamadı.", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Express Global Hata Yakalayıcı (Rotasyonlarda olan hataların sunucuyu çökertmemesi için)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Error:", err);
    res.status(500).json({ error: "Sunucu içi bir hata oluştu, ancak sunucu çalışmaya devam ediyor." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
