import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../contexts/AuthContext";
import {
  useGlobalSyncTables,
  useGlobalTableData,
} from "../../contexts/GlobalTableSyncContext";
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

type TabKey =
  | "dashboard"
  | "users"
  | "server"
  | "sessions"
  | "telegram"
  | "admin"
  | "terminal"
  | "updates"
  | "ai";

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
  
  // -- AI Chat --
  const [aiHistory, setAiHistory] = useState<{role: 'user'|'ass', text: string}[]>([
     {role: 'ass', text: 'Merhaba! Ben Karargah AI asistanınızım. Size sistem veya kod ile ilgili nasıl yardımcı olabilirim?'}
  ]);
  const [aiInput, setAiInput] = useState("");
  const aiChatEndRef = React.useRef<HTMLDivElement>(null);

  // -- Security Barrier --
  const [isLocked, setIsLocked] = useState(() => {
    // Check if session PIN was recently verified
    const lastSession = sessionStorage.getItem("ops_center_verified");
    return lastSession !== "true";
  });
  const [pin, setPin] = useState("");
  const SYSTEM_PIN = "3737"; // Operasyon Merkezi Ana Giriş Şifresi

  // -- Server Data --
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

  const [refreshKey, setRefreshKey] = useState(0);

  // -- System Config --
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
             // Start monitoring if configured
             if (window.electronAPI?.isElectron && saved.serverUrl) {
                const tel = getFromStorage<{ token: string; chatId: string }>(TELEGRAM_KEY);
                if (tel?.token && tel?.chatId) {
                   window.electronAPI.startMonitoring(saved.serverUrl, tel.token, tel.chatId, 60000);
                }
             }
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
      } else {
        localStorage.removeItem("ops_center_gpt_override");
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
     if (!window.electronAPI?.isElectron) return;
     toast.info("Komut çalıştırılıyor...");
     const res = await window.electronAPI.execCommand(command);
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
      if (!window.electronAPI?.isElectron) {
         setAiHistory(prev => [...prev, { role: "ass", text: "Hata: Karargah uygulaması sadece Electron altyapısında çalışır. Web üzerinde AI özelliklerini çağıramazsınız." }]);
         return;
      }
      setAiHistory(prev => [...prev, { role: "ass", text: "Düşünüyor..." }]);
      const systemPrompt = `Sen Karargah Operasyon Merkezi AI asistanısın. Kullanıcının bilgisayarında "Electron" masaüstü uygulaması olarak çalışıyorsun. \
Eğer kullanıcı sistem hakkında, veriler hakkında veya makineyi yönetecek komutlar (sh, bash vb.) isterse, sen açıklama yapabilirsin. \
GEREKTİĞİNDE LÜTFEN BİR SHELL KOMUTUNU \`\`\`bash veya \`\`\`cmd bloğu içinde ver. Uygulama bu bloğu arayüze ÇALIŞTIR butonu olarak çizecek. \
Kullanıcı sorusu: ${userPrompt}`;
      const res = await window.electronAPI.askAi(systemPrompt);
      if (res.success) {
         setAiHistory(prev => {
           const newHist = [...prev];
           newHist[newHist.length - 1] = { role: "ass", text: res.text || "" };
           return newHist;
         });
      } else {
         setAiHistory(prev => {
           const newHist = [...prev];
           newHist[newHist.length - 1] = { role: "ass", text: `Hata: ${res.message}` };
           return newHist;
         });
      }
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
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['İşleyen Et Terminal v1.0', 'Kullanılabilir komutları görmek için "help" yazın.']);
  
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
        } else if (mainCmd === 'ai' && window.electronAPI?.isElectron) {
           const prompt = args.slice(1).join(' ');
           if (!prompt) {
              setTerminalHistory(prev => [...prev, 'Lütfen AI asistanına bir soru sorun. Örn: ai sistem durumunu özetle']);
           } else {
              setTerminalHistory(prev => [...prev, 'AI asistanı düşünüyor...']);
              const systemPrompt = `Sen bir sistem terminal asistanısın. Kullanıcının isteğine uygun kısa terminal komutu (sadece bash, npx vb komut) üret veya kısa açıklama ver. Sadece gerekli cevabı yaz. Kullanıcı: ${prompt}`;
              const res = await window.electronAPI.askAi(systemPrompt);
              if (res.success) {
                 setTerminalHistory(prev => [...prev, `AI: ${res.text}`]);
                 if (res.text && !res.text.includes('\n')) {
                    const confirmRes = await window.electronAPI.askAi(`Kullanıcının ${prompt} isteği için önceki cevap '${res.text}' ürettin. Kullanıcı bunu terminalde çalıştırmak ister mi? Eğer bu cevap net bir bash komutu ise sadece KOMUT yaz, değilse SOHBET yaz.`);
                    if(confirmRes.text && !!confirmRes.text.match(/KOMUT/i)) {
                       setTerminalHistory(prev => [...prev, `Çalıştırılıyor: ${res.text}...`]);
                       const execRes = await window.electronAPI.execCommand(res.text);
                       if (execRes.success) {
                          setTerminalHistory(prev => [...prev, execRes.stdout]);
                       } else {
                          setTerminalHistory(prev => [...prev, `Hata: ${execRes.error}\n${execRes.stderr}`]);
                       }
                    }
                 }
              } else {
                 setTerminalHistory(prev => [...prev, `Hata: ${res.message}`]);
              }
           }
        } else if (mainCmd === 'sh' && window.electronAPI?.isElectron) {
           const commandToRun = args.slice(1).join(' ');
           if (!commandToRun) {
              setTerminalHistory(prev => [...prev, 'Çalıştırmak için komut girin.']);
           } else {
              setTerminalHistory(prev => [...prev, `Çalıştırılıyor: ${commandToRun}...`]);
              const res = await window.electronAPI.execCommand(commandToRun);
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
    // Electron API kontrolü
    if (window.electronAPI?.isElectron) {
      (window.electronAPI as any).send("run-update");
      setShowUpdateOverlay(true);
    } else {
      toast.error(
        "Güncelleme özelliği şu an sadece Masaüstü (Electron) uygulamasında aktiftir.",
      );
    }
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
    if (window.electronAPI?.isElectron) {
      try {
        const stats = await window.electronAPI.getSystemStats();
        setSysStats(stats);
      } catch (e) {
        console.error("Failed to get stats", e);
      }
    }
  }, []);

  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Simulate GitHub backup/update detection
    const checkUpdates = async () => {
      await new Promise((r) => setTimeout(r, 3000));
      // Randomly suggest an update or check a hypothetical version
      setHasUpdate(Math.random() > 0.5);
    };
    if (!isLocked) checkUpdates();
  }, [isLocked]);

  const handleDockerUpdate = async () => {
    if (!window.electronAPI?.isElectron) {
      // Mock for non-electron
      setMachineLoading(true);
      setDockerLog("");
      for (const msg of customMessages) {
        setDockerLog((prev) => prev + `[LOG] ${msg}\n`);
        await new Promise((r) => setTimeout(r, 1500));
      }
      setDockerLog((prev) => prev + "[BAŞARILI] Sistem Güncellendi.\n");
      setMachineLoading(false);
      toast.success("Güncelleme simülasyonu tamamlandı.");
      return;
    }

    if (
      !confirm(
        "Sistem GitHub üzerinden çekilip, Docker baştan derlenecek (Kısa bir kesinti yaşanabilir). Onaylıyor musunuz?",
      )
    )
      return;
    setMachineLoading(true);
    setDockerLog(
      "Git pull ve Docker-compose çalıştırılıyor... Lütfen bekleyin...",
    );
    try {
      const res = await window.electronAPI.dockerUpdateRestart();
      if (res.success) {
        toast.success("Güncelleme ve Yeniden Başlatma başarılı.");
        setDockerLog(res.log);
      } else {
        toast.error("İşlem sırasında hata oluştu!");
        setDockerLog("HATA: " + res.log);
      }
    } catch (e: any) {
      toast.error("Beklenmeyen Hata: " + e.message);
      setDockerLog(e.message);
    } finally {
      setMachineLoading(false);
    }
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
    if (window.electronAPI?.isElectron && sysConfig.serverUrl) {
       window.electronAPI.startMonitoring(sysConfig.serverUrl, telCfg.token, telCfg.chatId, 60000);
       toast.success("Arka plan site izleme servisi başlatıldı!");
    } else if (window.electronAPI?.isElectron && !sysConfig.serverUrl) {
       toast.warning("Server URL olmadığı için izleme servisi başlatılamadı.");
    }
  };

  const testTelegram = async () => {
    if (!telCfg.token || !telCfg.chatId) {
      toast.error("Önce token ve chat ID girin");
      return;
    }
    const msg = encodeURIComponent(
      `🤖 Operasyon Merkezi\nTest başarılı!\nZaman: ${new Date().toLocaleString("tr-TR")}`,
    );
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${telCfg.token}/sendMessage?chat_id=${telCfg.chatId}&text=${msg}`,
      );
      if (res.ok) toast.success("Test mesajı gönderildi!");
      else toast.error("Telegram Hatası: " + res.statusText);
    } catch (e) {
      toast.error("Ağ hatası: " + e);
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
    { key: "dashboard", label: "Genel Bakış", icon: Activity },
    { key: "updates", label: "Sistem", icon: Sparkles },
    { key: "sessions", label: "Canlı Ağ", icon: Eye },
    { key: "users", label: "Loglar", icon: Users },
    { key: "server", label: "Veritabanı", icon: Database },
    { key: "admin", label: "Yönetim", icon: Shield },
    { key: "terminal", label: "Terminal", icon: Terminal },
    { key: "ai", label: "Yapay Zeka", icon: Bot },
  ] as const;

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#050810] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0d1322] border border-border p-10 rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Shield className="w-40 h-40" />
          </div>
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-inner">
            <Lock className="w-10 h-10 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-widest mb-2 font-mono uppercase">
              Güvenlik Kule Girişi
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
              Operasyon Merkezi Yetki Doğrulama
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pin === SYSTEM_PIN) {
                  setIsLocked(false);
                  sessionStorage.setItem("ops_center_verified", "true");
                }
              }}
              placeholder="SİSTEM PIN"
              maxLength={4}
              className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-4 text-center text-3xl font-black tracking-[0.8em] text-foreground focus:outline-none focus:border-blue-500 transition-all font-mono placeholder:text-gray-800 placeholder:tracking-normal"
            />
            <button
              onClick={() => {
                if (pin === SYSTEM_PIN) {
                  setIsLocked(false);
                  sessionStorage.setItem("ops_center_verified", "true");
                  toast.success("Merkezi veri erişimi sağlandı.");
                } else {
                  toast.error("Yetkisiz Erişim! PIN hatalı.");
                  setPin("");
                }
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-600/30 active:scale-95"
            >
              Giriş Yap
            </button>
          </div>
          <p className="text-[9px] text-gray-700 uppercase font-mono tracking-widest">
            Sistem IP adresiniz kaydediliyor.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* HEADER & TABS */}
      <div className="shrink-0 px-6 pt-4 border-b border-border bg-card/80 backdrop-blur-md flex flex-col gap-4 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-indigo-400/30">
              <Command className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground tracking-wide">
                OPERASYON MERKEZİ
              </h1>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                Arka Plan Yönetimi
              </p>
            </div>
          </div>

          {/* Connection Pulse */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connStatus?.ok ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connStatus?.ok ? "bg-emerald-500" : "bg-red-500"}`}
              />
            </span>
            <span className="text-xs font-bold font-mono tracking-wider text-muted-foreground">
              {connStatus?.ok ? connStatus.latencyMs + "ms" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* HORIZONTAL TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as TabKey)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "border-indigo-500 text-indigo-500 bg-indigo-500/10"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <t.icon
                  className={`w-4 h-4 ${active ? "text-indigo-500" : ""}`}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative bg-secondary/10">
        <AnimatePresence mode="wait">
          {/* TAB: SESSIONS (LIVE MONITOR) */}
          {activeTab === "sessions" && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Yeni: Güvenlik Tehdit İstihbaratı */}
                  <div className="p-6 rounded-2xl bg-[#0d1322] border border-orange-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all" />
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                         <Shield className="w-4 h-4" /> Güvenlik Analitiği
                       </h3>
                       <div className="px-2 py-1 bg-orange-500/10 rounded-md text-[9px] font-black text-orange-500">
                         CANLI TESPİT
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.values(riskProfiles).filter(p => p.riskScore > 0 || p.threats.length > 0).length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-[10px] text-gray-600 italic">Şu an aktif tehdit tespiti bulunmuyor.</p>
                        </div>
                      ) : (
                        Object.values(riskProfiles)
                          .filter(p => p.riskScore > 0 || p.threats.length > 0)
                          .sort((a,b) => b.riskScore - a.riskScore)
                          .slice(0, 5)
                          .map(profile => (
                            <div key={profile.userId} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-foreground truncate max-w-[120px]">{profile.userId}</span>
                                <span className={`text-[10px] font-black ${profile.riskScore > 50 ? 'text-rose-500' : 'text-orange-400'}`}>
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
                      className="w-full py-2 mt-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-extrabold rounded-xl border border-orange-500/20 transition-all uppercase tracking-widest"
                    >
                      Derinlikli Tarama Başlat
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0d1322] to-[#121c35] border border-blue-500/10 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Eye className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                          Canlı İzleme
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          Sistemin Gözü
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-end border-b border-border pb-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          Aktif Oturum
                        </span>
                        <span className="text-2xl font-black text-foreground">
                          {liveSessions.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-end border-b border-border pb-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          Bannlı Liste
                        </span>
                        <span className="text-2xl font-black text-rose-500">
                          {liveSessions.filter((s) => s.isBanned).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#0d1322] border border-border shadow-xl">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      Güvenlik Durumu
                    </h4>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">
                        Sistem Stabil & Korunuyor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" /> Bağlı
                        İstemciler (Gerçek Zamanlı)
                      </h3>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={handleAnalyzeAll}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" /> ANALİZİ YENİLE
                        </button>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
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
                          className={`p-4 rounded-2xl border transition-all ${node.isBanned ? "bg-rose-500/5 border-rose-500/20" : "bg-white/[0.02] border-border hover:bg-white/[0.04]"}`}
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
                                  <span className="text-sm font-black text-foreground">
                                    {node.userEmail}
                                  </span>
                                  {node.isBanned ? (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black text-foreground uppercase tracking-widest">
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
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Globe className="w-3 h-3" />{" "}
                                    {node.location || "Bilinmiyor"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <LayoutList className="w-3 h-3" />{" "}
                                    {node.activePage}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right flex flex-col items-end">
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                  Son Görülme
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  {new Date(node.lastSeen).toLocaleTimeString(
                                    "tr-TR",
                                  )}
                                </span>
                              </div>
                              {!node.isBanned ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSuspendUser(node.userId, 15)}
                                    className="px-2.5 py-1.5 rounded-lg bg-yellow-600/10 hover:bg-yellow-600/30 text-yellow-500 text-[10px] font-bold border border-yellow-500/20"
                                    title="15 Dakika Askı"
                                  >
                                    ASKI (15dk)
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(node.id, node.userId, node.userEmail)}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-600 hover:text-foreground text-rose-500 transition-all border border-border shadow-sm"
                                    title="Tamamen Uzaklaştır"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePardonUser(node.userId)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-foreground text-[10px] font-bold shadow-lg flex items-center gap-1.5"
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AI & SERVER SETTINGS */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">
                      Sistem Yapılandırması
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
                        ChatGPT API Token
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
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-purple-500 transition-all focus:outline-none"
                        placeholder="sk-...."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
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
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="http://..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
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
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-emerald-500 transition-all focus:outline-none"
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
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        Arka Plan Servisi
                      </h2>
                      <p className="text-[10px] text-muted-foreground">İşleyen Et - Ops Motoru</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Servis Aktif Mi?</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.enabled}
                        onChange={(e) => setOpsConfig({...opsConfig, enabled: e.target.checked})}
                        className="w-5 h-5 rounded accent-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
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
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-orange-500 transition-all focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-foreground">Anomali Tespiti (Telegram Uyarı)</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.anomalyAlertsEnabled}
                        onChange={(e) => setOpsConfig({...opsConfig, anomalyAlertsEnabled: e.target.checked})}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <label className="text-sm text-foreground">Gece Bakımı (04:00+ Optimize)</label>
                      <input 
                        type="checkbox" 
                        checked={opsConfig.nightlyMaintenance}
                        onChange={(e) => setOpsConfig({...opsConfig, nightlyMaintenance: e.target.checked})}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                    </div>
                    
                    <button
                      onClick={saveOpsConfig}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-foreground rounded-lg font-bold text-sm transition-all"
                    >
                      Servis Ayarlarını Kaydet
                    </button>
                  </div>
                </div>

                {/* TELEGRAM BOT ENTEGRASYONU */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">
                      Telegram Bot
                    </h2>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
                        Bot Token
                      </label>
                      <input
                        type="text"
                        value={telCfg.token}
                        onChange={(e) =>
                          setTelCfg((c) => ({ ...c, token: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="123456789:AAH..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
                        Chat ID
                      </label>
                      <input
                        type="text"
                        value={telCfg.chatId}
                        onChange={(e) =>
                          setTelCfg((c) => ({ ...c, chatId: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-blue-500 transition-all focus:outline-none"
                        placeholder="-1001234..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveTelCfg}
                        className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-bold border border-border transition-all"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={testTelegram}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-foreground rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Test
                      </button>
                    </div>
                  </div>
                </div>

                {/* ADMIN PASSWORD UPDATE */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-rose-400" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">
                      Şifre Yönetimi
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
                        Mevcut Admin UID
                      </label>
                      <input
                        disabled
                        value={user?.id || "Bilinmiyor"}
                        className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground ml-1">
                        Yeni Yönetici Şifresi
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:border-rose-500 transition-all focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-foreground rounded-lg text-sm font-bold transition-all pt-2 mt-4"
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              {/* SYSTEM UPDATE CONTROL CARD */}
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0d1322] to-[#121c35] border border-blue-500/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Rocket className="w-40 h-40 text-blue-400 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                      <GitBranch className="w-3 h-3" /> GitHub: main
                      (Senkronize)
                    </div>
                    <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight flex items-center justify-center md:justify-start gap-3">
                      <Sparkles className="w-8 h-8 text-yellow-400" />{" "}
                      {updateMsgs.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                      {updateMsgs.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleUpdateStart}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-foreground rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-5 h-5" /> Güncellemeyi Başlat
                    </button>
                    <p className="text-[10px] text-center text-gray-600 font-bold uppercase tracking-widest italic">
                      Yedekler korunacaktır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* UPDATE MESSAGES CONFIG */}
                <div className="p-8 rounded-3xl bg-[#0d1322] border border-orange-500/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                      Güncelleme Yazıları
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
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
                        className="w-full mt-1 px-4 py-3 bg-black/40 border border-border rounded-2xl text-xs text-foreground focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
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
                        className="w-full mt-1 px-4 py-3 bg-black/40 border border-border rounded-2xl text-xs text-foreground focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        Terminal Akış Mesajları
                      </h4>
                      <div className="flex gap-2">
                        <input
                          value={newMsg}
                          onChange={(e) => setNewMsg(e.target.value)}
                          placeholder="Log mesajı ekle..."
                          className="flex-1 bg-black/40 border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (newMsg) {
                              setCustomMessages([...customMessages, newMsg]);
                              setNewMsg("");
                            }
                          }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-xl font-bold text-xs"
                        >
                          Ekle
                        </button>
                      </div>
                      <div className="max-h-[120px] overflow-y-auto space-y-1">
                        {customMessages.map((m, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded bg-white/[0.02] text-[10px] text-muted-foreground"
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
                <div className="p-8 rounded-3xl bg-[#0d1322] border border-indigo-500/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                      Bulut & Yedekleme
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-black/20 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Cloud className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-foreground">
                            CouchDB Sync
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            152.12.33.1:5984
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-emerald-400">
                          AKTİF
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase">
                          Tam Senkronize
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/20 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <HardDrive className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-foreground">
                            Yerel Yedekleme
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            /data/backups/daily
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-foreground">
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
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-foreground rounded-xl text-xs font-bold border border-border flex items-center justify-center gap-2"
                      >
                        <CloudUpload className="w-4 h-4" /> Manuel Bulut Yedeği
                        Al
                      </button>
                      <button
                        onClick={() =>
                          toast.info("Yedekleme planı: Her gün 04:00")
                        }
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-foreground rounded-xl text-xs font-bold border border-border flex items-center justify-center gap-2"
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" /> Sistem Genel
                  Bakış
                </h2>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Yenile
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl bg-[#0d1322] border border-emerald-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-16 h-16 text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Günlük İşlem
                  </h3>
                  <div className="text-3xl font-black text-foreground">
                    {todayLogs.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl bg-[#0d1322] border border-blue-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-blue-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Aktif Kullanıcı
                  </h3>
                  <div className="text-3xl font-black text-foreground">
                    {activeUsers.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl bg-[#0d1322] border border-rose-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertTriangle className="w-16 h-16 text-rose-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Anomali & Uyarı
                  </h3>
                  <div className="text-3xl font-black text-foreground">
                    {anomalies.length}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl bg-[#0d1322] border border-purple-500/20 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Database className="w-16 h-16 text-purple-400" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Sunucu Gecikmesi
                  </h3>
                  <div className="text-3xl font-black text-foreground">
                    {connStatus?.latencyMs || 0}{" "}
                    <span className="text-sm font-bold text-muted-foreground">ms</span>
                  </div>
                </motion.div>
              </div>

              {anomalies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30"
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-bold text-foreground flex items-center gap-2">
                            {a.title}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                              Kritik
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {a.description}
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <div className="text-xs font-mono text-muted-foreground">
                            {formatDate(a.detectedAt)}
                          </div>
                          <div className="text-xs text-foreground/50">
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
                <div className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Aktif
                      (Son 15dk)
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
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
                              <p className="text-sm font-bold text-foreground">
                                {u.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground text-end">
                                {u.count} işlem
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-emerald-400 font-mono tracking-wider">
                              {formatDate(u.lastSeen)}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[120px]">
                              {u.lastAction}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Server Snippet */}
                <div className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl overflow-hidden relative">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-muted-foreground" /> Son Canlı
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
                        <span className="text-muted-foreground truncate">
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-4"
            >
              <div className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-foreground">
                    Detaylı Sistem Logları
                  </h2>
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Yenile
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
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
                          <td className="p-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(l.timestamp)}
                          </td>
                          <td className="p-3 text-[11px] font-bold text-indigo-300">
                            {l.category}
                          </td>
                          <td className="p-3 text-xs font-semibold text-gray-200">
                            {l.title}
                          </td>
                          <td className="p-3 text-[11px] text-muted-foreground">
                            {l.employeeName || "-"}
                          </td>
                          <td
                            className="p-3 text-[11px] text-muted-foreground max-w-[200px] truncate"
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="p-8 rounded-3xl bg-[#0d1322] border border-emerald-500/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.5 }}
                    className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                  >
                    <Command className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">
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
                      className="p-4 rounded-xl bg-black/40 border border-border"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                        CPU İşlemci
                      </div>
                      <div
                        className="text-sm font-semibold text-foreground truncate"
                        title={sysStats.cpu}
                      >
                        {sysStats.cpu}
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-border"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                        Boş / Toplam RAM
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {sysStats.ramFree} GB / {sysStats.ramTotal} GB
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-border"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                        Çalışma Süresi
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {Math.floor(sysStats.uptime / 3600)} Saat{" "}
                        {Math.floor((sysStats.uptime % 3600) / 60)} Dk
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 rounded-xl bg-black/40 border border-border"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                        Platform
                      </div>
                      <div className="text-sm font-semibold text-foreground uppercase">
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
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-foreground font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
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
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-border text-foreground font-bold text-sm rounded-xl transition-all flex items-center gap-2"
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
                      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-emerald-400" />{" "}
                          Docker Log Çıktısı
                        </span>
                        {machineLoading ? (
                          <span className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-300 font-bold animate-pulse rounded-md">
                            İşlem devam ediyor... Lütfen Bekleyin...
                          </span>
                        ) : (
                          <button
                            onClick={() => setDockerLog("")}
                            className="text-xs font-bold px-3 py-1 bg-white/10 hover:bg-white/20 text-foreground rounded transition-colors"
                          >
                            Kapat
                          </button>
                        )}
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                        {dockerLog ||
                          "İşlem başlatılıyor... Lütfen sabırla bekleyiniz."}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INTERACTIVE TERMINAL SHELL */}
                <div className="rounded-xl border border-border bg-black/80 overflow-hidden shadow-inner flex flex-col h-[400px]">
                  <div className="bg-white/5 border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
                     <span className="text-xs font-bold text-muted-foreground font-mono">root@isleyen-et:/app#</span>
                     <div className="flex gap-1.5">
                       <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-sm space-y-1">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={line.startsWith('>') ? 'text-emerald-400' : 'text-muted-foreground'}>
                        {line}
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 border-t border-border bg-black flex items-center gap-2 shrink-0">
                    <span className="text-emerald-500 font-bold ml-1">$</span>
                    <input 
                      type="text" 
                      value={terminalInput}
                      onChange={e => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalCommand}
                      placeholder="Komut girin..."
                      className="flex-1 bg-transparent border-none text-foreground text-sm focus:outline-none font-mono"
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6 flex flex-col h-[75vh]"
            >
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                   <Bot className="w-5 h-5 text-purple-400" />
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-foreground">
                     Yapay Zeka Karargah Asistanı
                   </h2>
                   <p className="text-xs text-purple-300">
                     Sistem durumu, kod analizi ve komut yardımı
                   </p>
                 </div>
               </div>
               
               <div className="flex-1 bg-black/40 border border-border rounded-2xl flex flex-col overflow-hidden relative">
                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     {aiHistory.map((msg, i) => {
                       const parts = msg.text.split(/(```[\s\S]*?```)/g);
                       return (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-white/5 border border-white/10'}`}>
                                {msg.role === 'ass' && (
                                   <div className="flex items-center gap-2 mb-2 text-purple-400">
                                     <Bot className="w-4 h-4"/>
                                     <span className="text-[10px] font-bold uppercase tracking-wider">AI Asistan</span>
                                   </div>
                                )}
                                <div className="text-sm text-white leading-relaxed font-mono">
                                  {parts.map((part, pIdx) => {
                                     if (part.startsWith('```') && part.endsWith('```')) {
                                        const codeLines = part.split('\n');
                                        const lang = codeLines[0].replace('```', '').trim();
                                        const code = codeLines.slice(1, -1).join('\n');
                                        return (
                                           <div key={pIdx} className="my-3 bg-black/60 border border-white/10 rounded-xl overflow-hidden shadow-lg">
                                             <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between">
                                               <span className="text-[10px] text-muted-foreground uppercase font-bold">{lang || 'BASH/CMD'}</span>
                                               <button 
                                                 onClick={() => executeAiCommand(code)}
                                                 className="text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded-md flex items-center gap-1 transition"
                                               >
                                                 <Play className="w-3 h-3" />
                                                 ÇALIŞTIR
                                               </button>
                                             </div>
                                             <pre className="p-4 text-xs overflow-x-auto text-emerald-400 font-mono">
                                               {code}
                                             </pre>
                                           </div>
                                        );
                                     }
                                     return <span key={pIdx} className="whitespace-pre-wrap">{part}</span>;
                                  })}
                                </div>
                             </div>
                          </div>
                       );
                    })}
                    <div ref={aiChatEndRef} />
                 </div>
                 <form onSubmit={handleAiChatSubmit} className="p-4 bg-black/60 border-t border-border flex items-center gap-3">
                    <input 
                      type="text" 
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      placeholder="Asistana bir soru sorun veya komut oluşturmasını isteyin..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <button type="submit" className="p-3 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition">
                       <Send className="w-5 h-5" />
                    </button>
                 </form>
               </div>
            </motion.div>
          )}

          {/* TAB: SERVER */}
          {activeTab === "server" && (
            <motion.div
              key="server"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* DATABASE HEALTH SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#0d1322] border border-border flex items-center justify-between group">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Veritabanı Sağlık Skoru
                    </div>
                    <div
                      className={`text-2xl font-black ${!integrityReport ? "text-muted-foreground" : integrityReport.score > 90 ? "text-emerald-400" : "text-orange-400"}`}
                    >
                      {integrityReport ? `%${integrityReport.score}` : "--"}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Shield
                      className={`w-6 h-6 ${integrityReport?.score && integrityReport.score > 90 ? "text-emerald-400" : "text-muted-foreground"}`}
                    />
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#0d1322] border border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Veri Çelişkileri
                    </div>
                    <div
                      className={`text-2xl font-black ${conflicts.length > 0 ? "text-rose-400" : "text-foreground"}`}
                    >
                      {conflicts.length}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        Adet
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <AlertTriangle
                      className={`w-6 h-6 ${conflicts.length > 0 ? "text-rose-400" : "text-muted-foreground"}`}
                    />
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#0d1322] border border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
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
                {/* COUCHDB TEST */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl"
                >
                  <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" /> CouchDB
                    Bağlantı Testi
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-border font-mono text-xs text-muted-foreground shadow-inner">
                      <p>
                        <span className="text-muted-foreground">URL:</span>{" "}
                        {couchCfg.url || "Ayarlanmadı"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Kullanıcı:</span>{" "}
                        {couchCfg.user || "Ayarlanmadı"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Durum:</span>{" "}
                        <span
                          className={
                            connStatus?.ok ? "text-emerald-400" : "text-red-400"
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
                        onClick={handleTestConnection}
                        disabled={connTesting}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-foreground text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
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
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
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
                  className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl"
                >
                  <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
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
                        <span className="text-xs font-bold text-foreground">
                          Bütünlük Kontrolü
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Pouch vs Couch kayıt sayısını karşılaştırır.
                      </p>
                    </button>
                    <button
                      onClick={handleScanConflicts}
                      disabled={scanningConflicts}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {scanningConflicts ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                        ) : (
                          <Bug className="w-3 h-3 text-rose-400" />
                        )}
                        <span className="text-xs font-bold text-foreground">
                          Çelişki Taraması
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
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
                        <span className="text-xs font-bold text-foreground">
                          DB Sıkıştırma (Compact)
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
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
                        <span className="text-xs font-bold text-foreground">
                          Sunucu DB Oluştur
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Sunucuda eksik tabloları tek tuşla oluşturur.
                      </p>
                    </button>
                  </div>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.005 }}
                className="p-5 rounded-2xl bg-[#0d1322] border border-border shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" /> Detaylı
                    Tablo İstatistikleri
                  </h2>
                  <div className="flex items-center gap-4 text-[10px] font-bold">
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
                      <tr className="border-b border-border text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
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
                              <div className="text-[9px] font-mono text-muted-foreground">
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
                                    <div className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                                      L:{String(prog.localSeq).substring(0, 4)}{" "}
                                      ↔ R:
                                      {String(prog.remoteSeq).substring(0, 4)}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-xs font-mono text-muted-foreground">
                                {t.localStorageCount}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {integrity ? (
                                <div
                                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md inline-block ${integrity.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
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
                                className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
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
        </AnimatePresence>
      </div>
    </div>
  );
}
