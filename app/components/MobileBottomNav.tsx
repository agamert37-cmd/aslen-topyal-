// [AJAN-2 | claude/serene-gagarin | 2026-03-25] Son düzenleyen: Claude Opus 4.6
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Wallet,
  MoreHorizontal, X, FileText, Banknote, CalendarCheck,
  UserCog, Factory, ArrowLeftRight, Receipt, FileCheck,
  FolderOpen, Database, MessageSquare, ShieldAlert, Settings,
  Megaphone, Truck, Search, FileEdit, RefreshCw, Wifi, WifiOff,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import { restartAllSync, testCouchDbConnection } from '../lib/pouchdb';
import { useCouchDbStatus, useGlobalTableData } from '../contexts/GlobalTableSyncContext';
import { walLoad } from '../lib/active-client';
import { toast } from 'sonner';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
  permKey?: string;
}

// Primary 5 tabs shown in bottom bar
const primaryTabs: NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, color: 'blue', permKey: 'dashboard' },
  { path: '/sales', labelKey: 'nav.sales', icon: ShoppingCart, color: 'green', permKey: 'satis' },
  { path: '/stok', labelKey: 'nav.stock', icon: Package, color: 'indigo', permKey: 'stok' },
  { path: '/cari', labelKey: 'nav.customers', icon: Users, color: 'sky', permKey: 'cari' },
  { path: '/kasa', labelKey: 'nav.cash', icon: Wallet, color: 'emerald', permKey: 'kasa' },
];

// All other pages in "more" drawer - grouped
const moreGroups: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: 'mobileNav.operations',
    items: [
      { path: '/tahsilat', labelKey: 'nav.collection', icon: Banknote, color: 'lime', permKey: 'kasa' },
      { path: '/cekler', labelKey: 'nav.checks', icon: FileEdit, color: 'purple', permKey: 'kasa' },
      { path: '/faturalar', labelKey: 'nav.invoices', icon: FileCheck, color: 'indigo', permKey: 'kasa' },
      { path: '/stok-hareket', labelKey: 'nav.stockMovement', icon: ArrowLeftRight, color: 'cyan', permKey: 'stok' },
      { path: '/uretim', labelKey: 'nav.production', icon: Factory, color: 'orange', permKey: 'stok' },
    ],
  },
  {
    titleKey: 'mobileNav.reportsManagement',
    items: [
      { path: '/gun-sonu', labelKey: 'nav.dayEnd', icon: CalendarCheck, color: 'rose', permKey: 'raporlar' },
      { path: '/raporlar', labelKey: 'nav.reports', icon: FileText, color: 'cyan', permKey: 'raporlar' },
      { path: '/fis-gecmisi', labelKey: 'nav.receiptHistory', icon: Receipt, color: 'amber', permKey: 'raporlar' },
      { path: '/personel', labelKey: 'nav.personnel', icon: UserCog, color: 'purple', permKey: 'personel' },
      { path: '/arac', labelKey: 'nav.vehicles', icon: Truck, color: 'orange', permKey: 'personel' },
    ],
  },
  {
    titleKey: 'mobileNav.system',
    items: [
      { path: '/dosyalar', labelKey: 'nav.files', icon: FolderOpen, color: 'teal', permKey: 'ayarlar' },
      { path: '/pazarlama', labelKey: 'nav.marketing', icon: Megaphone, color: 'pink', permKey: 'ayarlar' },
      { path: '/yedekler', labelKey: 'nav.backups', icon: Database, color: 'slate', permKey: 'ayarlar' },
      { path: '/chat', labelKey: 'nav.aiAssistant', icon: MessageSquare, color: 'violet', permKey: 'dashboard' },
      { path: '/guvenlik', labelKey: 'nav.security', icon: ShieldAlert, color: 'red', permKey: 'ayarlar' },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings, color: 'gray', permKey: 'ayarlar' },
    ],
  },
];

// Color tokens
const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
  blue:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    bar: '#3b82f6' },
  green:   { bg: 'bg-green-500/20',   text: 'text-green-400',   bar: '#22c55e' },
  indigo:  { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  bar: '#6366f1' },
  sky:     { bg: 'bg-sky-500/20',     text: 'text-sky-400',     bar: '#0ea5e9' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: '#10b981' },
  lime:    { bg: 'bg-lime-500/20',    text: 'text-lime-400',    bar: '#84cc16' },
  purple:  { bg: 'bg-purple-500/20',  text: 'text-purple-400',  bar: '#a855f7' },
  cyan:    { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    bar: '#06b6d4' },
  orange:  { bg: 'bg-orange-500/20',  text: 'text-orange-400',  bar: '#f97316' },
  rose:    { bg: 'bg-rose-500/20',    text: 'text-rose-400',    bar: '#f43f5e' },
  amber:   { bg: 'bg-amber-500/20',   text: 'text-amber-400',   bar: '#f59e0b' },
  teal:    { bg: 'bg-teal-500/20',    text: 'text-teal-400',    bar: '#14b8a6' },
  pink:    { bg: 'bg-pink-500/20',    text: 'text-pink-400',    bar: '#ec4899' },
  slate:   { bg: 'bg-slate-500/20',   text: 'text-slate-400',   bar: '#64748b' },
  violet:  { bg: 'bg-violet-500/20',  text: 'text-violet-400',  bar: '#8b5cf6' },
  red:     { bg: 'bg-red-500/20',     text: 'text-red-400',     bar: '#ef4444' },
  gray:    { bg: 'bg-gray-500/20',    text: 'text-muted-foreground',    bar: '#6b7280' },
};

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { currentEmployee } = useEmployee();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingWrites, setPendingWrites] = useState(() => walLoad().length);
  const { couchdbConnected } = useCouchDbStatus();
  const urunler = useGlobalTableData<any>('urunler');
  const faturalar = useGlobalTableData<any>('faturalar');
  const tabBadges: Record<string, number> = {
    '/stok': urunler.filter(u => u.minStock > 0 && (u.currentStock ?? 0) <= u.minStock).length,
    '/faturalar': faturalar.filter(f => f.status === 'aktif' || f.durum === 'aktif').length,
  };
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true); setPendingWrites(walLoad().length); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    // WAL durumunu periyodik güncelle (çevrimdışı yazma sayısı)
    const walTimer = setInterval(() => setPendingWrites(walLoad().length), 5000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(walTimer);
    };
  }, []);

  // Close on route change
  useEffect(() => {
    queueMicrotask(() => {
      setIsMoreOpen(false);
      setSearch('');
    });
  }, [location.pathname]);

  useEffect(() => {
    if (isMoreOpen) {
      setTimeout(() => searchRef.current?.focus(), 200);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMoreOpen]);

  const hasPermission = (permKey?: string) => {
    if (!permKey) return true;
    if (user?.id === 'admin-super' || user?.id === 'admin-1' || user?.role === 'Yönetici') return true;
    return currentEmployee?.permissions?.includes(permKey);
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  const isMoreActive = moreGroups.some(g => g.items.some(i => isActive(i.path)));

  const haptic = (type: 'light' | 'medium' = 'light') => {
    if ('vibrate' in navigator) navigator.vibrate(type === 'light' ? 6 : 14);
  };

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    haptic('medium');
    try {
      restartAllSync();
      const result = await testCouchDbConnection();
      if (result.ok) {
        toast.success('Senkronizasyon başlatıldı', { id: 'mobile-sync', duration: 2000 });
      } else {
        toast.error(`CouchDB bağlantı hatası: ${result.error || 'Sunucuya ulaşılamıyor'}`, {
          id: 'mobile-sync',
          duration: 3000,
        });
      }
    } catch {
      toast.error('Senkronizasyon başarısız', { id: 'mobile-sync', duration: 2000 });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Swipe down to close (daha hassas eşik: 60px)
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - startY.current > 60) {
      haptic('light');
      setIsMoreOpen(false);
    }
  };

  // Filtered groups for search
  const filteredGroups = search.trim()
    ? moreGroups.map(g => ({
        ...g,
        items: g.items.filter(i =>
          hasPermission(i.permKey) &&
          t(i.labelKey).toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : moreGroups.map(g => ({ ...g, items: g.items.filter(i => hasPermission(i.permKey)) })).filter(g => g.items.length > 0);

  return (
    <>
      {/* ── More Drawer (Bottom Sheet) ── */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[45]"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[46] bg-[#0d1117]/98 backdrop-blur-2xl border-t border-border rounded-t-3xl max-h-[82vh] overflow-hidden flex flex-col"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-2.5 pb-1.5">
                <div className="w-9 h-[3px] rounded-full bg-white/20" />
              </div>

              {/* Header — Kullanıcı bilgisi + araçlar */}
              <div className="px-5 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground font-bold text-lg">{t('mobileNav.allModules') || 'Tüm Modüller'}</h3>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSync}
                      disabled={isSyncing || !isOnline}
                      className="relative p-2 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 disabled:opacity-40 transition-colors"
                      title={pendingWrites > 0 ? `${pendingWrites} bekleyen yazma` : 'Verileri Senkronize Et'}
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {pendingWrites > 0 && !isSyncing && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                          {pendingWrites > 9 ? '9+' : pendingWrites}
                        </span>
                      )}
                    </motion.button>
                    <button
                      onClick={() => setIsMoreOpen(false)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {/* Kullanıcı kartı + durum */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-border">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Kullanıcı'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.role || ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOnline ? (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-white/[0.06] border border-border rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Modül ara..."
                    className="flex-1 bg-transparent text-foreground text-sm placeholder-gray-500 outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                {filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Search className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">Sonuç bulunamadı</p>
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div key={group.titleKey}>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-1">
                        {t(group.titleKey)}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          const colors = colorMap[item.color] || colorMap.gray;
                          return (
                            <button
                              key={item.path}
                              onClick={() => { haptic('light'); navigate(item.path); setIsMoreOpen(false); }}
                              aria-label={t(item.labelKey)}
                              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 ${
                                active
                                  ? `${colors.bg} border-current/20`
                                  : 'bg-white/[0.04] border-border hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className={`p-2 rounded-xl ${active ? colors.bg : 'bg-white/[0.06]'}`}>
                                <Icon className={`w-5 h-5 ${active ? colors.text : 'text-muted-foreground'}`} />
                              </div>
                              <span className={`text-[11px] font-medium text-center leading-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {t(item.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Oturum Kapat */}
                <div className="pt-3 mt-1 border-t border-border">
                  <button
                    onClick={() => { setIsMoreOpen(false); logout(); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98] transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Oturum Kapat</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-none flex flex-col justify-end">
        {/* Smooth Bottom Fade Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none -z-10" />

        {/* Floating Alerts Container */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 px-4 mb-3 relative z-20">
          {/* Çevrimdışı uyarı şeridi */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-950/80 backdrop-blur-md border border-red-500/30 rounded-full shadow-lg">
                  <WifiOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-[10px] text-red-300 font-bold tracking-wide">Çevrimdışı (bekleniyor...)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* CouchDB bağlantı hatası şeridi */}
          <AnimatePresence>
            {couchdbConnected === false && isOnline && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-950/80 backdrop-blur-md border border-amber-500/30 rounded-full shadow-lg">
                  <WifiOff className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] text-amber-300 font-bold tracking-wide">Sunucu yok</span>
                  <button
                    onClick={() => { haptic('medium'); restartAllSync(); toast.info('Bağlanılıyor…', { duration: 2000 }); }}
                    className="text-[9px] font-black uppercase text-amber-900 bg-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0 transition-transform active:scale-90"
                  >
                    Dene
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Sync göstergesi */}
          <AnimatePresence>
            {isSyncing && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-950/80 backdrop-blur-md border border-blue-500/30 rounded-full shadow-lg">
                  <RefreshCw className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
                  <span className="text-[10px] text-blue-300 font-bold tracking-wide">Senkronize ediliyor...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Pill Bar */}
        <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pointer-events-auto relative z-20">
          <div className="relative flex items-stretch justify-around bg-[#0a0d14]/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-[24px] p-1.5">
            {/* Subtle glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[24px] pointer-events-none" />

            {primaryTabs.filter(i => hasPermission(i.permKey)).map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const colors = colorMap[item.color] || colorMap.gray;

              return (
                <button
                  key={item.path}
                  onClick={() => { haptic('light'); navigate(item.path); }}
                  aria-label={t(item.labelKey)}
                  aria-current={active ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 relative min-w-0 min-h-[48px] rounded-[18px] transition-colors active:bg-white/5"
                >
                  {/* Active pill background */}
                  {active && (
                    <motion.div
                      layoutId="mobileNavPill"
                      className="absolute inset-0 rounded-[18px]"
                      style={{ background: `${colors.bar}1a` }}
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  {/* Active glow dot */}
                  {active && (
                    <motion.div
                      layoutId="mobileNavDot"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: colors.bar, boxShadow: `0 0 8px ${colors.bar}` }}
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    animate={active ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative z-10"
                  >
                    <Icon className={`w-5 h-5 ${active ? colors.text : 'text-muted-foreground/80'}`} strokeWidth={active ? 2.5 : 2} />
                    {(tabBadges[item.path] ?? 0) > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[4px] rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center leading-none border-2 border-[#0a0d14] shadow-sm">
                        {tabBadges[item.path] > 99 ? '99+' : tabBadges[item.path]}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-[9px] font-bold tracking-wide truncate max-w-full px-1 relative z-10 transition-colors ${
                    active ? 'text-foreground' : 'text-muted-foreground/70'
                  }`}>
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}

            {/* More button */}
            <button
              onClick={() => { haptic('medium'); setIsMoreOpen(true); }}
              aria-label="Tüm modüller"
              aria-expanded={isMoreOpen}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 relative min-w-0 min-h-[48px] rounded-[18px] transition-colors active:bg-white/5"
            >
              {isMoreActive && (
                <div className="absolute inset-0 rounded-[18px] bg-purple-500/10" />
              )}
              {isMoreActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              )}
              <motion.div
                animate={isMoreOpen ? { rotate: 45, scale: 1.15 } : { rotate: 0, scale: isMoreActive ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative z-10"
              >
                <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? 'text-purple-400' : 'text-muted-foreground/80'}`} strokeWidth={isMoreActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[9px] font-bold tracking-wide relative z-10 transition-colors ${isMoreActive ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                {t('mobileNav.more') || 'Daha'}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
