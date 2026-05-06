/**
 * Veritabanı Kurulum Sihirbazı (Gelişmiş Arayüz)
 *
 * Uygulama açılışında CouchDB durumunu kontrol eder, bağlantı var ise otomatik başlar.
 * Bağlantı hatası durumunda detaylı, şık bir kurulum sihirbazı arayüzü sunar.
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Database, CheckCircle2, Loader2, AlertTriangle, RefreshCw, X, Settings, Eye, EyeOff, Save, ShieldCheck, ChevronRight, Server } from 'lucide-react';
import { testCouchDbConnection } from '../lib/pouchdb';
import { getCouchDbConfig, setCouchDbConfig } from '../lib/db-config';

type DbInitStatus = 'idle' | 'checking' | 'setup_needed' | 'setting_up' | 'ready' | 'error';

async function checkDatabaseStatus(): Promise<{ status: DbInitStatus; message?: string }> {
  try {
    const result = await testCouchDbConnection();
    if (result.ok) return { status: 'ready' };
    return { status: 'error', message: result.error || 'CouchDB bağlantı hatası' };
  } catch (e: any) {
    return { status: 'error', message: e.message || 'Bağlantı hatası' };
  }
}

interface DbSetupBannerProps {
  onReady?: () => void;
}

export function DbSetupBanner({ onReady }: DbSetupBannerProps) {
  const [status, setStatus] = useState<DbInitStatus>('checking');
  const [message, setMessage] = useState('Güvenli bağlantı kuruluyor...');
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(15);

  // Configuration Form
  const [showConfig, setShowConfig] = useState(false);
  const [cfgUrl, setCfgUrl] = useState('');
  const [cfgUser, setCfgUser] = useState('');
  const [cfgPass, setCfgPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);

  const runInit = async () => {
    setStatus('checking');
    setMessage('Sistem ağ bileşenlerini kontrol ediyor...');
    setVisible(true);
    setDismissed(false);
    setShowConfig(false);
    setLoadingProgress(25);

    setTimeout(() => setLoadingProgress(65), 600);

    const checkResult = await checkDatabaseStatus();

    if (checkResult.status === 'ready') {
      setLoadingProgress(100);
      setStatus('ready');
      setMessage('Veritabanı bağlantısı başarılı. Sistem başlatılıyor.');
      setTimeout(() => {
        onReady?.();
        setVisible(false);
      }, 1500);
      return;
    }

    setLoadingProgress(30);
    setStatus('error');
    setMessage(checkResult.message || 'Sunucuya ulaşılamadı. Manuel yapılandırma gerekiyor.');

    const cfg = getCouchDbConfig();
    setCfgUrl(cfg.url || '');
    setCfgUser(cfg.user || '');
    setCfgPass(cfg.password || '');
    setShowConfig(true);
  };

  useEffect(() => { queueMicrotask(() => runInit()); }, []);

  const handleSaveConfig = async () => {
    if (!cfgUrl.trim()) return;
    setCfgSaving(true);
    setLoadingProgress(50);
    setCouchDbConfig({ url: cfgUrl.trim(), user: cfgUser.trim(), password: cfgPass });
    
    setTimeout(async () => {
      const result = await testCouchDbConnection();
      setCfgSaving(false);
      if (result.ok) {
        setLoadingProgress(100);
        setStatus('ready');
        setMessage('Bağlantı kuruldu! Sistem ayağa kalkıyor.');
        setShowConfig(false);
        onReady?.();
        setTimeout(() => location.reload(), 1200);
      } else {
        setLoadingProgress(30);
        setMessage(result.error || 'Girdiğiniz bilgilerle bağlantı kurulamadı.');
      }
    }, 800);
  };

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="db-setup-wizard"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 sm:p-6"
      >
        <motion.div className="relative w-full max-w-2xl bg-black border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5">
          {/* Arka plan parıltısı */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative p-8 sm:p-10 flex flex-col gap-6">
            
            {/* Üst Kısım: İkon ve Durum */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner transition-colors duration-500 ${
                  status === 'checking' ? 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/20' :
                  status === 'error' ? 'bg-red-500/10 border-red-500/20 shadow-red-500/20' :
                  'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/20'
                }`}>
                  {status === 'checking' && <Server className="w-8 h-8 text-blue-400 animate-pulse" />}
                  {status === 'error' && <AlertTriangle className="w-8 h-8 text-red-500" />}
                  {status === 'ready' && <ShieldCheck className="w-8 h-8 text-emerald-400" />}
                </div>
                {status === 'checking' && (
                  <div className="absolute -inset-1 rounded-2xl border-2 border-blue-500/30 animate-[spin_3s_linear_infinite]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 10%, 0 10%)' }} />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white tracking-tight">Sistem Başlatılıyor</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-sm font-medium ${status === 'error' ? 'text-red-400' : 'text-blue-300'}`}>{message}</span>
                </div>
              </div>
              {(status === 'error' && !showConfig) && (
                <button onClick={() => setDismissed(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5 text-muted-foreground hover:text-white" /></button>
              )}
            </div>

            {/* İlerleme Çubuğu */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${
                  status === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                  status === 'ready' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                  'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
              />
            </div>

            {/* Hata Durumu & Konfigürasyon Modülü */}
            <AnimatePresence mode="popLayout">
              {showConfig && status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-white/[0.03] rounded-2xl p-6 border border-white/10 mt-2 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                  
                  <h3 className="text-sm font-bold text-gray-200 mb-5 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-red-400" /> Bağlantı Ayarları
                  </h3>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Sunucu URL</label>
                      <input
                        type="text"
                        value={cfgUrl}
                        onChange={e => setCfgUrl(e.target.value)}
                        placeholder="Örn: http://localhost:5984"
                        className="w-full bg-black/60 text-white text-sm px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Kullanıcı Adı</label>
                        <input
                          type="text"
                          value={cfgUser}
                          onChange={e => setCfgUser(e.target.value)}
                          placeholder="admin"
                          className="w-full bg-black/60 text-white text-sm px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Şifre</label>
                        <div className="relative">
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={cfgPass}
                            onChange={e => setCfgPass(e.target.value)}
                            placeholder="******"
                            className="w-full bg-black/60 text-white text-sm px-4 py-3 pr-10 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-300 transition-colors"
                          >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 relative z-10">
                    <button 
                      onClick={runInit} 
                      className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Yeniden Dene
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={cfgSaving || !cfgUrl.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none active:scale-95"
                    >
                      {cfgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      Bağlan ve Test Et
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
