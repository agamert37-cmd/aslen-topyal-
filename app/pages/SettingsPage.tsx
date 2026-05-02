import React, { useState, useRef, useEffect } from 'react';
import { Settings, Building2, Phone, MapPin, FileText, Hash, Monitor, Upload, Loader2, RefreshCw, Trash2, Plus, Save, Palette } from 'lucide-react';
import { getFromStorage, setInStorage, StorageKey } from '../utils/storage';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { staggerContainer, gridCard } from '../utils/animations';
import { SERVER_BASE_URL as serverBase, publicAnonKey } from '../lib/supabase-config';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import { logActivity } from '../utils/activityLogger';
import { getPagePermissions } from '../utils/permissions';
import { kvGet, kvSet } from '../lib/pouchdb-kv';
import { useTheme } from '../contexts/ThemeContext';

export interface CompanyInfo {
  companyName: string;
  phone: string;
  address: string;
  taxNumber: string;
  taxOffice: string;
  email: string;
  slogan: string;
  logo?: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  companyName: 'İŞLEYEN ET',
  phone: '', address: '', taxNumber: '', taxOffice: '', email: '',
  slogan: 'Kurumsal ERP Sistemleri',
  logo: '',
};

export function getCompanyInfo(): CompanyInfo {
  const settings = getFromStorage<any>(StorageKey.SYSTEM_SETTINGS);
  if (settings?.companyInfo) return { ...DEFAULT_COMPANY_INFO, ...settings.companyInfo };
  return DEFAULT_COMPANY_INFO;
}

export function SettingsPage() {
  const { user } = useAuth();
  const { currentEmployee } = useEmployee();
  const { canEdit } = getPagePermissions(user, currentEmployee, 'ayarlar');
  const { theme, setTheme } = useTheme();

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => getCompanyInfo());

  const handleSaveCompanyInfo = () => {
    if (!canEdit) { 
      toast.error('Ayarları değiştirme yetkiniz yok.'); 
      logActivity('security_alert', 'Yetkisiz Şirket Bilgisi Değişikliği', { level: 'high', employeeName: user?.name }); 
      return; 
    }
    const existingSettings = getFromStorage<any>(StorageKey.SYSTEM_SETTINGS) || {};
    const updatedSettings = { ...existingSettings, companyInfo };
    setInStorage(StorageKey.SYSTEM_SETTINGS, updatedSettings);
    kvSet('system_settings', updatedSettings).catch(() => toast.warning('Çapraz cihaz senkronizasyonu başarısız.'));
    logActivity('settings_change', 'Şirket bilgileri güncellendi', { employeeName: user?.name, page: 'Ayarlar' });
    toast.success('Şirket bilgileri kaydedildi!');
  };

  useEffect(() => {
    const localSettings = getFromStorage<any>(StorageKey.SYSTEM_SETTINGS);
    if (!localSettings?.companyInfo) {
      kvGet<any>('system_settings').then(remote => {
        if (remote) {
          setInStorage(StorageKey.SYSTEM_SETTINGS, remote);
          if (remote.companyInfo) setCompanyInfo({ ...remote.companyInfo });
        }
      }).catch(() => {});
    }
  }, []);

  const inputClass = "w-full bg-input text-foreground px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm transition-all placeholder-muted-foreground";
  const labelCls = "text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="p-3 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 lg:space-y-8 bg-background min-h-screen text-foreground font-sans pb-4 sm:pb-6">
      <motion.div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-6" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">Sistem Ayarları</h1>
          </div>
          <p className="text-muted-foreground">Kurumsal profil ve şirket bilgileri</p>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8" variants={staggerContainer(0.1, 0.06)} initial="initial" animate="animate">
        <motion.div variants={gridCard} className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border lg:col-span-2 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><Building2 className="w-6 h-6 text-blue-400"/></div>
            <div><h2 className="text-xl font-bold">Şirket Profili</h2><p className="text-xs text-muted-foreground">PDF ve Fişlerde görünecek bilgiler</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2"><label className={labelCls}>Firma Adı</label><div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input type="text" value={companyInfo.companyName} onChange={e => setCompanyInfo(p => ({...p, companyName: e.target.value}))} className={`${inputClass} pl-11`} /></div></div>
            <div className="md:col-span-2"><label className={labelCls}>Slogan / Alt Başlık</label><input type="text" value={companyInfo.slogan} onChange={e => setCompanyInfo(p => ({...p, slogan: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelCls}>Telefon</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input type="text" value={companyInfo.phone} onChange={e => setCompanyInfo(p => ({...p, phone: e.target.value}))} className={`${inputClass} pl-11`} /></div></div>
            <div><label className={labelCls}>E-posta</label><input type="email" value={companyInfo.email} onChange={e => setCompanyInfo(p => ({...p, email: e.target.value}))} className={inputClass} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Logo URL (Termal Çıktı / PDF için)</label><input type="text" placeholder="https://..." value={companyInfo.logo || ''} onChange={e => setCompanyInfo(p => ({...p, logo: e.target.value}))} className={inputClass} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Adres</label><div className="relative"><MapPin className="absolute left-4 top-3 w-4 h-4 text-muted-foreground"/><input type="text" value={companyInfo.address} onChange={e => setCompanyInfo(p => ({...p, address: e.target.value}))} className={`${inputClass} pl-11`} /></div></div>
            <div><label className={labelCls}>Vergi Numarası</label><div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input type="text" value={companyInfo.taxNumber} onChange={e => setCompanyInfo(p => ({...p, taxNumber: e.target.value}))} className={`${inputClass} pl-11`} /></div></div>
            <div><label className={labelCls}>Vergi Dairesi</label><div className="relative"><FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input type="text" value={companyInfo.taxOffice} onChange={e => setCompanyInfo(p => ({...p, taxOffice: e.target.value}))} className={`${inputClass} pl-11`} /></div></div>
          </div>
          <button onClick={handleSaveCompanyInfo} className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-500 text-foreground rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Kaydet</button>
        </motion.div>

        {/* GÖRÜNÜM / TEMA AYARLARI */}
        <motion.div variants={gridCard} className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border lg:col-span-2 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20"><Palette className="w-6 h-6 text-purple-400"/></div>
            <div>
              <h2 className="text-xl font-bold">Görünüm & Tema</h2>
              <p className="text-xs text-muted-foreground">Kişisel arayüz tercihi</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' : 'border-border bg-background hover:border-purple-500/50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#06090f] border border-border shadow-inner"></div>
              <span className="font-bold text-sm">Klasik Koyu</span>
            </button>
            <button 
              onClick={() => setTheme('light')} 
              className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' : 'border-border bg-background hover:border-purple-500/50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#f8fafc] border border-black/10 shadow-sm"></div>
              <span className="font-bold text-sm text-foreground">Aydınlık (Beyaz)</span>
            </button>
            <button 
              onClick={() => setTheme('theme-ocean')} 
              className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'theme-ocean' ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50' : 'border-border bg-background hover:border-cyan-500/50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#020617] border border-[#0ea5e9]/50 shadow-inner"></div>
              <span className="font-bold text-sm text-cyan-500">Okyanus (Renkli)</span>
            </button>
            <button 
              onClick={() => setTheme('theme-emerald')} 
              className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'theme-emerald' ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/50' : 'border-border bg-background hover:border-emerald-500/50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#022c22] border border-[#10b981]/50 shadow-inner"></div>
              <span className="font-bold text-sm text-emerald-500">Zümrüt Yeşili</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
