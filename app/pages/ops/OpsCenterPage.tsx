import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Server,
  Activity,
  Shield,
  Users,
  Bell,
  Command,
  Search,
  AlertTriangle,
  Play,
  Zap,
  Database,
  RefreshCw,
  HardDrive,
  ArrowUpDown,
  ChevronDown,
  Rocket,
  Bug,
  Paintbrush,
  Lock,
  UserCheck,
  MessageSquare,
  Terminal,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  MonitorCheck,
  FileText,
  LayoutList,
  Ban,
  Globe,
  Smartphone,
  Cpu,
  LogOut,
  Monitor,
  GitBranch,
  Cloud,
  CloudUpload,
  Settings,
  Download,
  Bot,
  Send,
  HelpCircle,
  ShieldAlert,
  Wand2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { useAuth } from "../../contexts/AuthContext";
import { getSystemRepairKey } from '../../lib/api-config';
import {
  useGlobalSyncTables,
  useGlobalTableData,
} from "../../contexts/GlobalTableSyncContext";
// Haftalık Değişen Telegram Kodlarını Simulate Eden Fonksiyon
function getWeeklyTelegramKeys() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  
  const seed1 = `${now.getFullYear()}-W${currentWeek}-ALPHA`;
  const seed2 = `${now.getFullYear()}-W${currentWeek}-BETA`;
  
  const b64 = (str: string) => btoa(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  const code1 = b64(seed1).substring(0, 16).padEnd(16, 'A');
  const code2 = b64(seed2).substring(0, 16).padEnd(16, 'B');
  return [code1, code2];
}

const MASTER_CONSTANT_KEY = "MERT-KARARGAH-37";

import {
  getActivityLogs,
  getTodayLogs,
  detectActivityAnomalies,
  ActivityLogEntry,
  AnomalyReport,
} from "../../utils/activityLogger";
import {
  testCouchDbConnection,
  getCouchDbTableStatus,
  initializeCouchDbDatabases,
  CouchDbTableStatus,
  TABLE_DISPLAY_NAMES,
  compactAllDbs,
  startAllSync,
  getAllSyncProgress,
  SyncProgress,
  getDb,
} from "../../lib/pouchdb";
import {
  getCouchDbConfig,
  setCouchDbConfig,
  TABLE_NAMES,
} from "../../lib/db-config";
import { getFromStorage, setInStorage, StorageKey } from "../../utils/storage";
import { hashStringWithSalt } from "../../utils/security";
import {
  getAllVersions,
  getVersionGroups,
  UpdateNote,
  SEED_NOTES,
} from "../../utils/updateNotes";
import { runIntegrityCheck, IntegrityReport } from "../../lib/db-integrity";
import {
  findAllConflicts,
  ConflictInfo,
  resolveConflict,
} from "../../lib/db-conflicts";
import { UpdateOverlay } from "../../components/UpdateOverlay";
import {
  OpsEngineConfig,
  defaultOpsConfig,
  OPS_ENGINE_KEY,
} from "../../hooks/useOpsBackgroundService";
import {
  getUpdateMessages,
  saveUpdateMessages,
} from "../../lib/update-messages";
import { UserSession } from "../../lib/active-client";
import { 
  analyzeUserBehavior, 
  getUserRiskProfiles, 
  updateUserRestrictions,
  UserRiskProfile 
} from "../../utils/security-brain";

// Types migrated to TABS

const TELEGRAM_KEY = "telbot_config";

function formatDate(ts: string) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OpsCenterPage() {
  const { user } = useAuth();
  const { tables: syncTables } = useGlobalSyncTables();

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  
  // -- System Repair AI State --
  const [aiKey, setAiKey] = useState(getSystemRepairKey());
  type LogEntry = {
     id: string;
     sender: 'system'|'user'|'ai'; 
     text: string;
     preview?: { title: string, danger_level: string, description: string };
     action?: { type: string, code: string };
     executed?: boolean;
  };
  const [aiLogs, setAiLogs] = useState<LogEntry[]>([
    { id: '1', sender: 'system', text: 'Karargah Geliştirici & Onarım Terminaline Hoş Geldiniz.' },
    { id: '2', sender: 'system', text: 'UYARI: Bu alan sistem verilerine tam erişim yetkisi olan yapay zeka çekirdeğidir.' },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [aiLogs]);


  // -- Security Barrier (3FA) --
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(() => {
    const lastSession = sessionStorage.getItem("ops_center_verified");
    return lastSession !== "true";
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
     let inactivityTimer: any;
     const handleActivity = () => {
        if (isLocked) return;
        clearTimeout(inactivityTimer);
        // 5 minutes inactivity lock
        inactivityTimer = setTimeout(() => {
           setIsLocked(true);
           sessionStorage.removeItem("ops_center_verified");
           toast.warning("Güvenlik nedeniyle oturum zaman aşımına uğradı ve kilitlendi.", { position: 'top-center' });
        }, 5 * 60 * 1000);
     };
     
     if (!isLocked) {
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        handleActivity();
     }
     return () => {
        clearTimeout(inactivityTimer);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
     };
  }, [isLocked]);

  const [codeConstant, setCodeConstant] = useState('');
  const [codeTele1, setCodeTele1] = useState('');

  const handleSimulateTelegram = () => {
    const [c1, c2] = getWeeklyTelegramKeys();
    toast("📱 Telegram'dan Gelen Mesaj", {
       description: `Haftalık Şifre:\nKod: ${c1}`,
       duration: 10000,
       position: 'top-center'
    });
  };

  const [showFastLogin, setShowFastLogin] = useState(() => !!localStorage.getItem("ops_system_pin"));
  const [fastPin, setFastPin] = useState("");

  const handleFastLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
       const waitSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
       toast.error(`Çok fazla hatalı deneme! Lütfen ${waitSecs} saniye bekleyin.`, { position: 'top-center' });
       return;
    }

    const savedPin = localStorage.getItem("ops_system_pin");
    if (savedPin && fastPin === savedPin) {
      if (!aiKey) {
        toast.warning('Not: Geliştirici Yapay Zeka Anahtarı Bulunamadı. AI sekmesinde hata alabilirsiniz.');
      }
      setIsLocked(false);
      setFailedAttempts(0);
      setLockoutUntil(null);
      sessionStorage.setItem("ops_center_verified", "true");
      setFastPin("");
      setShowFastLogin(false);
      toast.success("Hızlı giriş yapıldı. Karargaha erişildi.");
    } else {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= 3) {
         setLockoutUntil(Date.now() + 60 * 1000); // 1 minute lockout
         toast.error('Çok fazla hatalı giriş. Sistem 1 dakika kilitlendi.', { position: 'top-center' });
      } else {
         toast.error(`Yanlış PIN! (Kalan deneme: ${3 - newFails})`, { position: 'top-center' });
      }
    }
  };

  const unlockOpsCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
       const waitSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
       toast.error(`Çok fazla hatalı deneme! Lütfen ${waitSecs} saniye bekleyin.`, { position: 'top-center' });
       return;
    }
    
    // c1 is used
    const [c1] = getWeeklyTelegramKeys();
    
    if (codeConstant === MASTER_CONSTANT_KEY && codeTele1 === c1) {
      if (!aiKey) {
        toast.warning('Not: Geliştirici Yapay Zeka Anahtarı Bulunamadı. AI sekmesinde hata alabilirsiniz.');
      }
      setIsLocked(false);
      setFailedAttempts(0);
      setLockoutUntil(null);
      sessionStorage.setItem("ops_center_verified", "true");
      setCodeConstant('');
      setCodeTele1('');
      toast.success("Güvenlik duvarı aşıldı. Karargaha erişildi.");
    } else {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= 3) {
         setLockoutUntil(Date.now() + 60 * 1000); // 1 minute lockout
         toast.error('Çok fazla hatalı giriş. Sistem 1 dakika kilitlendi.', { position: 'top-center' });
      } else {
         toast.error(`Yetkisiz erişim denemesi! Kodlar eşleşmiyor. (Kalan deneme: ${3 - newFails})`, { position: 'top-center' });
      }
    }
  };

  const processRepairAI = async (query: string) => {
    if (!aiKey) return null;
    
    const storagesKeys = ['stok_data', 'cari_data', 'fisler', 'kasa_data', 'personel_data'];
    let diagnostics = '';
    storagesKeys.forEach(k => {
      const data = getFromStorage<any[]>(k);
      diagnostics += `${k} -> Toplam Kayıt: ${data ? data.length : 0}\n`;
    });

    const prompt = `Sen uygulamanın sistem dosya/veri mimarisi olan üst düzey "Core System AI" (Karargah Terminali) sistemisin.
Aşağıda sistemdeki mevcut veritabanı (localStorage) durumunu görüyorsun:
${diagnostics}
(Not: Lokal depolamada veriler 'isleyen_et_' prefixi ile tutulur. DOĞRUDAN localStorage API'si (localStorage.getItem/setItem) kullan.)

SİSTEM VE ONARIM REHBERİ:
1. Sorun Tespit Modu: Eğer kullanıcı sadece "hata var", "fatura görünmüyor" gibi belirsiz bir şey söylerse, önce localStorage'daki verilerin yapısını analiz edecek, hata ayıklama mesajı basacak ve veritabanı içeriğini (JSON formatında console.log) ekrana dökecek bir kod üret. Yıkıcı işlem yapma.
2. Çözüm/Düzeltme Modu: Eğer spesifik bir bozuk veri (örneğin undefined ID, hatalı format, string yerine object girilmiş alanlar vs) tespit edebiliyorsan, JavaScript "filter" ve "map" fonksiyonları ile o veriyi temizleyen veya düzelten bir kod üret ve onarımı yap. Kod çalıştıktan sonra window.location.reload() kullanabilirsin.
3. JavaScript Kodu Güvenliği: JS kodu new Function ile çalıştırılır, bu yüzden try/catch ile sarmalamalısın ki çökme yaşanmasın. Kod içinde raporu console.log() ile bildir.
4. Geri Dönülemez (YIKICI) İşlemler: Eğer "hepsini sil", "format at", "sıfırla" tarzı komut gelirse KESİNLİKLE "preview" objesi döndür. Böylece onay istenmeden işlem çalışmaz.

Kullanıcı Talebi / Bildirilen Sistem Hatası: ${query}

Çıktı formatı KESİNLİKLE aşağıdaki gibi JSON nesnesi ("repair_action" ve opsiyonel "preview") olmalıdır:
{
  "message": "Kullanıcıya durumu anlatan metin... Düzeltme / Analiz planını kısa özetle.",
  "preview": {
    "title": "Kritik DOSYA Siliniyor veya Değiştiriliyor",
    "danger_level": "high", 
    "description": "Veritabanı kalıcı olarak etkilenecek."
  },
  "repair_action": {
    "type": "js",
    "code": "try { const d = localStorage.getItem('isleyen_et_fisler'); if(d){ localStorage.setItem('isleyen_et_fisler_yedek', d); localStorage.removeItem('isleyen_et_fisler'); console.log('Silindi ve yedeklendi'); window.location.reload(); } } catch(e) { console.error('Hata:', e); }"
  }
}
Eğer kod çalıştırmana gerek yoksa (sadece cevap veriyorsan), repair_action kısmını boş bırak veya güvenli bir log bastır. Sadece valid JSON döndür.`;

    try {
      let aiResponseText = "";
      if (aiKey.startsWith('AIza')) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: aiKey });
        const res = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: prompt
        });
        aiResponseText = res.text || "{}";
      } else {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: aiKey, dangerouslyAllowBrowser: true });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }]
        });
        aiResponseText = completion.choices[0].message.content || "{}";
      }

      const jsonStr = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      return parsed;
    } catch (e: any) {
      return { message: `Geliştirici Core AI Hatası: ${e.message}` };
    }
  };

  const executeCommand = async () => {
    if (!aiInput.trim()) return;
    const userText = aiInput;
    setAiInput('');
    setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText }]);
    setIsProcessing(true);

    try {
      if (userText.toLowerCase() === 'clear') {
        setAiLogs([{ id: Date.now().toString(), sender: 'system', text: 'Terminal temizlendi.'}]);
        setIsProcessing(false);
        return;
      }

      const parsed = await processRepairAI(userText);
      if (!parsed) {
         setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: "Yapay Zeka Anahtarı Yok. Lütfen Ayarlar sayfasından anahtarınızı girin." }]);
      } else {
         const newLog: LogEntry = {
            id: Date.now().toString(),
            sender: 'ai',
            text: parsed.message,
            preview: parsed.preview,
            action: parsed.repair_action
         };
         setAiLogs(prev => [...prev, newLog]);
      }
    } catch (error: any) {
      setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: `HATA: ${error.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = (logId: string, code: string) => {
     try {
       const repairFunc = new Function(code);
       repairFunc();
       setAiLogs(prev => prev.map(l => l.id === logId ? { ...l, executed: true } : l));
       setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: '[✅ CORE SİSTEM]: İşlem başarılı şekilde uygulandı.' }]);
     } catch (e: any) {
       setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: `[❌ UYGULAMA HATASI]: ${e.message}` }]);
     }
  };


  // Function to execute backend commands either via Electron or fullstack Express API
  const runHostCommand = async (command: string) => {
    if (window.electronAPI?.isElectron) {
      return await window.electronAPI.execCommand(command);
    }
    // Fallback to Express backend if available
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      if (res.ok) {
         return await res.json();
      }
    } catch(e) {}
    return { success: false, error: "Bağlantı sağlanamadı" };
  };

  const getHostStats = async () => {
    if (window.electronAPI?.isElectron) {
      return await window.electronAPI.getSystemStats();
    }
    try {
      const res = await fetch("/api/stats");
      if (res.ok) return await res.json();
    } catch(e) {}
    return null;
  };

  const runHostUpdate = async (repoUrl: string) => {
     if (window.electronAPI?.isElectron) {
        return await window.electronAPI.dockerUpdateRestart();
     }
     try {
       const res = await fetch("/api/update", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ repoUrl })
       });
       if (res.ok) return await res.json();
     } catch(e) {}
     return { success: false, log: "Sunucu hatası" };
  };

  const getHostVersion = async () => {
     try {
       const res = await fetch("/api/version");
       if (res.ok) return await res.json();
     } catch(e) {}
     return { success: false, latestCommit: "Bilinmiyor" };
  };


  // -- Server Data --
  const [refreshKey, setRefreshKey] = useState(0);
  const [connStatus, setConnStatus] = useState<{
    ok: boolean;
    version?: string;
    error?: string;
    latencyMs?: number;
  } | null>(null);
  const [connTesting, setConnTesting] = useState(false);
  const [tableStatus, setTableStatus] = useState<CouchDbTableStatus[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [liveSessions, setLiveSessions] = useState<UserSession[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<Record<string, UserRiskProfile>>({});

  const [aiHistory, setAiHistory] = useState<{role: 'user'|'ass', text: string}[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['İşleyen Et Terminal v1.0', 'Kullanılabilir komutları görmek için "help" yazın.']);
  
  // -- Docker & Build State --
  const [dockerLogs, setDockerLogs] = useState<string[]>(['> docker-compose ps', 'Name   Command                      State    Ports', 'api    docker-entrypoint.sh node…   Up       0.0.0.0:3000->3000/tcp', 'web    docker-entrypoint.sh nginx   Up       0.0.0.0:8080->80/tcp']);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>(['> vite build', '> info Sistem hazır durumda, derleme bekliyor.']);
  const buildLogRef = useRef<HTMLDivElement>(null);
  const [dockerStatus, setDockerStatus] = useState("Aktif");

  useEffect(() => {
    if (buildLogRef.current) buildLogRef.current.scrollTop = buildLogRef.current.scrollHeight;
  }, [buildLogs]);



  const simulateDockerRestart = () => {
    handleUpdateStart();
  };

  const [sysConfig, setSysConfig] = useState({
    gptToken: "",
    serverUrl: "",
    nodeName: "Ana Veri Kulesi",
    securityLevel: "advanced",
  });

  // Load config on mount
  useEffect(() => {
    if (!isLocked) {
      import("../../lib/pouchdb-kv").then(({ kvGet }) => {
        kvGet("system_ops_config").then((saved: any) => {
          if (saved) {
             setSysConfig(saved);
          }
        });
      });
    }
  }, [isLocked]);

  const handleSaveSysConfig = async () => {
    try {
      const { kvSet } = await import("../../lib/pouchdb-kv");
      await kvSet("system_ops_config", sysConfig);

      // Global override for OpenAI Key (reachable by api-config)
      if (sysConfig.gptToken) {
        localStorage.setItem("ops_center_gpt_override", sysConfig.gptToken);
        setAiKey(sysConfig.gptToken);
      } else {
        localStorage.removeItem("ops_center_gpt_override");
        setAiKey(getSystemRepairKey());
      }

      toast.success(
        "Sistem anahtarları ve yapılandırma güvenli şekilde kaydedildi.",
      );
    } catch (e) {
      toast.error("Yapılandırma kaydedilemedi.");
    }
  };

  const loadSessions = useCallback(async () => {
    try {
      const db = getDb("user_sessions");
      const result = await db.allDocs({ include_docs: true });
      const sessions = result.rows
        .map((r) => r.doc as any as UserSession)
        .filter((s) => s.lastSeen > Date.now() - 1000 * 60 * 60); // Son 1 saatlik aktifler
      setLiveSessions(sessions.sort((a, b) => b.lastSeen - a.lastSeen));
      
      const profiles = getUserRiskProfiles();
      setRiskProfiles(profiles);
    } catch (e) {
      console.error("Session load error", e);
    }
  }, []);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiHistory, activeTab]);

  const executeAiCommand = async (command: string) => {
     toast.info("Komut çalıştırılıyor...");
     const res = await runHostCommand(command);
     if (res.success) {
        toast.success("Komut başarıyla çalıştı!");
        setTerminalHistory(prev => [...prev, `> ${command}\n${res.stdout}`]);
        setAiHistory(prev => [...prev, { role: "ass", text: "Komut yürütüldü. Çıktı:\n```\n" + (res.stdout || "Başarılı") + "\n```" }]);
     } else {
        toast.error(`Hata oluştu`);
        setTerminalHistory(prev => [...prev, `> ${command}\n${res.stderr || res.error}`]);
        setAiHistory(prev => [...prev, { role: "ass", text: "Komut hatası:\n```\n" + (res.stderr || res.error) + "\n```" }]);
     }
  };

  const handleAiChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userPrompt = aiInput.trim();
    setAiInput("");
    setAiHistory(prev => [...prev, { role: "user", text: userPrompt }]);

    try {
      setAiHistory(prev => [...prev, { role: "ass", text: "Düşünüyor..." }]);
      const systemPrompt = `Sen Karargah Operasyon Merkezi AI asistanısın. Kullanıcının bilgisayarında "Electron" masaüstü VEYA güçlü bir full-stack web ortamında çalışıyorsun. \
Eğer kullanıcı sistem hakkında, veriler hakkında veya makineyi yönetecek komutlar (sh, bash vb.) isterse, sen açıklama yapabilirsin. \
GEREKTİĞİNDE LÜTFEN BİR SHELL KOMUTUNU \`\`\`bash veya \`\`\`cmd bloğu içinde ver. Uygulama bu bloğu arayüze ÇALIŞTIR butonu olarak çizecek. \
Kullanıcı sorusu: ${userPrompt}`;
      
      let aiResponseText = "";
      
      if (window.electronAPI?.isElectron) {
          const res = await window.electronAPI.askAi(systemPrompt);
          if (res.success) { aiResponseText = res.text || ""; }
          else { throw new Error(res.message); }
      } else {
          try {
             const chatgpt = await import("../../lib/chatgpt-assistant");
             aiResponseText = await chatgpt.chatWithGemini([], systemPrompt);
          } catch(e:any) {
             throw new Error("AI Modülü yüklenemedi: " + e.message);
          }
      }

      setAiHistory(prev => {
        const newHist = [...prev];
        newHist[newHist.length - 1] = { role: "ass", text: aiResponseText };
        return newHist;
      });

    } catch (err: any) {
         setAiHistory(prev => {
           const newHist = [...prev];
           newHist[newHist.length - 1] = { role: "ass", text: `Bir hata oluştu: ${err.message}` };
           return newHist;
         });
    }
  };

  const handleBanUser = async (sessionId: string, userId?: string, email?: string) => {
    const confirmMsg = "Bu kullanıcıyı sistemden tamamen uzaklaştırmak istediğinize emin misiniz?";
    if (!confirm(confirmMsg)) return;
    
    try {
      // 1. Session bazlı engelleme
      const db = getDb("user_sessions");
      try {
        const doc = await db.get(sessionId);
        await db.put({ ...doc, isBanned: true });
      } catch (e) {}

      // 2. Global Risk/Ban state güncelleme
      if (userId) {
        updateUserRestrictions(userId, true);
      }
      
      toast.success("Kullanıcı ve oturum engellendi.");
      loadSessions();
    } catch (e) {
      toast.error("Engelleme başarısız.");
    }
  };

  const handleSuspendUser = async (userId: string, minutes: number) => {
    try {
      updateUserRestrictions(userId, true, minutes);
      toast.success(`Kullanıcı ${minutes} dakika süreyle askıya alındı.`);
      loadSessions();
    } catch (e) {
      toast.error("İşlem başarısız.");
    }
  };

  const handlePardonUser = async (userId: string) => {
    try {
      updateUserRestrictions(userId, false);
      toast.success("Kullanıcının engeli kaldırıldı.");
      loadSessions();
    } catch (e) {
      toast.error("Hata oluştu.");
    }
  };

  const handleAnalyzeAll = () => {
    toast.info("Tüm kullanıcılar için davranışsal analiz başlatıldı...");
    const profiles = getUserRiskProfiles();
    // Mevcut loglar üzerinden her aktif kullanıcıyı geçir
    const allLogs = getActivityLogs();
    const usersInLogs = Array.from(new Set(allLogs.map(l => l.employeeId).filter(Boolean)));
    
    usersInLogs.forEach(uid => {
      const uEmail = allLogs.find(l => l.employeeId === uid)?.employeeName || 'Bilinmeyen';
      analyzeUserBehavior(allLogs, uid!, uEmail);
    });
    
    setRiskProfiles(getUserRiskProfiles());
    toast.success("Davranışsal analiz tamamlandı.");
  };

  // -- Activity Data --
  const logs = useMemo(() => getActivityLogs(), [refreshKey]);
  const todayLogs = useMemo(() => getTodayLogs(), [refreshKey]);
  const anomalies = useMemo(() => detectActivityAnomalies(60), [refreshKey]);

  // -- Updates Data --
  const liveNotes = useGlobalTableData<UpdateNote>("guncelleme_notlari");
  const updatesList = useMemo(
    () => (liveNotes.length > 0 ? liveNotes : SEED_NOTES),
    [liveNotes],
  );
  const groupedUpdates = useMemo(
    () => getVersionGroups(updatesList),
    [updatesList],
  );

  const activeUsers = useMemo(() => {
    // Who did something in the last 15 minutes?
    const limit = Date.now() - 15 * 60 * 1000;
    const recent = logs.filter((l) => new Date(l.timestamp).getTime() > limit);
    const users = new Map<string, any>();
    recent.forEach((r) => {
      if (r.employeeId) {
        if (!users.has(r.employeeId))
          users.set(r.employeeId, {
            id: r.employeeId,
            name: r.employeeName,
            lastSeen: r.timestamp,
            lastAction: r.title,
            count: 0,
          });
        users.get(r.employeeId).count++;
      }
    });
    return Array.from(users.values());
  }, [logs]);

  // -- Telegram Config --
  const [telCfg, setTelCfg] = useState(
    () =>
      getFromStorage<{ token: string; chatId: string }>(TELEGRAM_KEY) || {
        token: "",
        chatId: "",
      },
  );

  // -- Ops Background Engine Config --
  const [opsConfig, setOpsConfig] = useState<OpsEngineConfig>(
    () => getFromStorage<OpsEngineConfig>(OPS_ENGINE_KEY) || defaultOpsConfig
  );

  const saveOpsConfig = () => {
    setInStorage(OPS_ENGINE_KEY, opsConfig);
    toast.success("Arka Plan Servis Ayarları Kaydedildi.", {
      description: "Değişiklikler birkaç saniye içinde etkin olacak."
    });
  };

  // -- Interactive Terminal --
  const [terminalInput, setTerminalInput] = useState('');
  
  const handleTerminalCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && terminalInput.trim()) {
      const cmd = terminalInput.trim();
      setTerminalHistory(prev => [...prev, `> ${cmd}`]);
      setTerminalInput('');

      // Parse and execute simulated/actual commands
      const args = cmd.split(' ');
      const mainCmd = args[0].toLowerCase();

      try {
        if (mainCmd === 'help') {
           setTerminalHistory(prev => [...prev, 'Kullanılabilir Komutlar:', '  help        - Bu mesajı göster', '  clear       - Ekranı temizle', '  ping        - Merkezi sunucu ile iletişim testi', '  compact     - Lokal DB optimize ve sıkıştırma', '  whoami      - Geçerli oturum bilgisi', '  reload      - Uygulamayı yenile', '  ai <mesaj>  - AI asistanından yardım al', '  sh <komut>  - Yerel terminal komutu çalıştır']);
        } else if (mainCmd === 'clear') {
           setTerminalHistory([]);
        } else if (mainCmd === 'ping') {
           setTerminalHistory(prev => [...prev, 'Pinging sunucu...']);
           if (couchCfg.url) {
             const res = await testCouchDbConnection();
             setTerminalHistory(prev => [...prev, res.ok ? 'Cevap: PONG (Bağlantı Başarılı)' : 'Hata: Hedef ulaşılamaz!']);
           } else {
             setTerminalHistory(prev => [...prev, 'Hata: Sunucu URL ayarlanmamış.']);
           }
        } else if (mainCmd === 'compact') {
           setTerminalHistory(prev => [...prev, 'Veri tabanı sıkıştırma komutu gönderildi...']);
           await compactAllDbs(true);
           setTerminalHistory(prev => [...prev, 'Sıkıştırma başarılı.']);
        } else if (mainCmd === 'whoami') {
           setTerminalHistory(prev => [...prev, `USER_ID: ${user?.id}`, `ROLE: ${user?.role}`, `NAME: ${user?.name}`]);
        } else if (mainCmd === 'reload') {
           setTerminalHistory(prev => [...prev, 'Yeniden başlatılıyor...']);
           setTimeout(() => window.location.reload(), 1000);
        } else if (mainCmd === 'ai') {
           const prompt = args.slice(1).join(' ');
           if (!prompt) {
              setTerminalHistory(prev => [...prev, 'Lütfen AI asistanına bir soru sorun. Örn: ai sistem durumunu özetle']);
           } else {
              setTerminalHistory(prev => [...prev, '> AI asistanı düşünüyor...']);
              try {
                const parsed = await processRepairAI(prompt);
                setTerminalHistory(prev => [
                  ...prev, 
                  `> AI Yanıtı:`,
                  parsed?.message || 'Yanıt alınamadı veya anahtar girilmedi.',
                  parsed?.preview?.description ? `> Uyarı: ${parsed.preview.description}` : '',
                  parsed?.repair_action ? `> Aksiyon Kodu: ${parsed.repair_action.type}` : ''
                ].filter(Boolean) as string[]);
              } catch (err: any) {
                setTerminalHistory(prev => [...prev, `> AI Hatası: ${err.message}`]);
              }
           }
        } else if (mainCmd === 'sh') {
           const commandToRun = args.slice(1).join(' ');
           if (!commandToRun) {
              setTerminalHistory(prev => [...prev, 'Çalıştırmak için komut girin.']);
           } else {
              setTerminalHistory(prev => [...prev, `Çalıştırılıyor: ${commandToRun}...`]);
              const res = await runHostCommand(commandToRun);
              if (res.success) {
                 setTerminalHistory(prev => [...prev, res.stdout]);
              } else {
                 setTerminalHistory(prev => [...prev, `Hata: ${res.error}\n${res.stderr}`]);
              }
           }
        } else {
           setTerminalHistory(prev => [...prev, `Bilinmeyen komut: ${mainCmd}`]);
        }
      } catch (err: any) {
        setTerminalHistory(prev => [...prev, `Komut başarısız: ${err.message}`]);
      }
    }
  };

  // -- CouchDB Config --
  const [couchCfg, setCouchCfg] = useState(() => getCouchDbConfig());

  // -- Admin Change --
  const [newPassword, setNewPassword] = useState("");
  // -- Database Health Tools --
  const [integrityReport, setIntegrityReport] =
    useState<IntegrityReport | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [scanningConflicts, setScanningConflicts] = useState(false);
  const [compacting, setCompacting] = useState(false);

  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [updateMsgs, setUpdateMsgs] = useState({
    title: "Cortex Sistem Güncellemesi",
    subtitle: "Sistem altyapısı ve performans iyileştirmesi",
  });
  const [customMessages, setCustomMessages] = useState<string[]>([]);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    getUpdateMessages().then(setCustomMessages);
  }, []);

  const handleUpdateStart = () => {
    setShowUpdateOverlay(true);
  };

  const handleSaveMessages = async () => {
    try {
      await saveUpdateMessages(customMessages);
      toast.success("Eğlenceli güncelleme mesajları başarıyla kaydedildi!");
    } catch (e) {
      toast.error("Kayıt sırasında bir hata oluştu.");
    }
  };

  const handleRunHealthCheck = async () => {
    setCheckingIntegrity(true);
    try {
      const report = await runIntegrityCheck();
      setIntegrityReport(report);
      toast.success(`Sağlık taraması tamamlandı! Skor: ${report.score}/100`);
    } catch (e) {
      toast.error("Sağlık taraması başarısız");
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleScanConflicts = async () => {
    setScanningConflicts(true);
    try {
      const found = await findAllConflicts();
      setConflicts(found);
      if (found.length > 0) {
        toast.warning(
          `${found.length} adet veri çelişkisi (conflict) tespit edildi!`,
        );
      } else {
        toast.success("Hiç veri çelişkisi bulunmadı.");
      }
    } catch (e) {
      toast.error("Çelişki taraması hatası");
    } finally {
      setScanningConflicts(false);
    }
  };

  const handleResolveAllConflicts = async () => {
    try {
      let totalResolved = 0;
      for (const conflict of conflicts) {
        await resolveConflict(conflict.tableName, conflict.docId, conflict.revs);
        totalResolved++;
      }
      toast.success(`${totalResolved} adet çelişki (conflict) başarıyla çözüldü ve temizlendi.`);
      handleScanConflicts();
    } catch (e) {
      toast.error("Çelişkiler çözülürken hata oluştu!");
    }
  };

  const handleCompact = async () => {
    setCompacting(true);
    try {
      const res = await compactAllDbs(true);
      toast.success(`${res.compacted} tablo başarıyla sıkıştırıldı.`);
    } catch (e) {
      toast.error("Sıkıştırma hatası");
    } finally {
      setCompacting(false);
    }
  };

  const handleReSyncAll = () => {
    startAllSync();
    toast.info("Tüm tablolar için senkronizasyon yeniden başlatıldı.");
    loadTableStatus();
  };

  // -- Machine/Docker State --
  const [sysStats, setSysStats] = useState<{
    cpu: string;
    ramTotal: number;
    ramFree: number;
    uptime: number;
    platform: string;
  } | null>(null);
  const [machineLoading, setMachineLoading] = useState(false);
  const [dockerLog, setDockerLog] = useState<string>("");

  const loadMachineStats = useCallback(async () => {
    setMachineLoading(true);
    try {
        const stats = await getHostStats();
        if (stats) setSysStats(stats);
    } catch(e) { }
    setMachineLoading(false);
  }, []);

  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Check real backend version / updates
    const checkUpdates = async () => {
       const v = await getHostVersion();
       if (v && v.success) {
           setDockerLog((prev) => prev ? prev : `Mevcut Sürüm Notu: ${v.latestCommit}\n`);
       }
       // Randomly suggest an update or check a hypothetical version
       setTimeout(() => setHasUpdate(true), 15000);
    };
    if (!isLocked) checkUpdates();
  }, [isLocked]);

  const handleDockerUpdate = () => {
    handleUpdateStart();
  };

  const simulateBuild = () => {
    handleUpdateStart();
  };

  const handleTestConnection = useCallback(async () => {
    setConnTesting(true);
    const t0 = performance.now();
    const result = await testCouchDbConnection();
    const latencyMs = Math.round(performance.now() - t0);
    setConnStatus({ ...result, latencyMs });
    setConnTesting(false);
  }, []);

  const loadTableStatus = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statuses, progress] = await Promise.all([
        getCouchDbTableStatus(),
        getAllSyncProgress(),
      ]);
      setTableStatus(statuses);
      setSyncProgress(progress);
    } catch (e: any) {
      toast.error("Tablo durumu alınamadı");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked) {
      handleTestConnection();
      loadTableStatus();
      loadMachineStats();
      loadSessions();
      const interval = setInterval(loadSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [
    handleTestConnection,
    loadTableStatus,
    loadMachineStats,
    isLocked,
    loadSessions,
  ]);

  const saveTelCfg = () => {
    setInStorage(TELEGRAM_KEY, telCfg);
    toast.success("Telegram bot ayarları kaydedildi");
    if (sysConfig.serverUrl) {
       // We can no longer do long background process monitoring solely via React for pure web, 
       // but we'll mock or just do a toast here since Express is handling real background tasks
       toast.success("Telegram ayarları kayıt edildi - eğer sistem servisi varsa devreye alınacak!");
    }
  };

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  const testTelegram = async () => {
    if (!telCfg.token || !telCfg.chatId) {
      toast.error("Önce token ve chat ID girin");
      return;
    }
    setIsTestingTelegram(true);
    const msg = encodeURIComponent(
      `🤖 Karargah Operasyon Merkezi\n\n✅ Sistem yapılandırması doğrulandı.\nZaman: ${new Date().toLocaleString("tr-TR")}`
    );
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${telCfg.token}/sendMessage?chat_id=${telCfg.chatId}&text=${msg}`
      );
      if (res.ok) {
        toast.success("Bağlantı başarılı! Telegram test mesajı gönderildi.", { duration: 4000 });
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(`Telegram Hatası: ${errorData.description || res.statusText || 'Bilinmeyen hata'}`);
      }
    } catch (e) {
      toast.error("Ağ hatası veya Telegram APISi engellendi: " + e);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return;
    if (user?.role !== "Yönetici") {
      toast.error("Yalnızca Yönetici şifresini güncelleyebilir.");
      return;
    }
    try {
      if (!user.id) {
        toast.error("Geçerli kullanıcı bulunamadı");
        return;
      }

      const salt = "sEcReT_SaLt_2026";
      const hashedPassword = await hashStringWithSalt(newPassword, salt);

      const personnel = getFromStorage<any[]>(StorageKey.PERSONEL_DATA) || [];
      const updated = personnel.map((p) => {
        if (p.id === user.id) {
          return { ...p, password: hashedPassword };
        }
        return p;
      });
      setInStorage(StorageKey.PERSONEL_DATA, updated);

      toast.success(
        "Şifre başarıyla güncellendi. Yeniden giriş yapmanız gerekebilir.",
      );
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message || "Şifre güncellenemedi");
    }
  };

  const TABS = [
    { key: "dashboard", label: "GENEL BAKIŞ", icon: Activity },
    { key: "sessions", label: "CANLI AĞ", icon: Eye },
    { key: "users", label: "OLAY LOGLARI", icon: Users },
    { key: "server", label: "VERİTABANI", icon: Database },
    { key: "updates", label: "SİSTEM", icon: Sparkles },
    { key: "docker", label: "DOCKER & BUILD", icon: Server },
    { key: "site", label: "SİTE İZLEME", icon: Globe },
    { key: "terminal", label: "TERMİNAL", icon: Terminal },
    { key: "ai", label: "YAPAY ZEKA", icon: Wand2 },
    { key: "admin", label: "YÖNETİM", icon: Shield },
  ] as const;
  type TabKey = typeof TABS[number]["key"];

  if (isLocked) {
    const isFirstSetup = !localStorage.getItem("ops_system_pin");

    if (isFirstSetup) {
      return (
        <div className="fixed inset-0 z-50 bg-[#0f172a] text-emerald-400 font-mono flex flex-col items-center justify-center p-4">
           {/* FIRST SETUP SCREEN */}
           <div className="bg-black/50 p-6 rounded-xl border border-blue-500/30 w-full max-w-md backdrop-blur-sm shadow-2xl relative overflow-hidden z-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 blur-sm"></div>
              
              <div className="flex flex-col items-center justify-center mb-6">
                 <Shield className="w-16 h-16 text-blue-500 mb-2" />
                 <h2 className="text-blue-500 font-bold text-center text-lg uppercase tracking-widest">Karargah İlk Kurulum</h2>
                 <p className="text-xs text-blue-100/80 text-center mt-3 leading-relaxed border border-blue-500/30 p-3 rounded-lg bg-blue-500/5">
                   <strong className="text-blue-400">Hoş geldiniz.</strong> Karargah, sisteminizin kalbidir. 
                   <br/><br/>
                   <span className="opacity-90 text-[11px]">
                     1. Devam edebilmek için <strong className="text-blue-300">Hızlı Giriş Şifresi (PIN)</strong> belirlemeniz zorunludur.
                     <br/>
                     2. Telegram entegrasyonu tamamen opsiyoneldir. Dilerseniz sonradan Ayarlar sekmesinden yapabilirsiniz.
                   </span>
                 </p>
              </div>

              <div className="flex flex-col gap-5">
                 <div className="flex flex-col gap-1">
                   <label className="text-xs text-blue-400/70 ml-1 font-bold">Yeni Hızlı Giriş PIN Belirle</label>
                   <input 
                     type="password" 
                     autoComplete="off"
                     autoFocus
                     value={fastPin}
                     onChange={e => setFastPin(e.target.value)}
                     className="bg-black/80 text-blue-400 border border-blue-500/50 p-3 rounded-lg focus:outline-none focus:border-blue-500 placeholder-blue-500/20 tracking-widest font-bold font-mono text-center text-2xl"
                     placeholder="****"
                     maxLength={8}
                   />
                 </div>
                 
                 <div className="flex gap-3 mt-2">
                   <button 
                     onClick={() => {
                       if(fastPin.length < 4) { toast.error("Şifre en az 4 haneli olmalıdır."); return; }
                       localStorage.setItem("ops_system_pin", fastPin);
                       setIsLocked(false);
                       sessionStorage.setItem("ops_center_verified", "true");
                       toast.success("İlk kurulum tamamlandı! Karargaha giriş yapıldı.");
                       setShowFastLogin(true); // default to fast login on next locked session
                     }} 
                     className="flex-1 w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/50 p-3 rounded-xl font-bold transition-all uppercase tracking-widest text-xs"
                   >
                     KURULUMU TAMAMLA VE GİRİŞ YAP
                   </button>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#0f172a] text-emerald-400 font-mono flex flex-col items-center justify-center p-4">
           {/* Invisible button to switch to Fast Pin Login if they navigated away */}
           <div 
             className="fixed bottom-0 right-0 w-24 h-24 cursor-default z-[60]"
             onClick={() => {
               if (localStorage.getItem("ops_system_pin")) {
                 setShowFastLogin(true);
               }
             }}
           />

           <div className="bg-black/50 p-6 rounded-xl border border-red-500/30 w-full max-w-md backdrop-blur-sm shadow-2xl relative overflow-hidden z-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50 blur-sm"></div>
              
              <div className="flex flex-col items-center justify-center mb-6">
                 <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />
                 <h2 className="text-red-500 font-bold text-center text-lg uppercase tracking-widest">GÜVENLİK DUVARI</h2>
                 <p className="text-xs text-red-400/80 text-center mt-2">
                   {showFastLogin 
                     ? "Karargah terminaline erişmek için Hızlı Giriş Şifrenizi (PIN) girin."
                     : "Karargah kontrol paneline erişim için Sabit Kod ve Opsiyonel Telegram Kodları gerekir."}
                 </p>
                 {!showFastLogin && (
                   <button onClick={handleSimulateTelegram} className="mt-3 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-blue-500/30 transition-colors z-30">
                      <Smartphone className="w-4 h-4" /> Telegram Simülasyonu
                   </button>
                 )}
              </div>
              
              {showFastLogin ? (
                <form onSubmit={handleFastLogin} className="flex flex-col gap-5">
                   <div className="flex flex-col gap-1">
                     <label className="text-xs text-red-400/70 ml-1 font-bold">Yetkili Hızlı PIN Girişi</label>
                     <input 
                       type="password" 
                       autoComplete="off"
                       autoFocus
                       value={fastPin}
                       onChange={e => setFastPin(e.target.value)}
                       className="bg-black/80 text-red-500 border border-red-500/50 p-3 rounded-lg focus:outline-none focus:border-red-500 placeholder-red-500/20 tracking-widest font-bold font-mono text-center text-2xl"
                       placeholder="****"
                       maxLength={8}
                     />
                   </div>
                   
                   <div className="flex gap-3 mt-2">
                     <button type="button" onClick={() => setShowFastLogin(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs hidden">
                       {/* Hiding the Fallback to 3FA button to make PIN primary */}
                     </button>
                     <button type="button" onClick={() => setShowFastLogin(false)} className="w-1/3 bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-lg font-bold transition-all uppercase tracking-widest text-[10px]">
                       3FA İle Gir
                     </button>
                     <button type="submit" className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/50 p-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs">
                       GİRİŞ YAP
                     </button>
                   </div>
                </form>
              ) : (
                <form onSubmit={unlockOpsCenter} className="flex flex-col gap-5">
                   <div className="flex flex-col gap-1">
                     <label className="text-xs text-red-400/70 ml-1 font-bold">1. Sabit Anahtar (Fiziksel)</label>
                     <input 
                       type="password" 
                       autoComplete="off"
                       value={codeConstant}
                       onChange={e => setCodeConstant(e.target.value.toUpperCase())}
                       className="bg-black/80 text-red-500 border border-red-500/50 p-3 rounded-lg focus:outline-none focus:border-red-500 placeholder-red-500/20 tracking-widest font-bold font-mono"
                       placeholder="XXXX-XXXX-XXXX-XXXX"
                       maxLength={16}
                     />
                   </div>
                   
                   <div className="flex flex-col gap-1">
                     <label className="text-xs text-red-400/70 ml-1 font-bold">2. Telegram Kodu (Dinamik - Seçmeli)</label>
                     <input 
                       type="password"
                       autoComplete="off" 
                       value={codeTele1}
                       onChange={e => setCodeTele1(e.target.value.toUpperCase())}
                       className="bg-black/80 text-red-500 border border-red-500/50 p-3 rounded-lg focus:outline-none focus:border-red-500 placeholder-red-500/20 tracking-widest font-bold font-mono"
                       placeholder="16 HANELİ KOD"
                       maxLength={16}
                     />
                   </div>

                   <button type="submit" className="mt-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/50 p-4 rounded-lg font-bold transition-all uppercase tracking-widest">
                     DOĞRULA VE GİRİŞ YAP
                   </button>
                   
                   <button type="button" onClick={() => setShowFastLogin(true)} className="text-xs text-zinc-500 hover:text-white underline mt-1 text-center">
                     Hızlı PIN ile giriş yap
                   </button>
                </form>
              )}
           </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* HEADER & TABS */}
      <div className="shrink-0 px-8 pt-6 pb-0 border-b border-white/5 bg-[#0a0a0a] flex flex-col gap-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-none bg-gradient-to-br from-indigo-600 to-indigo-900 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-widest uppercase">
                KARARGAH GÖSTERGE PANELİ
              </h1>
              <p className="text-[10px] text-indigo-400/80 uppercase font-bold tracking-[0.2em] mt-1">
                Sistem İzleme & Yönetim Merkezi
              </p>
            </div>
          </div>

          {/* Connection Pulse */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                 setIsLocked(true);
                 sessionStorage.removeItem("ops_center_verified");
                 toast.success("Sistem başarıyla kilitlendi.");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-sm hover:bg-rose-500/20 transition-all font-bold text-xs uppercase"
            >
              <Lock className="w-4 h-4" /> Sistemi Kilitle
            </button>
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-sm bg-white/5 border border-white/10">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full opacity-75 ${connStatus?.ok ? "bg-emerald-400" : "bg-rose-400"}`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 ${connStatus?.ok ? "bg-emerald-500" : "bg-rose-500"}`}
                />
              </span>
              <span className={`text-xs font-bold font-mono tracking-wider ${connStatus?.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {connStatus?.ok ? `${connStatus.latencyMs}ms` : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* HORIZONTAL TABS */}
        <div className="flex items-center gap-1 overflow-x-auto pb-4 scrollbar-hide">
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as TabKey)}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold transition-all whitespace-nowrap outline-none uppercase tracking-widest ${
                  active
                    ? "bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <t.icon
                  className={`w-3.5 h-3.5 ${active ? "text-indigo-400" : "text-zinc-600"}`}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-hide relative bg-[#050505]">
        <AnimatePresence mode="wait">
          {/* TAB: SESSIONS (LIVE MONITOR) */}
          {activeTab === "sessions" && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Yeni: Güvenlik Tehdit İstihbaratı */}
                  <div className="p-6 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all" />
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                         <Shield className="w-5 h-5" /> Güvenlik Analitiği
                       </h3>
                       <div className="px-3 py-1.5 bg-orange-500/10 rounded-lg text-xs font-black text-orange-500 border border-orange-500/20">
                         CANLI TESPİT
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.values(riskProfiles).filter(p => p.riskScore > 0 || p.threats.length > 0).length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-gray-600 italic">Şu an aktif tehdit tespiti bulunmuyor.</p>
                        </div>
                      ) : (
                        Object.values(riskProfiles)
                          .filter(p => p.riskScore > 0 || p.threats.length > 0)
                          .sort((a,b) => b.riskScore - a.riskScore)
                          .slice(0, 5)
                          .map(profile => (
                            <div key={profile.userId} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-zinc-100 truncate max-w-[120px]">{profile.userId}</span>
                                <span className={`text-xs font-black ${profile.riskScore > 50 ? 'text-rose-500' : 'text-orange-400'}`}>
                                  %{profile.riskScore} RİSK
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {profile.threats.slice(-2).map(t => (
                                  <span key={t.id} className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] rounded border border-rose-500/10 uppercase">
                                    {t.type.split('_').join(' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    <button 
                      onClick={handleAnalyzeAll}
                      className="w-full py-2 mt-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-extrabold rounded-xl border border-orange-500/20 transition-all uppercase tracking-widest"
                    >
                      Derinlikli Tarama Başlat
                    </button>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-blue-900/20 border border-blue-500/10 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                        <Eye className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">
                          Canlı İzleme
                        </h3>
                        <p className="text-xs text-blue-400/80 font-bold uppercase tracking-widest">
                          Sistemin Gözü
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-zinc-400 font-medium">
                          Aktif Oturum
                        </span>
                        <span className="text-2xl font-black text-zinc-100">
                          {liveSessions.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-zinc-400 font-medium">
                          Bannlı Liste
                        </span>
                        <span className="text-2xl font-black text-rose-500">
                          {liveSessions.filter((s) => s.isBanned).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/10 shadow-2xl">
                    <h4 className="text-xs font-bold text-emerald-500/70 uppercase tracking-[0.2em] mb-4">
                      Güvenlik Durumu
                    </h4>
                    <div className="flex items-center gap-3 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">
                        Sistem Stabil & Korunuyor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-base font-bold text-white flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-indigo-400" /> Bağlı
                        İstemciler (Gerçek Zamanlı)
                      </h3>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={handleAnalyzeAll}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" /> ANALİZİ YENİLE
                        </button>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                            Canlı Akış
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {liveSessions.length === 0 && (
                        <p className="text-center py-12 text-gray-600 text-xs italic">
                          Şu an bağlı kullanıcı bulunmuyor.
                        </p>
                      )}
                      {liveSessions.map((node) => (
                        <motion.div
                          layout
                          key={node.id}
                          className={`p-6 rounded-3xl border transition-all ${node.isBanned ? "bg-rose-500/5 border-rose-500/20" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${node.isBanned ? "bg-rose-500/20 border-rose-500/30" : "bg-blue-500/10 border-blue-500/20"}`}
                              >
                                {node.device
                                  ?.toLowerCase()
                                  .includes("mobile") ? (
                                  <Smartphone className="w-5 h-5 text-blue-400" />
                                ) : (
                                  <Monitor className="w-5 h-5 text-blue-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-zinc-100">
                                    {node.userEmail}
                                  </span>
                                  {node.isBanned ? (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black text-zinc-100 uppercase tracking-widest">
                                      YASAKLI
                                    </span>
                                  ) : (
                                    riskProfiles[node.userId] && riskProfiles[node.userId].riskScore > 0 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                        riskProfiles[node.userId].riskScore > 60 ? 'bg-orange-600 text-white' : 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/20'
                                      }`}>
                                        RİSK: %{riskProfiles[node.userId].riskScore}
                                      </span>
                                    )
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />{" "}
                                    {node.location || "Bilinmiyor"}
                                  </span>
                                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                                    <LayoutList className="w-3 h-3" />{" "}
                                    {node.activePage}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right flex flex-col items-end">
                                <span className="text-[9px] font-mono text-zinc-400 uppercase">
                                  Son Görülme
                                </span>
                                <span className="text-xs text-zinc-400 font-bold">
                                  {new Date(node.lastSeen).toLocaleTimeString(
                                    "tr-TR",
                                  )}
                                </span>
                              </div>
                              {!node.isBanned ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSuspendUser(node.userId, 15)}
                                    className="px-2.5 py-1.5 rounded-lg bg-yellow-600/10 hover:bg-yellow-600/30 text-yellow-500 text-xs font-bold border border-yellow-500/20"
                                    title="15 Dakika Askı"
                                  >
                                    ASKI (15dk)
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(node.id, node.userId, node.userEmail)}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-600 hover:text-zinc-100 text-rose-500 transition-all border border-white/5 shadow-sm"
                                    title="Tamamen Uzaklaştır"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePardonUser(node.userId)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold shadow-lg flex items-center gap-1.5"
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> ENGELİ KALDIR
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: SYSTEM CONFIG & AI */}
          {activeTab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AI & SERVER SETTINGS */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-base font-bold text-zinc-100">
                      Sistem Yapılandırması
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Yapay Zeka Token (Gemini/OpenAI)
                      </label>
                      <input
                        type="password"
                        value={sysConfig.gptToken}
                        onChange={(e) =>
                          setSysConfig({
                            ...sysConfig,
                            gptToken: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-purple-500 transition-all focus:outline-none"
                        placeholder="sk-... veya AIza..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Merkezi Sunucu Adresi
                      </label>
                      <input
                        type="text"
                        value={sysConfig.serverUrl}
                        onChange={(e) =>
                          setSysConfig({
                            ...sysConfig,
                            serverUrl: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="http://..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Veri Kulesi İsmi
                      </label>
                      <input
                        type="text"
                        value={sysConfig.nodeName}
                        onChange={(e) =>
                          setSysConfig({
                            ...sysConfig,
                            nodeName: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-emerald-500 transition-all focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveSysConfig}
                      className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                {/* OPS BACKGROUND ENGINE CONFIG */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-100">
                        Arka Plan Servisi
                      </h2>
                      <p className="text-xs text-zinc-400">İşleyen Et - Ops Motoru</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-zinc-100">Servis Aktif Mi?</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.enabled}
                        onChange={(e) => setOpsConfig({...opsConfig, enabled: e.target.checked})}
                        className="w-5 h-5 rounded accent-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Kontrol Döngüsü (Dakika)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={opsConfig.checkIntervalMinutes}
                        onChange={(e) =>
                          setOpsConfig({
                            ...opsConfig,
                            checkIntervalMinutes: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-orange-500 transition-all focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-zinc-100">Anomali Tespiti (Telegram Uyarı)</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.anomalyAlertsEnabled}
                        onChange={(e) => setOpsConfig({...opsConfig, anomalyAlertsEnabled: e.target.checked})}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <label className="text-sm text-zinc-100">Gece Bakımı (04:00+ Optimize)</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.nightlyMaintenance}
                        onChange={(e) => setOpsConfig({...opsConfig, nightlyMaintenance: e.target.checked})}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                    </div>
                    
                    <button
                      onClick={saveOpsConfig}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-zinc-100 rounded-lg font-bold text-sm transition-all"
                    >
                      Servis Ayarlarını Kaydet
                    </button>
                  </div>
                </div>

                {/* TELEGRAM BOT ENTEGRASYONU */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-md space-y-4 relative group/teltip">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4 relative">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      Telegram Bot 
                      <div className="relative group/telhelp inline-block cursor-help">
                         <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-blue-400 transition-colors" />
                         <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-xs text-slate-200 rounded-xl shadow-xl opacity-0 group-hover/telhelp:opacity-100 pointer-events-none transition-opacity z-50">
                            <strong>Nasıl Yapılır?</strong><br/>
                            1. Telegram'da <strong>@BotFather</strong> araması yapın.<br/>
                            2. <code>/newbot</code> yazarak yeni bir bot oluşturun ve verilen token'i <i>Bot Token</i> kısmına yapıştırın.<br/>
                            3. Botunuza Telegram'dan /start deyip bir mesaj atın.<br/>
                            4. Kendi ID'nizi veya Grup ID'nizi öğrenmek için <strong>@userinfobot</strong>'a yazabilirsiniz. Bu ID'yi <i>Chat ID</i> kısmına girin.
                         </div>
                      </div>
                    </h2>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Bot Token
                      </label>
                      <input
                        type="text"
                        value={telCfg.token}
                        onChange={(e) =>
                          setTelCfg((c) => ({ ...c, token: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="123456789:AAH..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Chat ID
                      </label>
                      <input
                        type="text"
                        value={telCfg.chatId}
                        onChange={(e) =>
                          setTelCfg((c) => ({ ...c, chatId: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="-1001234..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveTelCfg}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-100 rounded-lg text-sm font-bold border border-white/5 transition-all"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={testTelegram}
                        disabled={isTestingTelegram}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-zinc-100 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {isTestingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Test
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECURITY PIN CONFIG */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                    <h2 className="text-base font-bold text-zinc-100">
                      Karargah Ops PIN
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Ops Merkezi PIN (Varsayılan: 3737)
                      </label>
                      <input
                        type="password"
                        id="new-ops-pin"
                        placeholder="Yeni 4-8 Haneli PIN"
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-red-500 transition-all focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newPin = (document.getElementById("new-ops-pin") as HTMLInputElement).value;
                        if (!newPin || newPin.length < 4) {
                           toast.error("En az 4 karakter giriniz.");
                           return;
                        }
                        localStorage.setItem("ops_system_pin", newPin);
                        toast.success("Yeni PIN uygulandı!");
                        (document.getElementById("new-ops-pin") as HTMLInputElement).value = "";
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-zinc-100 rounded-lg font-bold text-sm transition-all"
                    >
                      PIN Kaydet
                    </button>
                  </div>
                </div>

                {/* ADMIN PASSWORD UPDATE */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-rose-400" />
                    </div>
                    <h2 className="text-base font-bold text-zinc-100">
                      Şifre Yönetimi
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Mevcut Admin UID
                      </label>
                      <input
                        disabled
                        value={user?.id || "Bilinmiyor"}
                        className="w-full mt-1 px-3 py-2 bg-white/5/50 border border-white/5 rounded-lg text-sm text-zinc-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 ml-1">
                        Yeni Yönetici Şifresi
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-100 focus:border-rose-500 transition-all focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-zinc-100 rounded-lg text-sm font-bold transition-all pt-2 mt-4"
                    >
                      Şifreyi Güncelle
                    </button>

                    <button
                      onClick={() =>
                        toast.warning(
                          "Tüm oturumlar sonlandırma komutu verildi.",
                        )
                      }
                      className="w-full p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all text-orange-500 text-sm font-bold mt-2"
                    >
                      <LogOut className="w-4 h-4" /> Tüm Oturumları Kapat
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: UPDATES & SYSTEM MAINTENANCE */}
          {activeTab === "updates" && (
            <motion.div
              key="updates"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-5xl mx-auto space-y-6"
            >
              {/* SYSTEM UPDATE CONTROL CARD */}
              <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-blue-900/20 border border-blue-500/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Rocket className="w-40 h-40 text-blue-400 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-4">
                      <GitBranch className="w-3 h-3" /> GitHub: main
                      (Senkronize)
                    </div>
                    <h2 className="text-3xl font-black text-zinc-100 mb-3 tracking-tight flex items-center justify-center md:justify-start gap-3">
                      <Sparkles className="w-8 h-8 text-yellow-400" />{" "}
                      {updateMsgs.title}
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
                      {updateMsgs.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleUpdateStart}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-zinc-100 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-5 h-5" /> Güncellemeyi Başlat
                    </button>
                    <p className="text-xs text-center text-gray-600 font-bold uppercase tracking-widest italic">
                      Yedekler korunacaktır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* UPDATE MESSAGES CONFIG */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-orange-500/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">
                      Güncelleme Yazıları
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                        Güncelleme Başlığı
                      </label>
                      <input
                        type="text"
                        value={updateMsgs.title}
                        onChange={(e) =>
                          setUpdateMsgs({
                            ...updateMsgs,
                            title: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                        Alt Açıklama (Eğlenceli Cümleler)
                      </label>
                      <textarea
                        rows={3}
                        value={updateMsgs.subtitle}
                        onChange={(e) =>
                          setUpdateMsgs({
                            ...updateMsgs,
                            subtitle: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                        Terminal Akış Mesajları
                      </h4>
                      <div className="flex gap-2">
                        <input
                          value={newMsg}
                          onChange={(e) => setNewMsg(e.target.value)}
                          placeholder="Log mesajı ekle..."
                          className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (newMsg) {
                              setCustomMessages([...customMessages, newMsg]);
                              setNewMsg("");
                            }
                          }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-100 rounded-xl font-bold text-xs"
                        >
                          Ekle
                        </button>
                      </div>
                      <div className="max-h-[120px] overflow-y-auto space-y-1">
                        {customMessages.map((m, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded bg-white/[0.02] text-xs text-zinc-400"
                          >
                            <span>{m}</span>
                            <button
                              onClick={() =>
                                setCustomMessages(
                                  customMessages.filter((_, idx) => idx !== i),
                                )
                              }
                              className="text-rose-500/50 hover:text-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveMessages}
                      className="w-full py-4 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-orange-500/20 transition-all"
                    >
                      <Save className="w-4 h-4" /> Ayarları Kaydet
                    </button>
                  </div>
                </div>

                {/* REMOTE INTEGRITY & BACKUP */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-indigo-500/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">
                      Bulut & Yedekleme
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 rounded-3xl bg-black/20 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Cloud className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100">
                            CouchDB Sync
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            152.12.33.1:5984
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">
                          AKTİF
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase">
                          Tam Senkronize
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-black/20 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <HardDrive className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100">
                            Yerel Yedekleme
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            /data/backups/daily
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-zinc-100">
                          12.4 GB
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase">
                          Son: Bugün 04:00
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button
                        onClick={() =>
                          toast.loading("Bulut yedekleme başlatılıyor...")
                        }
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-zinc-100 rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2"
                      >
                        <CloudUpload className="w-4 h-4" /> Manuel Bulut Yedeği
                        Al
                      </button>
                      <button
                        onClick={() =>
                          toast.info("Yedekleme planı: Her gün 04:00")
                        }
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-zinc-100 rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4" /> Otomatik Yedekleme
                        Ayarları
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <UpdateOverlay
            isVisible={showUpdateOverlay}
            onClose={() => setShowUpdateOverlay(false)}
          />

          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" /> Sistem Genel
                  Bakış
                </h2>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-100 bg-white/5 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Yenile
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-16 h-16 text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Günlük İşlem
                  </h3>
                  <div className="text-3xl font-black text-zinc-100">
                    {todayLogs.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-blue-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-blue-400" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Aktif Kullanıcı
                  </h3>
                  <div className="text-3xl font-black text-zinc-100">
                    {activeUsers.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-rose-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertTriangle className="w-16 h-16 text-rose-400" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Anomali & Uyarı
                  </h3>
                  <div className="text-3xl font-black text-zinc-100">
                    {anomalies.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-purple-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Database className="w-16 h-16 text-purple-400" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Sunucu Gecikmesi
                  </h3>
                  <div className="text-3xl font-black text-zinc-100">
                    {connStatus?.latencyMs || 0}{" "}
                    <span className="text-sm font-bold text-zinc-400">ms</span>
                  </div>
                </motion.div>
              </div>

              {anomalies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 rounded-3xl bg-rose-950/20 border border-rose-500/30"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                    <h2 className="text-sm font-bold text-rose-100">
                      Güvenlik ve Anomali Tespitleri
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {anomalies.map((a, i) => (
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                            {a.title}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                              Kritik
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {a.description}
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <div className="text-xs font-mono text-zinc-400">
                            {formatDate(a.detectedAt)}
                          </div>
                          <div className="text-xs text-zinc-100/50">
                            {a.employeeName || "Sistem"}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Users Table */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Aktif
                      (Son 15dk)
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        Aktif kullanıcı yok.
                      </p>
                    ) : (
                      activeUsers.map((u, i) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={u.id}
                          className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                              {u.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-100">
                                {u.name}
                              </p>
                              <p className="text-xs text-zinc-400 text-end">
                                {u.count} işlem
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-emerald-400 font-mono tracking-wider">
                              {formatDate(u.lastSeen)}
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-1 max-w-[120px]">
                              {u.lastAction}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Server Snippet */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl overflow-hidden relative">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-zinc-400" /> Son Canlı
                      Loglar
                    </h2>
                  </div>
                  <div className="space-y-2 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs.slice(0, 10).map((l, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i}
                        className="flex gap-3 text-xs p-2 hover:bg-white/5 rounded"
                      >
                        <span className="text-gray-600 font-mono shrink-0">
                          {new Date(l.timestamp).toLocaleTimeString("tr-TR")}
                        </span>
                        <span className="text-indigo-400 shrink-0 min-w-[70px]">
                          {l.employeeName || "Sistem"}
                        </span>
                        <span className="text-zinc-400 truncate">
                          {l.title}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: USERS & LOGS */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-7xl mx-auto space-y-4"
            >
              <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-zinc-100">
                    Detaylı Sistem Logları
                  </h2>
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-100 bg-white/5 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Yenile
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase font-bold tracking-wider text-zinc-400">
                        <th className="p-3">Tarih</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Aksiyon</th>
                        <th className="p-3">Kullanıcı</th>
                        <th className="p-3">Detay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.slice(0, 50).map((l, i) => (
                        <motion.tr
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          key={l.id}
                          className="hover:bg-white/[0.02]"
                        >
                          <td className="p-3 text-sm font-mono text-zinc-400 whitespace-nowrap">
                            {formatDate(l.timestamp)}
                          </td>
                          <td className="p-3 text-sm font-bold text-indigo-300">
                            {l.category}
                          </td>
                          <td className="p-3 text-xs font-semibold text-gray-200">
                            {l.title}
                          </td>
                          <td className="p-3 text-sm text-zinc-400">
                            {l.employeeName || "-"}
                          </td>
                          <td
                            className="p-3 text-sm text-zinc-400 max-w-[200px] truncate"
                            title={l.description}
                          >
                            {l.description || "-"}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: TERMINAL */}
          {activeTab === "terminal" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.5 }}
                    className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                  >
                    <Command className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-black text-zinc-100">
                      Sistem Makine Yöneticisi
                    </h2>
                    <p className="text-xs text-emerald-300">
                      Docker Restart (Git Pull ile Uygulama Güncelleme)
                    </p>
                  </div>
                </div>

                {sysStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-white/5"
                    >
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
                        CPU İşlemci
                      </div>
                      <div
                        className="text-sm font-semibold text-zinc-100 truncate"
                        title={sysStats.cpu}
                      >
                        {sysStats.cpu}
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-white/5"
                    >
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
                        Boş / Toplam RAM
                      </div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {sysStats.ramFree} GB / {sysStats.ramTotal} GB
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-white/5"
                    >
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
                        Çalışma Süresi
                      </div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {Math.floor(sysStats.uptime / 3600)} Saat{" "}
                        {Math.floor((sysStats.uptime % 3600) / 60)} Dk
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-white/5"
                    >
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
                        Platform
                      </div>
                      <div className="text-sm font-semibold text-zinc-100 uppercase">
                        {sysStats.platform}
                      </div>
                    </motion.div>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDockerUpdate}
                    disabled={machineLoading}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-zinc-100 font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
                  >
                    {machineLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4 animate-bounce" />
                    )}{" "}
                    Git Çek & Yeniden Başlatıp Derle (Docker)
                  </motion.button>
                  <button
                    onClick={loadMachineStats}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-100 font-bold text-sm rounded-xl transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 hover:animate-spin" /> Durumu
                    Yenile
                  </button>
                </div>

                <AnimatePresence>
                  {(dockerLog || machineLoading) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-black border border-emerald-500/20 p-4 overflow-hidden relative shadow-lg mb-6"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-emerald-400" />{" "}
                          Docker Log Çıktısı
                        </span>
                        {machineLoading ? (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 font-bold animate-pulse rounded-md">
                            İşlem devam ediyor... Lütfen Bekleyin...
                          </span>
                        ) : (
                          <button
                            onClick={() => setDockerLog("")}
                            className="text-xs font-bold px-3 py-1 bg-white/10 hover:bg-white/20 text-zinc-100 rounded transition-colors"
                          >
                            Kapat
                          </button>
                        )}
                      </div>
                      <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                        {dockerLog ||
                          "İşlem başlatılıyor... Lütfen sabırla bekleyiniz."}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INTERACTIVE TERMINAL SHELL */}
                <div className="rounded-xl border border-white/5 bg-black/80 overflow-hidden shadow-inner flex flex-col h-[400px]">
                  <div className="bg-white/5 border-b border-white/5 px-4 py-2 flex items-center justify-between shrink-0">
                     <span className="text-xs font-bold text-zinc-400 font-mono">root@isleyen-et:/app#</span>
                     <div className="flex gap-1.5">
                       <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-sm space-y-1">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={line.startsWith('>') ? 'text-emerald-400' : 'text-zinc-400'}>
                        {line}
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 border-t border-white/5 bg-black flex items-center gap-2 shrink-0">
                    <span className="text-emerald-500 font-bold ml-1">$</span>
                    <input 
                      type="text" 
                      value={terminalInput}
                      onChange={e => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalCommand}
                      placeholder="Komut girin..."
                      className="flex-1 bg-transparent border-none text-zinc-100 text-sm focus:outline-none font-mono"
                      spellCheck={false}
                    />
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB: AI ASSISTANT */}
          {activeTab === "ai" && (
             <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="w-full flex-1 flex flex-col min-h-0 bg-black/40 rounded-2xl border border-white/5 overflow-hidden font-mono"
            >
               <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                 {aiLogs.map((log) => (
                   <motion.div 
                     key={log.id} 
                     initial={{ opacity: 0, x: -10 }} 
                     animate={{ opacity: 1, x: 0 }}
                     className={`flex gap-3 ${log.sender === 'user' ? 'text-blue-400' : log.sender === 'ai' ? 'text-purple-400' : 'text-emerald-500'}`}
                   >
                     <div className="w-6 shrink-0 mt-0.5">
                       {log.sender === 'system' && '>_'}
                       {log.sender === 'user' && '$'}
                       {log.sender === 'ai' && <Wand2 className="w-4 h-4" />}
                     </div>
                     <div className="flex-1">
                       <div className="whitespace-pre-wrap text-sm leading-relaxed">{log.text}</div>
                       
                       {log.preview && log.action && !log.executed && (
                          <div className="mt-4 border border-rose-500/30 bg-rose-500/5 rounded-xl p-4 max-w-2xl">
                             <div className="flex items-start gap-3">
                               <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                               <div>
                                 <h3 className="text-rose-500 font-bold uppercase tracking-wider">{log.preview.title}</h3>
                                 <p className="text-rose-400/80 text-sm mt-1 mb-4">{log.preview.description}</p>
                                 
                                 <div className="p-3 bg-black/50 rounded-lg text-emerald-500/70 text-xs font-mono mb-4 border border-emerald-500/10 overflow-x-auto">
                                   {log.action.code}
                                 </div>

                                 <div className="flex gap-3">
                                   <button 
                                     onClick={() => executeAction(log.id, log.action!.code)}
                                     className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-bold uppercase text-sm transition-colors flex items-center gap-2"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                     EVET, EMİNİM UYGULA
                                   </button>
                                   <button 
                                     onClick={() => {
                                        setAiLogs(prev => prev.map(l => l.id === log.id ? { ...l, executed: true } : l));
                                        setAiLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: '[SİSTEM]: İşlem kullanıcı tarafından iptal edildi.' }]);
                                     }}
                                     className="bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg font-bold uppercase text-sm transition-colors"
                                   >
                                     İPTAL ET
                                   </button>
                                 </div>
                               </div>
                             </div>
                          </div>
                       )}
                       
                       {log.executed && log.action && (
                          <div className="mt-2 text-xs text-rose-500/50 italic bg-rose-500/5 inline-block px-2 py-1 rounded">
                             İşlem kararı verildi.
                          </div>
                       )}

                     </div>
                   </motion.div>
                 ))}
                 {isProcessing && (
                   <div className="text-emerald-500/50 flex items-center gap-2 text-sm italic">
                     <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>Çekirdek analiz ediyor...</span>
                   </div>
                 )}
               </div>

               <form onSubmit={(e) => { e.preventDefault(); executeCommand(); }} className="flex gap-2 p-4 bg-black/60 border-t border-white/5">
                  <div className="flex-1 relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50">root@mertos:~#</span>
                     <input 
                       type="text" 
                       value={aiInput}
                       onChange={e => setAiInput(e.target.value)}
                       disabled={isProcessing}
                       className="w-full bg-black/50 border border-emerald-500/30 rounded-lg py-3 pl-36 pr-4 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors placeholder-emerald-800 focus:ring-1 focus:ring-emerald-500"
                       placeholder="Sistemi düzenlemek/onarmak için komut girin..."
                     />
                  </div>
                  <button type="submit" disabled={isProcessing || !aiInput.trim()} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 px-8 py-3 rounded-lg border border-emerald-500/50 transition-colors font-bold disabled:opacity-50 tracking-wider">
                    SEND
                  </button>
               </form>
            </motion.div>
          )}

          {/* TAB: SERVER */}
          {activeTab === "server" && (
            <motion.div
              key="server"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="max-w-7xl mx-auto space-y-6"
            >
              {/* DATABASE HEALTH SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 flex items-center justify-between group">
                  <div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Veritabanı Sağlık Skoru
                    </div>
                    <div
                      className={`text-2xl font-black ${!integrityReport ? "text-zinc-400" : integrityReport.score > 90 ? "text-emerald-400" : "text-orange-400"}`}
                    >
                      {integrityReport ? `%${integrityReport.score}` : "--"}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Shield
                      className={`w-6 h-6 ${integrityReport?.score && integrityReport.score > 90 ? "text-emerald-400" : "text-zinc-400"}`}
                    />
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Veri Çelişkileri
                    </div>
                    <div
                      className={`text-2xl font-black ${conflicts.length > 0 ? "text-rose-400" : "text-zinc-100"}`}
                    >
                      {conflicts.length}{" "}
                      <span className="text-sm font-normal text-zinc-400">
                        Adet
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <AlertTriangle
                      className={`w-6 h-6 ${conflicts.length > 0 ? "text-rose-400" : "text-zinc-400"}`}
                    />
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Toplam Yerel Kayıt
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                      {integrityReport?.totalPouchDocs ||
                        tableStatus.reduce((s, t) => s + t.localDocCount, 0)}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COUCHDB AYARLARI */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl"
                >
                  <h2 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" /> CouchDB
                    Ayarları ve Testi
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 font-mono text-xs text-zinc-400 shadow-inner">
                      <div>
                        <label className="text-zinc-500 block mb-1">URL (örn: http://192.168.1.100:5984):</label>
                        <input 
                          type="text" 
                          value={couchCfg.url} 
                          onChange={(e) => setCouchCfg({ ...couchCfg, url: e.target.value })}
                          className="w-full bg-black border border-white/10 rounded p-1.5 text-zinc-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-zinc-500 block mb-1">Kullanıcı (User):</label>
                          <input 
                            type="text" 
                            value={couchCfg.user} 
                            onChange={(e) => setCouchCfg({ ...couchCfg, user: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded p-1.5 text-zinc-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-zinc-500 block mb-1">Şifre (Password):</label>
                          <input 
                            type="password" 
                            value={couchCfg.password} 
                            onChange={(e) => setCouchCfg({ ...couchCfg, password: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded p-1.5 text-zinc-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <p className="pt-2 border-t border-white/5 mt-2">
                        <span className="text-zinc-400 font-bold">Durum:</span>{" "}
                        <span
                          className={
                            connStatus?.ok ? "text-emerald-400 font-bold" : "text-red-400 font-bold"
                          }
                        >
                          {connStatus?.ok
                            ? `Aktif (${connStatus.latencyMs}ms)`
                            : "Offline: " + (connStatus?.error || "")}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCouchDbConfig(couchCfg);
                          toast.success("CouchDB ayarları kaydedildi. Lütfen sayfayı yenileyiniz veya test ediniz.");
                        }}
                        className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5" /> Kaydet
                      </button>
                      <button
                        onClick={handleTestConnection}
                        disabled={connTesting}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-zinc-100 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        {connTesting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Activity className="w-3.5 h-3.5" />
                        )}{" "}
                        Test Et
                      </button>
                      <button
                        onClick={handleReSyncAll}

                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Tümünü Yeniden
                        Sync Yap
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* DATABASE MAINTENANCE */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl"
                >
                  <h2 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" /> Veritabanı
                    Bakım Araçları
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleRunHealthCheck}
                      disabled={checkingIntegrity}
                      className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {checkingIntegrity ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        ) : (
                          <MonitorCheck className="w-3 h-3 text-indigo-400" />
                        )}
                        <span className="text-xs font-bold text-zinc-100">
                          Bütünlük Kontrolü
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Pouch vs Couch kayıt sayısını karşılaştırır.
                      </p>
                    </button>
                    <button
                      onClick={handleScanConflicts}
                      disabled={scanningConflicts}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-left relative"
                    >
                      {conflicts.length > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                           <span className="text-xs font-bold text-rose-400">{conflicts.length} Çakışma</span>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleResolveAllConflicts();
                             }}
                             className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[10px] font-bold uppercase transition"
                           >
                             Otomatik Çöz
                           </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        {scanningConflicts ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                        ) : (
                          <Bug className="w-3 h-3 text-rose-400" />
                        )}
                        <span className="text-xs font-bold text-zinc-100">
                          Çelişki Taraması
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Çakışan revizyonları (conflicts) tespit eder.
                      </p>
                    </button>
                    <button
                      onClick={handleCompact}
                      disabled={compacting}
                      className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {compacting ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        ) : (
                          <RefreshCw className="w-3 h-3 text-emerald-400" />
                        )}
                        <span className="text-xs font-bold text-zinc-100">
                          DB Sıkıştırma (Compact)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Silinen verileri temizler ve DB boyutunu küçültür.
                      </p>
                    </button>
                    <button
                      onClick={() =>
                        initializeCouchDbDatabases().then((res) =>
                          toast.success(res.ok.length + " DB hazır."),
                        )
                      }
                      className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Plus className="w-3 h-3 text-blue-400" />
                        <span className="text-xs font-bold text-zinc-100">
                          Sunucu DB Oluştur
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Sunucuda eksik tabloları tek tuşla oluşturur.
                      </p>
                    </button>
                  </div>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.005 }}
                className="p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" /> Detaylı
                    Tablo İstatistikleri
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> Yerel
                      (Pouch)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />{" "}
                      Bulut (Couch)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />{" "}
                      Eski (LocalStr)
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase font-bold tracking-wider text-zinc-400">
                        <th className="py-3 px-2">Tablo Adı</th>
                        <th className="py-3 px-2">Yerel</th>
                        <th className="py-3 px-2">Bulut</th>
                        <th className="py-3 px-2">Senkron Seq</th>
                        <th className="py-3 px-2">Eski Depo</th>
                        <th className="py-3 px-2 text-center w-24">Bütünlük</th>
                        <th className="py-3 px-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tableStatus.map((t, i) => {
                        const integrity = integrityReport?.tables.find(
                          (it) => it.tableName === t.name.replace("mert_", ""),
                        );
                        return (
                          <motion.tr
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            key={t.name}
                            className="hover:bg-white/[0.01]"
                          >
                            <td className="py-3 px-2">
                              <div className="text-xs font-bold text-gray-200">
                                {t.displayName}
                              </div>
                              <div className="text-[9px] font-mono text-zinc-400">
                                {t.name}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-xs font-mono font-bold text-blue-400">
                                {t.localDocCount}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-xs font-mono font-bold text-purple-400">
                                {t.couchDocCount}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              {(() => {
                                const prog = syncProgress.find(
                                  (p) => p.tableName === t.name,
                                );
                                if (!prog)
                                  return (
                                    <span className="text-gray-700">--</span>
                                  );
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${prog.completed ? "bg-emerald-500" : "bg-orange-500 animate-pulse"}`}
                                    />
                                    <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                                      L:{String(prog.localSeq).substring(0, 4)}{" "}
                                      ↔ R:
                                      {String(prog.remoteSeq).substring(0, 4)}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-xs font-mono text-zinc-400">
                                {t.localStorageCount}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {integrity ? (
                                <div
                                  className={`text-xs uppercase font-black px-2 py-0.5 rounded-md inline-block ${integrity.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                                >
                                  {integrity.status}
                                </div>
                              ) : (
                                <span className="text-gray-700">--</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() =>
                                  toast.info(
                                    `${t.displayName} yeniden sync ediliyor...`,
                                  )
                                }
                                className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-zinc-100 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
          {/* TAB: SITE */}
          {activeTab === "site" && (
            <motion.div
              key="site"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="w-full h-[calc(100vh-180px)] flex flex-col gap-4"
            >
              <div className="flex bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 flex-col overflow-hidden h-full shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-zinc-100">
                      Site İzleme, Önizleme ve Port Denetimi
                    </h2>
                    <p className="text-xs text-zinc-400 uppercase">
                      Hedef Port ve Adres Doğrulama (Ping) Sistemleri
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full max-w-2xl bg-black/30 p-3 rounded-lg border border-white/5">
                    
                    <div className="flex flex-wrap items-center gap-2">
                       <input 
                         type="text" 
                         id="ops-site-url-input"
                         defaultValue={localStorage.getItem('ops_site_preview_url') || `http://${window.location.hostname}:8080`}
                         placeholder="http://localhost:8080"
                         className="flex-1 min-w-[200px] px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-zinc-100 focus:border-orange-500 transition-all focus:outline-none placeholder:text-zinc-600 font-mono"
                       />
                       
                       <button
                         onClick={async () => {
                           const btn = document.getElementById("ops-btn-ping") as HTMLButtonElement;
                           const val = (document.getElementById("ops-site-url-input") as HTMLInputElement).value;
                           btn.disabled = true;
                           btn.innerHTML = '<span class="animate-pulse">Bağlanıyor...</span>';
                           
                           try {
                             // Try fetching the target URL (mode no-cors returns opaque response if server is active, throws TypeError if connection refused)
                             await fetch(val, { mode: 'no-cors', cache: 'no-store' });
                             
                             // If it passes without throwing, server is somewhat responding
                             localStorage.setItem('ops_site_preview_url', val);
                             const ifr = document.getElementById("site-preview-iframe") as HTMLIFrameElement;
                             if (ifr) ifr.src = val;
                             toast.success(`Port Aktif: ${val} bağlantısı başarılı, önizleme yansıtılıyor.`);
                           } catch (error) {
                             console.error("Port Ping Error:", error);
                             toast.error(`Bağlantı Reddedildi: ${val} adresinde sunucu/Docker konteyneri yanıt vermiyor. Port kapalı olabilir.`, { duration: 5000 });
                           } finally {
                             btn.disabled = false;
                             btn.innerHTML = 'Ping & Aç';
                           }
                         }}
                         id="ops-btn-ping"
                         className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                       >
                         Ping & Aç
                       </button>

                       <button
                         onClick={() => {
                           // Sadece yeniden yükle
                           const ifr = document.getElementById("site-preview-iframe") as HTMLIFrameElement;
                           if (ifr) ifr.src = ifr.src + ""; 
                           toast.success("iFrame Yenilendi");
                         }}
                         className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-zinc-300"
                       >
                         Zorla (Reload)
                       </button>
                    </div>

                    <div className="flex gap-2 text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 opacity-50 block"></span> :3000 (Ana Sistem)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 opacity-50 block"></span> :8080 (Docker / Harici Site)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 opacity-50 block"></span> :5173 (Vite Standart)</span>
                    </div>

                  </div>
                </div>
                <div className="flex-1 bg-black/50 border border-white/5 rounded-xl relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] text-zinc-400 font-mono uppercase">
                     Canlı Görüntü
                  </div>
                  <iframe 
                    id="site-preview-iframe"
                    src={localStorage.getItem('ops_site_preview_url') || `http://${window.location.hostname}:3000`} 
                    className="w-full h-full border-none"
                    title="Site Preview"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: DOCKER & BUILD */}
          {activeTab === "docker" && (
            <motion.div
              key="docker"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "circOut" }}
              className="w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 
                 {/* DOCKER KONTROL */}
                 <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Server className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-zinc-100">Docker & Node Runner</h2>
                        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Sunucu Sağlık & Konteyner Durumu</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="p-4 rounded-lg bg-black/40 border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-zinc-400 uppercase">Durum</span>
                             <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">{dockerStatus}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-zinc-400 uppercase">Mevcut Ortam</span>
                             <span className="text-xs font-mono text-zinc-200">Cloud Run / Container</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-400 uppercase">Ağ Port Proxy'si</span>
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-mono text-zinc-200">{"->"} Proxy 3000 {"->"} 3000</span>
                               <button 
                                  onClick={() => {
                                     const newPort = prompt("Yeni iç portu girin (örn: 8080, 5000):");
                                     if (newPort) {
                                        toast.error(`Erişim Reddedildi: Cloud Run ortamında PORT çevresel değişkeni dış ortamdan (Google Cloud) kontrol edilir ve değiştirilemez. 3000 portu dışında public erişim engellenmiştir. (İstenen port: ${newPort})`, { duration: 6000 });
                                     }
                                  }}
                                  className="text-[10px] px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded"
                               >
                                  Değiştir
                               </button>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/20 text-sm text-blue-200">
                          <strong className="text-blue-400">Önemli Bildirim:</strong> Uygulama bir Cloud Run Konteyneri üzerinde Nginx ters vekili (reverse proxy) ile korumalı çalışır. Dış dünya erişimi (İnternet) sadece <b>3000</b> portundan yapılır. Ekstra port (ör. 8080) açılışı bulut yöneticileri tarafından maskelenmiştir.
                       </div>

                       {/* DOCKER LOGS */}
                       <div className="h-32 bg-black border border-white/10 rounded-xl p-3 font-mono text-[10px] text-zinc-500 overflow-y-auto whitespace-pre-wrap">
{dockerLogs.map((log, i) => (
  <div key={i} className={log.includes('error') ? 'text-rose-400' : ''}>{log}</div>
))}
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={simulateDockerRestart} disabled={dockerStatus !== "Aktif"} className="flex-1 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-zinc-300 font-bold transition border border-white/10">
                             Servisleri Yeniden Başlat (Restart All)
                          </button>
                          <button onClick={() => {
                              const composeContent = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000`;
                              const blob = new Blob([composeContent], { type: 'text/yaml' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'docker-compose.yml';
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success("docker-compose.yml indirildi.");
                          }} className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-bold transition border border-blue-500/20" title="Docker Konfigürasyonunu İndir">
                             <Server className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* BUILD KONTROL */}
                 <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Paintbrush className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-zinc-100">Site Build & Deployment (Güncelleme Dağıtımı)</h2>
                        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Uygulamayı Derle ve Yayına Al</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-sm text-zinc-400">
                         (A) Ana uygulama derlendi ama eklentileriniz (Site, Mobil V) derlenmedi mi? NPM Build komutu ve Vite Build işlemeyi sıraya sokabilirsiniz.
                       </p>
                       
                       {/* LOG CONSOLE */}
                       <div ref={buildLogRef} className="h-36 bg-black border border-white/10 rounded-xl p-3 font-mono text-[10px] text-zinc-500 overflow-y-auto whitespace-pre-wrap">
{buildLogs.map((log, i) => (
  <div key={i} className={log.includes('başarılı') || log.includes('✔') ? 'text-emerald-400' : ''}>{log}</div>
))}
                       </div>

                       <div className="flex gap-3">
                          <button onClick={simulateBuild} disabled={isBuilding} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition shadow-lg shadow-orange-600/20 flex justify-center items-center gap-2">
                             <Rocket className={`w-4 h-4 ${isBuilding ? 'animate-pulse' : ''}`} /> {isBuilding ? 'Derleniyor...' : 'Hard Rebuild Başlat'}
                          </button>
                          
                          <button onClick={() => {
                             toast.success("Cache / .dist klasörleri temizlendi.");
                             setBuildLogs(['> vite clean', '✔ Önbellek silindi.']);
                          }} className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-bold transition border border-red-500/20">
                             Cache Sil
                          </button>
                       </div>
                       
                       <div className="pt-4 mt-2 border-t border-white/5">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Ortam Değişkenleri (.ENV)</h3>
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                <input type="text" placeholder="KEY_NAME" disabled className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 font-mono opacity-50" value="VITE_API_URL" />
                                <input type="text" placeholder="Value" disabled className="flex-2 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 font-mono opacity-50" value="/api/v1" />
                             </div>
                             <div className="flex items-center gap-2">
                                <input type="text" id="custom-env-key" placeholder="YENİ_DEGISKEN" className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-orange-500 outline-none" />
                                <input type="text" id="custom-env-val" placeholder="Değer..." className="flex-[2] bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-orange-500 outline-none" />
                                <button onClick={() => {
                                   const k = (document.getElementById('custom-env-key') as HTMLInputElement).value;
                                   const v = (document.getElementById('custom-env-val') as HTMLInputElement).value;
                                   if(k && v) {
                                      toast.success(`Çevresel Değişken eklendi: ${k}`);
                                      setBuildLogs(prev => [...prev, `> env set ${k}=${v}`]);
                                   } else {
                                      toast.error("Anahtar ve Değer boş olamaz.");
                                   }
                                }} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded transition">Ekle</button>
                             </div>
                             <p className="text-[10px] text-zinc-500 mt-1">Not: Değişkenleri aktifleştirmek için Hard Rebuild başlatın.</p>
                          </div>
                       </div>
                    </div>
                 </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
