// [AJAN-2 | claude/serene-gagarin | 2026-03-25] Son düzenleyen: Claude Opus 4.6
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import { NotificationPanel } from './NotificationPanel';
import { NodeStatusBadge } from './NodeStatusPanel';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getFromStorage, StorageKey } from '../utils/storage';
import { createPouchBackup, downloadBackup } from '../lib/pouchdb-backup';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Wallet, 
  Truck, 
  UserCog,
  LogOut,
  UserCircle,
  ChevronDown,
  Check,
  FileText,
  Receipt,
  FolderOpen,
  Settings,
  ShieldAlert,
  Database,
  ShoppingCart,
  MessageSquare,
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Banknote,
  Search,
  Command,
  CalendarCheck,
  AlertTriangle,
  ArrowLeftRight,
  Factory,
  Megaphone,
  Globe,
  FileEdit,
  FileCheck,
  Warehouse,
  ChevronUp,
  Minus,
  Square,
  X,
  WifiOff,
  CloudLightning,
  RefreshCw,
  Server
} from 'lucide-react';
import { toast } from 'sonner';
import { ProfileEditModal } from './ProfileEditModal';
import { RoleRequestModal } from './RoleRequestModal';
import { CommandPalette } from './CommandPalette';
import { useLanguage } from '../contexts/LanguageContext';
import { logActivity } from '../utils/activityLogger';
import { trackUserActivity } from '../lib/active-client';
import { checkAccess } from '../utils/security-brain';
import { useSecurityMonitor } from '../hooks/useSecurityMonitor';
import { updateSessionActivity, getSecurityPolicy } from '../utils/security';
import { MobileBottomNav } from './MobileBottomNav';
import { ScrollToTop } from './MobileHelpers';
import { useIsMobile } from '../hooks/useMobile';
import { CURRENT_VERSION } from '../utils/updateNotes';
import { usePouchSyncStatus } from '../hooks/usePouchSyncStatus';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

function CustomElectronTitleBar() {
  if (!isElectron) return null;

  return (
    <div 
      className="flex items-center justify-between bg-[#0a0d14] border-b border-white/5 h-8 w-full z-[100] shrink-0" 
      style={{ WebkitAppRegion: 'drag', WebkitUserSelect: 'none' } as any}
    >
      <div className="flex px-3 items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300">Karargah Hub OS</span>
      </div>
      
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={() => (window as any).electronAPI?.minimize?.()} 
          className="h-full px-4 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => (window as any).electronAPI?.maximize?.()} 
          className="h-full px-4 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button 
          onClick={() => (window as any).electronAPI?.close?.()} 
          className="h-full px-4 hover:bg-red-500 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SyncStatusIndicator() {
  const { isOnline, isSyncing, totalPending, errorCount } = usePouchSyncStatus();

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold select-none cursor-default transition-colors ${
          !isOnline ? 'bg-red-500/10 border-red-500/20 text-red-500' :
          errorCount > 0 ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
          isSyncing ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
          totalPending > 0 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hidden sm:flex'
        }`}>
          {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : 
           isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 
           <CloudLightning className="w-3.5 h-3.5" />}
          
          <span className="hidden md:inline">
            {!isOnline ? 'Çevrimdışı Mod' :
             errorCount > 0 ? 'Senkronizasyon Hatası' :
             isSyncing ? 'Sunucuya Senkronize Ediliyor...' :
             totalPending > 0 ? `${totalPending} Bekleyen Veri` :
             'Bulut Güncel'}
          </span>
          {totalPending > 0 && !isSyncing && isOnline && (
            <span className="ml-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded shadow-xl border border-gray-800"
          sideOffset={5}
        >
          {!isOnline 
            ? 'İnternet bağlantınız yok. Yapılan değişiklikler sadece cihaza kaydedilir, bağlantı gelince sunucuyla otomatik eşitlenir.' 
            : isSyncing 
              ? 'Verileriniz ana sunucu (bulut) ve Karargah ile senkronize ediliyor.'
              : totalPending > 0 
                ? `${totalPending} adet veri sunucuya gitmek için kuyrukta bekliyor.`
                : 'Tüm verileriniz uzak sunucuyla ve yerel ağla anlık olarak eşit.'}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface MenuItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
  permKey?: string;
}

interface MenuGroup {
  groupKey: string;
  titleKey: string;
  icon: React.ElementType;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    groupKey: 'basit',
    titleKey: 'Basit',
    icon: Zap,
    items: [
      { path: '/sales', labelKey: 'nav.sales', icon: ShoppingCart, color: 'green', permKey: 'satis' },
      { path: '/tahsilat', labelKey: 'nav.collection', icon: Banknote, color: 'lime', permKey: 'kasa' },
      { path: '/cari', labelKey: 'nav.customers', icon: Users, color: 'sky', permKey: 'cari' },
      { path: '/cekler', labelKey: 'nav.checks', icon: FileEdit, color: 'purple', permKey: 'kasa' },
      { path: '/stok', labelKey: 'nav.stock', icon: Package, color: 'indigo', permKey: 'stok' },
      { path: '/iceberg', labelKey: 'nav.iceberg', icon: Warehouse, color: 'cyan', permKey: 'stok' },
    ]
  },
  {
    groupKey: 'gelismis',
    titleKey: 'Gelişmiş',
    icon: Settings,
    items: [
      { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, color: 'blue', permKey: 'dashboard' },
      { path: '/kasa', labelKey: 'nav.cash', icon: Wallet, color: 'emerald', permKey: 'kasa' },
      { path: '/faturalar', labelKey: 'nav.invoices', icon: FileCheck, color: 'indigo', permKey: 'kasa' },
      { path: '/stok-hareket', labelKey: 'nav.stockMovement', icon: ArrowLeftRight, color: 'cyan', permKey: 'stok' },
      { path: '/uretim', labelKey: 'nav.production', icon: Factory, color: 'orange', permKey: 'stok' },
      { path: '/fis-gecmisi', labelKey: 'nav.receiptHistory', icon: Receipt, color: 'amber', permKey: 'raporlar' },
      { path: '/raporlar', labelKey: 'nav.reports', icon: FileText, color: 'cyan', permKey: 'raporlar' },
      { path: '/personel', labelKey: 'nav.personnel', icon: UserCog, color: 'purple', permKey: 'personel' },
      { path: '/arac', labelKey: 'nav.vehicles', icon: Truck, color: 'orange', permKey: 'personel' },
      { path: '/pazarlama', labelKey: 'nav.marketing', icon: Megaphone, color: 'pink', permKey: 'ayarlar' },
      { path: '/dosyalar', labelKey: 'nav.files', icon: FolderOpen, color: 'teal', permKey: 'ayarlar' },
      { path: '/sunucu', labelKey: 'breadcrumb.server', icon: Server, color: 'blue', permKey: 'ayarlar' },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings, color: 'gray', permKey: 'ayarlar' },
      { path: '/ops-center', labelKey: 'Karargah', icon: Command, color: 'blue', permKey: 'ayarlar' },
      { path: '/data-audit', labelKey: 'nav.dataAudit', icon: ShieldAlert, color: 'rose', permKey: 'ayarlar' },
      { path: '/yedekler', labelKey: 'nav.backups', icon: Database, color: 'slate', permKey: 'ayarlar' },
      { path: '/guvenlik', labelKey: 'nav.security', icon: ShieldAlert, color: 'red', permKey: 'ayarlar' },
    ]
  }
];

// Flat list helper for breadcrumbs and checks if needed
const menuItems = menuGroups.flatMap(g => g.items);

// Path → Breadcrumb i18n key mapping
const breadcrumbKeyMap: Record<string, string> = {
  '/dashboard': 'breadcrumb.dashboard',
  '/sales': 'breadcrumb.sales',
  '/stok': 'breadcrumb.stock',
  '/iceberg': 'Iceberg (Soğuk Hava)',
  '/stok-hareket': 'breadcrumb.stockMovement',
  '/uretim': 'breadcrumb.production',
  '/cari': 'breadcrumb.customers',
  '/kasa': 'breadcrumb.cash',
  '/tahsilat': 'breadcrumb.collection',
  '/cekler': 'breadcrumb.checks',
  '/gun-sonu': 'breadcrumb.dayEnd',
  '/arac': 'breadcrumb.vehicles',
  '/personel': 'breadcrumb.personnel',
  '/raporlar': 'breadcrumb.reports',
  '/fis-gecmisi': 'breadcrumb.receiptHistory',
  '/faturalar': 'breadcrumb.invoices',
  '/dosyalar': 'breadcrumb.files',
  '/pazarlama': 'breadcrumb.marketing',
  '/yedekler': 'breadcrumb.backups',
  '/chat': 'breadcrumb.aiAssistant',
  '/guvenlik': 'breadcrumb.security',
  '/settings': 'breadcrumb.settings',
  '/ops-center': 'Karargah',
  '/data-audit': 'breadcrumb.dataAudit',
  '/sunucu': 'breadcrumb.server',
};

// Spring physics animation config
const springConfig = {
  type: "spring" as const,
  stiffness: 240,
  damping: 26,
  mass: 1.0
};

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 15,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springConfig,
      scale: { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 },
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.995,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Current time display
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums"
    >
      <motion.span
        key={time.getSeconds()}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </motion.span>
    </motion.div>
  );
}

export function MainLayout() {
  const { user, logout } = useAuth();
  const { currentEmployee, availableEmployees = [], setCurrentEmployee } = useEmployee();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang, languages } = useLanguage();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRoleRequestModalOpen, setIsRoleRequestModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const isMobile = useIsMobile();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
     let defaultGroups: Record<string, boolean> = {};
     menuGroups.forEach(g => {
        if(g.items.some(i => location.pathname.startsWith(i.path))) {
           defaultGroups[g.groupKey] = true;
        }
     });
     // Eğer hiçbir grup açık değilse Dashboard (ticari) açık olsun
     if (Object.keys(defaultGroups).length === 0) defaultGroups['ticari'] = true;
     return defaultGroups;
  });

  useEffect(() => {
     const timer = setTimeout(() => setShowSplash(false), 2200);
     return () => clearTimeout(timer);
  }, []);

  const toggleGroup = (key: string) => {
    setOpenGroups(p => ({ ...p, [key]: !p[key] }));
  };

  // ─── Global Security Monitor ─────────────────────────────────────
  useSecurityMonitor(!!user);

  // Gerçek zamanlı tehdit toast bildirimleri
  useEffect(() => {
    if (!user) return;
    const handleThreat = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const severity = detail.severity;
      if (severity === 'critical') {
        toast.error(`🚨 KRİTİK TEHDİT: ${detail.title}`, { duration: 8000 });
      } else if (severity === 'high') {
        toast.warning(`⚠️ Yüksek Risk: ${detail.title}`, { duration: 5000 });
      }
    };
    window.addEventListener('security_threat', handleThreat);
    return () => window.removeEventListener('security_threat', handleThreat);
  }, [user]);

  // Dinamik oturum zaman aşımı (güvenlik politikasından)
  const sessionTimeoutMs = useMemo(() => {
    try { return getSecurityPolicy().sessionTimeoutMinutes * 60 * 1000; }
    catch { return 15 * 60 * 1000; }
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    queueMicrotask(() => {
      setIsMobileSidebarOpen(false);
    });
  }, [location.pathname]);

  // Security: Auto-logout on idle (15 minutes)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const IDLE_TIMEOUT = sessionTimeoutMs; // Dinamik zaman aşımı

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (user) {
          logActivity('security_alert', 'Otomatik oturum kapatma (Inactivity)', { 
            employeeName: user.name, 
            level: 'medium', 
            description: `${Math.round(sessionTimeoutMs / 60000)} dakika hareketsizlik nedeniyle oturum kapatıldı.` 
          });
          logout();
          toast.error("Oturum zaman aşımına uğradı. Güvenlik nedeniyle çıkış yapıldı.");
          navigate('/login');
        }
      }, IDLE_TIMEOUT);
    };

    // Her harekette oturum aktivitesini de güncelle (throttled — 60s)
    let lastSessionUpdate = 0;
    const handleActivity = () => {
      resetTimer();
      const now = Date.now();
      if (now - lastSessionUpdate > 60_000) {
        lastSessionUpdate = now;
        updateSessionActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity, true));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, handleActivity, true));
    };
  }, [user, logout, navigate, sessionTimeoutMs]);

  // Route Protection (RBAC)
  useEffect(() => {
    if (!user || user.role === 'Yönetici' || user.id === 'admin-super' || user.id === 'admin-1') return;

    // Bulunan path'in permKey'ini bul
    const currentItem = menuItems.find(item => 
      location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
    );

    if (currentItem && currentItem.permKey) {
      const hasPermission = currentEmployee?.permissions?.includes(currentItem.permKey);
      if (!hasPermission) {
        toast.error('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
        logActivity('security_alert', 'Yetkisiz erisim denemesi', { page: location.pathname, employeeName: user.name, level: 'high' });
        navigate('/dashboard');
      }
    }
  }, [location.pathname, user, currentEmployee, navigate]);

  // Live sidebar badges
  const [badgeData, setBadgeData] = useState({ criticalStock: 0, todayFisCount: 0 });
  useEffect(() => {
    const updateBadges = () => {
      try {
        const stok = getFromStorage<any[]>(StorageKey.STOK_DATA) || [];
        const fisler = getFromStorage<any[]>(StorageKey.FISLER) || [];
        const todayISO = new Date().toISOString().split('T')[0];
        const criticalStock = stok.filter(s => {
          const stock = Number(s.currentStock ?? s.current_stock ?? 0) || 0;
          const min = Number(s.minStock ?? s.min_stock ?? 0) || 0;
          return stock <= min && min > 0;
        }).length;
        const todayFisCount = fisler.filter(f => f.date?.startsWith(todayISO)).length;
        setBadgeData({ criticalStock, todayFisCount });
      } catch (err) {
        // Ignore storage access error
      }
    };
    updateBadges();
    window.addEventListener('storage_update', updateBadges);
    const interval = setInterval(updateBadges, 30000);
    return () => {
      window.removeEventListener('storage_update', updateBadges);
      clearInterval(interval);
    };
  }, []);

  // Ctrl+K shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Breadcrumb
  const currentPageLabel = useMemo(() => {
    if (location.pathname.startsWith('/cari/')) return t('breadcrumb.customerDetail');
    const key = breadcrumbKeyMap[location.pathname];
    return key ? t(key) : '';
  }, [location.pathname, t]);

  // Canlı İzleme Sistemi ve Ban Kontrolü
  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      // Gelişmiş güvenlik kontrolü (security-brain üzerinden)
      const access = checkAccess(user.id);
      if (!access.allowed) {
        toast.error(access.reason || "Üzgünüz, bu sisteme erişiminiz kısıtlanmıştır.", {
          description: "Güvenlik birimi tarafından uzaklaştırıldınız.",
          duration: 999999
        });
        logout();
        navigate('/login');
        return;
      }

      try {
        const { getDb } = await import('../lib/pouchdb');
        const db = getDb('user_sessions');
        // PouchDB session bazlı yedek kontrol
        const sessionId = sessionStorage.getItem('isleyen_et_current_session_id');
        if (sessionId) {
          const session: any = await db.get(sessionId).catch(() => null);
          if (session && session.isBanned) {
            toast.error("Oturumunuz sonlandırıldı.");
            logout();
            navigate('/login');
          }
        }
      } catch (err) {
        // Ignore session check error
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // 30 saniyede bir kontrol
    return () => clearInterval(interval);
  }, [user, navigate, logout]);

  // Sayfa degisikligi loglama & Canlı İzleme (Active Sessions)
  useEffect(() => {
    const pageKey = breadcrumbKeyMap[location.pathname];
    const pageTitle = pageKey ? t(pageKey) : location.pathname;
    
    // Eski logging sistemi
    logActivity('page_visit', pageTitle, {
      page: location.pathname,
      employeeId: currentEmployee?.id,
      employeeName: currentEmployee?.name,
    });

    // Yeni Canlı İzleme Sistemi (active-client)
    if (user) {
      trackUserActivity(user.username || 'anonim', location.pathname, user.id);
    }
  }, [location.pathname, user, currentEmployee, t]);

  // Kullanici yoksa login'e yonlendir
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    toast.success(t('auth.loggedOut'));
    navigate('/login');
  }, [logout, navigate, t]);

  const handleBackup = useCallback(async () => {
    try {
      const result = await createPouchBackup();
      if (result.ok && result.backup) {
        downloadBackup(result.backup);
        toast.success(`Yedek oluşturuldu: ${result.totalDocs} kayıt`);
      } else {
        toast.error('Yedek alınamadı: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  }, [t]);

  const handleEmployeeSwitch = useCallback((employee: typeof currentEmployee) => {
    if (employee) {
      setCurrentEmployee(employee);
      toast.success(`${employee.name} olarak giriş yapıldı`);
    }
  }, [setCurrentEmployee]);

  if (!user) {
    return null;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="h-dvh bg-background flex flex-col relative overflow-hidden text-foreground">
        <CustomElectronTitleBar />
        
        {/* Startup Splash Animation */}
        <AnimatePresence>
          {showSplash && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-[99999] bg-[#0a0d14] flex flex-col items-center justify-center overflow-hidden"
            >
               <motion.div
                 initial={{ opacity: 0, scale: 0.8, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                 className="flex flex-col items-center justify-center relative"
               >
                 <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.4)] mb-8 border border-white/10 relative overflow-hidden">
                   <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                     className="absolute -inset-10 bg-[conic-gradient(from_90deg,transparent_0%,rgba(37,99,235,0.4)_50%,transparent_100%)]"
                   />
                   <div className="absolute inset-[2px] bg-[#0a0d14] rounded-[22px] flex items-center justify-center z-10">
                     <Zap className="w-10 h-10 text-blue-500" />
                   </div>
                 </div>
                 
                 <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                   Hoş Geldiniz, <span className="text-blue-400">{user?.name || "Kullanıcı"}</span>
                 </h1>
                 <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase mb-10">
                   KARARGAH OS Yükleniyor...
                 </p>
                 
                 <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                   <motion.div
                     initial={{ width: "0%" }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 1.8, ease: "easeInOut" }}
                     className="h-full bg-blue-500 rounded-full"
                   />
                 </div>
               </motion.div>
               
               <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)' }} />
            </motion.div>
          )}
        </AnimatePresence>

      <div className="flex-1 flex min-h-0 relative z-0">
        {/* Subtle Background Ambient Glow */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] bg-blue-500/[0.08] rounded-full blur-[160px]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-purple-500/[0.06] rounded-full blur-[150px]" />
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[40%] left-[50%] w-[35%] h-[35%] bg-emerald-500/[0.05] rounded-full blur-[140px]" />
        </div>

          {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
              className="fixed top-0 left-0 bottom-0 w-[270px] bg-sidebar/98 backdrop-blur-2xl border-r border-sidebar-border flex flex-col z-[100] lg:hidden overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
            >
              {/* Mobile Sidebar inner gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.03] via-transparent to-indigo-600/[0.02] pointer-events-none" />

              {/* Mobile Logo & Close */}
              <div className="p-4 border-b border-border relative flex items-center justify-between">
                <Link to="/dashboard" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/25 flex-shrink-0">
                    <Package className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h1 className="text-foreground font-bold text-lg tracking-tight whitespace-nowrap">İŞLEYEN ET</h1>
                    <p className="text-muted-foreground/60 text-[10px] font-semibold tracking-[0.2em]">ERP {CURRENT_VERSION} KALKAN</p>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                >
                  <ChevronsLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-2 py-3 overflow-y-auto">
                <div className="space-y-4">
                  {menuGroups.map((group) => {
                    const groupItems = group.items.filter(item => {
                      return user?.id === 'admin-super' || user?.id === 'admin-1' || user?.role === 'Yönetici' ||
                        (currentEmployee?.permissions && item.permKey && currentEmployee.permissions.includes(item.permKey));
                    });
                    if (groupItems.length === 0) return null;
                    const isOpen = openGroups[group.groupKey];

                    return (
                      <div key={group.groupKey} className="space-y-1">
                        <button
                          onClick={() => toggleGroup(group.groupKey)}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <group.icon className="w-3.5 h-3.5" />
                            {group.titleKey}
                          </span>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-0.5 overflow-hidden"
                            >
                              {groupItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path ||
                                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                                return (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                      isActive ? 'text-foreground bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-600/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                    }`}
                                  >
                                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                                    <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </nav>

              {/* Mobile User Section */}
              <div className="p-3 border-t border-border/60 space-y-2">
                {/* Kullanıcı bilgi kartı */}
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-border">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.role}</p>
                    </div>
                  </div>
                )}
                {/* Çıkış butonu */}
                <button
                  onClick={() => { setIsMobileSidebarOpen(false); handleLogout(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98] transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('userMenu.logout')}</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isCollapsed ? 72 : 260 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="hidden lg:flex bg-sidebar/95 backdrop-blur-2xl border-r border-sidebar-border flex-col z-10 relative overflow-hidden"
        >
          {/* Sidebar inner gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.03] via-transparent to-indigo-600/[0.02] pointer-events-none" />

          {/* Logo & Company */}
          <div className="p-4 border-b border-border relative">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.12, rotate: 4, boxShadow: '0 0 22px rgba(99,102,241,0.55)' }}
                whileTap={{ scale: 0.93, rotate: -2 }}
                transition={{ type: 'spring', stiffness: 520, damping: 28, mass: 0.7 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0 relative overflow-hidden"
              >
                <Package className="w-5 h-5 text-foreground relative z-10" />
                {/* Shine sweep */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent skew-x-12"
                  animate={{ x: [-56, 56] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 5, ease: [0.4, 0, 0.6, 1] }}
                />
                {/* Subtle pulse glow overlay */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-white/5"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                />
              </motion.div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <h1 className="text-foreground font-bold text-lg tracking-tight group-hover:text-blue-400 transition-colors whitespace-nowrap">
                      ISLEYEN ET
                    </h1>
                    <p className="text-muted-foreground/60 text-[10px] font-semibold tracking-[0.2em]">ERP {CURRENT_VERSION} KALKAN</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Collapse Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCollapsed(prev => !prev)}
            className="absolute top-[72px] -right-3 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-blue-600 hover:border-blue-500 transition-all z-20 shadow-lg"
          >
            {isCollapsed ? <ChevronsRight className="w-3 h-3" /> : <ChevronsLeft className="w-3 h-3" />}
          </motion.button>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {menuGroups.map((group) => {
                const groupItems = group.items.filter(item => {
                  return user?.id === 'admin-super' || user?.id === 'admin-1' || user?.role === 'Yönetici' ||
                         (currentEmployee?.permissions && item.permKey && currentEmployee.permissions.includes(item.permKey));
                });
                
                if (groupItems.length === 0) return null;
                const isOpen = openGroups[group.groupKey];

                return (
                  <div key={group.groupKey} className="space-y-1">
                    {!isCollapsed ? (
                      <button 
                        onClick={() => toggleGroup(group.groupKey)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <group.icon className="w-3.5 h-3.5" />
                          {group.titleKey}
                        </span>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <div className="flex justify-center py-2 relative group-tooltip">
                        <group.icon className="w-4 h-4 text-muted-foreground/60" />
                        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-foreground text-[10px] rounded opacity-0 group-tooltip-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {group.titleKey}
                        </span>
                      </div>
                    )}
                    
                    <AnimatePresence>
                      {(isOpen || isCollapsed) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-0.5 overflow-hidden"
                        >
                          {groupItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || 
                                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                            const isHovered = hoveredItem === item.path;
                            
                            // Dynamic badges
                            const dynamicBadge = 
                              item.path === '/stok' && badgeData.criticalStock > 0 ? badgeData.criticalStock :
                              item.path === '/fis-gecmisi' && badgeData.todayFisCount > 0 ? badgeData.todayFisCount :
                              item.badge;
                            const isCriticalBadge = item.path === '/stok' && badgeData.criticalStock > 0;

                            const linkContent = (
                              <Link
                                key={item.path}
                                to={item.path}
                                onMouseEnter={() => setHoveredItem(item.path)}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`
                                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ripple-effect
                                  ${isCollapsed ? 'justify-center px-0' : ''}
                                  ${isActive 
                                    ? 'text-foreground' 
                                    : 'text-muted-foreground hover:text-foreground'
                                  }
                                `}
                              >
                                {/* Active Background */}
                                {isActive && (
                                  <motion.div
                                    layoutId="activeNavBg"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg shadow-blue-600/20"
                                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                                  />
                                )}
                                
                                {/* Hover Background */}
                                {!isActive && isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-secondary/50 rounded-lg"
                                  />
                                )}

                                {/* Active Left Bar — glow ile */}
                                {isActive && (
                                  <>
                                    <motion.div
                                      layoutId="activeNavBar"
                                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-300 rounded-full"
                                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                                      style={{ boxShadow: '0 0 8px rgba(147,197,253,0.8)' }}
                                    />
                                    <motion.div
                                      layoutId="activeNavGlow"
                                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-blue-400/30 rounded-full blur-md"
                                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                                    />
                                  </>
                                )}

                                <motion.div
                                  className="relative z-10 flex-shrink-0"
                                  whileHover={{ scale: 1.18, rotate: isActive ? 0 : 6 }}
                                  whileTap={{ scale: 0.88 }}
                                  transition={{ type: 'spring', stiffness: 600, damping: 28, mass: 0.5 }}
                                >
                                  <Icon className="w-[18px] h-[18px]" />
                                  {/* Collapsed badge dot */}
                                  {isCollapsed && dynamicBadge && (
                                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-popover ${
                                      isCriticalBadge ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                                    }`} />
                                  )}
                                </motion.div>
                                
                                <AnimatePresence>
                                  {!isCollapsed && (
                                    <motion.span
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -8 }}
                                      transition={{ duration: 0.15 }}
                                      className="relative z-10 whitespace-nowrap"
                                    >
                                      {t(item.labelKey)}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                                
                                {dynamicBadge && !isCollapsed && (
                                  <motion.span
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 520, damping: 24, mass: 0.6 }}
                                    className={`relative z-10 ml-auto text-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                      isCriticalBadge ? 'bg-red-500' : 'bg-blue-500/80'
                                    }`}
                                  >
                                    {isCriticalBadge && (
                                      <motion.span
                                        className="absolute inset-0 rounded-full bg-red-400"
                                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                                      />
                                    )}
                                    {dynamicBadge}
                                  </motion.span>
                                )}
                              </Link>
                            );

                            if (isCollapsed) {
                              return (
                                <Tooltip.Root key={item.path}>
                                  <Tooltip.Trigger asChild>
                                    {linkContent}
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="right"
                                      sideOffset={8}
                                      className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary border border-border rounded-lg shadow-xl z-[100]"
                                    >
                                      {t(item.labelKey)}
                                      <Tooltip.Arrow className="fill-secondary" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              );
                            }

                            return linkContent;
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Version Badge */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-2 border-t border-border/40"
              >
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-800/20">
                  <motion.div
                    animate={{ rotate: [0, 20, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                  </motion.div>
                  <span className="text-[10px] text-emerald-300/80 font-medium tracking-wider">KALKAN {CURRENT_VERSION}</span>
                  <motion.span
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 relative"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <motion.span
                      className="absolute inset-0 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 2.8, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                    />
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Menu */}
          <div className={`p-3 border-t border-border/60 ${isCollapsed ? 'px-2' : ''}`}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className={`w-full flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 text-foreground transition-colors group cursor-pointer border-none outline-none ${isCollapsed ? 'justify-center' : ''}`}>
                  <motion.div 
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-foreground font-semibold text-sm shadow-lg flex-shrink-0
                    ${user?.id === 'admin-super' 
                      ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-500/50' 
                      : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </motion.div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${user?.id === 'admin-super' ? 'text-red-400' : 'text-foreground'}`}>
                          {user?.name || 'Kullanıcı'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.role || 'Personel'}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </>
                  )}
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[240px] bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl shadow-black/40 p-2 z-50 animate-fade-in-scale"
                  sideOffset={5}
                  side={isCollapsed ? "right" : "top"}
                >
                  {/* Personel Değiştir */}
                  {availableEmployees?.length > 1 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('userMenu.switchEmployee')}
                      </div>
                      {availableEmployees.map((emp, index) => (
                        <DropdownMenu.Item
                          key={emp.id || `emp-${index}`}
                          onSelect={() => handleEmployeeSwitch(emp)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-foreground font-semibold text-xs">
                            {emp?.name?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{emp?.name || 'Bilinmeyen'}</p>
                            <p className="text-xs text-muted-foreground">{emp?.role}</p>
                          </div>
                          {currentEmployee?.id === emp.id && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check className="w-4 h-4 text-green-400" />
                            </motion.div>
                          )}
                        </DropdownMenu.Item>
                      ))}
                      <DropdownMenu.Separator className="my-2 h-px bg-secondary/60" />
                    </>
                  )}

                  {/* Actions */}
                  <DropdownMenu.Item
                    onSelect={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>{t('userMenu.editProfile')}</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={() => setIsRoleRequestModalOpen(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{t('userMenu.requestRole')}</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={() => navigate('/settings')}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{t('userMenu.settings')}</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={handleBackup}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    <span>{t('userMenu.backup')}</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-2 h-px bg-secondary/60" />

                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 outline-none cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('userMenu.logout')}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header
            className="bg-sidebar/80 backdrop-blur-xl border-b border-sidebar-border flex items-center justify-between px-2 sm:px-6 z-10 relative"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              minHeight: 'calc(2.75rem + env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              {/* Mobile Hamburger */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Menüyü aç"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>

              {/* Mobile page title */}
              {currentPageLabel && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentPageLabel}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                    className="lg:hidden text-foreground font-semibold text-sm truncate max-w-[110px] sm:max-w-[200px]"
                  >
                    {currentPageLabel}
                  </motion.span>
                </AnimatePresence>
              )}

              {/* Breadcrumb (desktop) */}
              {currentPageLabel && (
                <div className="hidden lg:flex items-center gap-1.5 text-sm flex-shrink-0">
                  <motion.span
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-muted-foreground/40"
                  >/</motion.span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentPageLabel + '-desk'}
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1,
                        transition: { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }
                      }}
                      exit={{ opacity: 0, y: 8,
                        transition: { duration: 0.18, ease: [0.4, 0, 1, 1] }
                      }}
                      className="text-foreground font-medium"
                    >
                      {currentPageLabel}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

              {/* Divider */}
              <div className="w-px h-5 bg-secondary hidden md:block flex-shrink-0" />

              {currentEmployee && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 sm:gap-2 text-sm min-w-0 overflow-hidden"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 relative"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-400"
                      animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                  </motion.div>
                  <span className="text-muted-foreground hidden lg:inline flex-shrink-0">Aktif:</span>
                  <span className={`font-medium truncate max-w-[80px] sm:max-w-[140px] lg:max-w-none ${currentEmployee.id === 'admin-super' ? 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]' : 'text-foreground'}`}>
                    {currentEmployee.name}
                  </span>
                  {currentEmployee.id === 'admin-super' && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse flex-shrink-0"
                    >
                      SÜPER ADMİN
                    </motion.span>
                  )}
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <SyncStatusIndicator />
              {/* Search — icon only on mobile, pill on sm+ */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="sm:hidden p-1.5 rounded-lg text-muted-foreground active:bg-secondary/60 transition-colors"
                aria-label="Ara"
              >
                <Search className="w-4 h-4" />
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-lg transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs">Ara...</span>
                <kbd className="hidden md:inline-flex ml-2 items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background/60 border border-border/50 rounded">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </motion.button>

              {/* Critical stock badge — icon-only on mobile, full on sm+ */}
              {badgeData.criticalStock > 0 && (
                <Tooltip.Root>
                  <Tooltip.Trigger
                    onClick={() => navigate('/stok')}
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 active:bg-red-500/20 transition-colors cursor-pointer outline-none"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold hidden sm:inline">{badgeData.criticalStock}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content side="bottom" sideOffset={4} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary border border-border rounded-lg shadow-xl z-[100]">
                      {badgeData.criticalStock} ürün kritik stok seviyesinde
                      <Tooltip.Arrow className="fill-secondary" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )}

              <div className="hidden sm:block">
                <LiveClock />
              </div>
              <div className="w-px h-4 bg-secondary hidden sm:block" />

              {/* Language Switcher — sm+ only on mobile */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none" title={t('settings.language')}>
                    <Globe className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase">{lang}</span>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[180px] bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl shadow-black/40 p-1.5 z-[100]"
                    sideOffset={5}
                    side="bottom"
                    align="end"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('settings.language')}
                    </div>
                    {languages.map(l => (
                      <DropdownMenu.Item
                        key={l.code}
                        onSelect={() => setLang(l.code)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm outline-none cursor-pointer transition-colors ${
                          lang === l.code
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'text-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <span className="text-base">{l.flag}</span>
                        <div className="flex-1">
                          <p className="font-medium text-[13px]">{l.nativeName}</p>
                        </div>
                        {lang === l.code && (
                          <Check className="w-4 h-4 text-blue-400" />
                        )}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <NotificationPanel />

              {/* Mobile Profile Avatar */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="lg:hidden flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-white/10 active:ring-white/30 transition-all"
                style={{
                  background: user?.id === 'admin-super'
                    ? 'linear-gradient(135deg, #dc2626, #7f1d1d)'
                    : 'linear-gradient(135deg, #2563eb, #7c3aed)'
                }}
                aria-label="Profili düzenle"
              >
                <span className="text-foreground font-bold text-[11px]">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </button>
            </div>
          </header>

          {/* Page Content with Animated Transitions */}
          {/* pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] = mobile bottom nav alanı için koruma */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            
            {/* Gizli Karargah (Ops Center) Hızlı Giriş Butonu - Sağ Alt Köşe */}
            <button 
              onClick={() => navigate('/ops-center')}
              title=" "
              className="fixed bottom-0 right-0 w-24 h-24 opacity-0 z-50 cursor-pointer outline-none"
              aria-label="Gizli Alan"
            />
          </main>
        </div>
        </div>

        <ProfileEditModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
        <RoleRequestModal 
          isOpen={isRoleRequestModalOpen} 
          onClose={() => setIsRoleRequestModalOpen(false)} 
        />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        {isMobile && <MobileBottomNav />}
        <ScrollToTop />
      </div>
    </Tooltip.Provider>
  );
}