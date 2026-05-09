import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import {
  Lock, User, AlertCircle, X, Shield, Eye, EyeOff, Beef, 
  LogIn, ShieldCheck, Loader2, ShoppingBag, Newspaper, PhoneCall, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getFromStorage, StorageKey } from '../utils/storage';
import { CHANGELOG, CURRENT_VERSION } from '../data/changelog';
import { getDb } from '../lib/pouchdb';
import { useLanguage } from '../contexts/LanguageContext';

function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d111b] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-white">Sürüm Geçmişi</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {CHANGELOG.map(entry => (
             <div key={entry.version} className="border-b border-gray-800 pb-4 last:border-0">
               <div className="flex gap-2 items-center mb-2">
                 <span className="bg-blue-600 px-2 py-1 rounded text-xs font-bold text-white">v{entry.version}</span>
                 <span className="text-gray-400 text-xs">{entry.date}</span>
               </div>
               <p className="text-sm text-gray-300">{entry.summary}</p>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [viewMode, setViewMode] = useState<'portal' | 'login'>('portal');
  const [portalTab, setPortalTab] = useState<'urunler' | 'haberler' | 'iletisim'>('urunler');

  // Customer Contact Form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login variables
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminTab, setAdminTab] = useState<'user'|'admin'>('user');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { setCurrentEmployee, availableEmployees = [] } = useEmployee();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    if (!username) {
      setHasBiometric(false);
      return;
    }
    let personnelData = getFromStorage<any[]>(StorageKey.PERSONEL_DATA) || [];
    if (!Array.isArray(personnelData)) personnelData = [];
    const emp = personnelData.find(p => (p.username || '').toLowerCase() === username.toLowerCase() || (p.name || '').toLowerCase() === username.toLowerCase());
    setHasBiometric(!!(emp && emp.webauthnId));
  }, [username]);

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  const pazarlamaContent = useMemo(() => {
    try {
      const data = getFromStorage<any>(StorageKey.PAZARLAMA_CONTENT);
      if (data) return data;
    } catch {}
    return {
      heroBanners: [
        { id: '1', imageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwc3RlYWslMjBjdXRzJTIwcmF3JTIwbWVhdHxlbnwxfHx8fDE3NzMwNjA0NDh8MA&ixlib=rb-4.1.0&q=80&w=1080', title: 'Premium Kalite Et Ürünleri', subtitle: 'En yüksek hijyen standartlarında', active: true }
      ],
      loginPage: {
        headline: 'Kalite ve\nGüven\nHer Pakette.',
        tagline: 'TÜRKİYE\'NİN GÜVENİLİR ET TEDARİKÇİSİ',
        description: 'ISO 22000 sertifikalı tesislerimizde, soğuk zincir hiçbir aşamada kırılmadan üretim yapıyoruz.',
        trustBar: [
          { icon: 'shield', text: 'ISO 22000' },
          { icon: 'Award', text: '15+ Yıl Deneyim' },
          { icon: 'Truck', text: 'Aynı Gün Teslimat' },
        ],
      },
      theme: { primaryColor: 'blue' }
    };
  }, []);

  const companyInfo = useMemo(() => {
    try {
      const settings = getFromStorage<any>(StorageKey.SYSTEM_SETTINGS);
      if (settings?.companyInfo) return { name: settings.companyInfo.companyName, slogan: settings.companyInfo.slogan };
    } catch {}
    return { name: 'İŞLEYEN ET', slogan: 'Toptan & Perakende Et Ürünleri' };
  }, []);

  const products = pazarlamaContent?.products?.filter((p:any) => p.active) || [];
  const announcements = pazarlamaContent?.announcements?.filter((a:any) => a.active) || [];
  const heroBanners = pazarlamaContent?.heroBanners?.filter((b:any) => b.active) || [];
  const loginConfig = pazarlamaContent?.loginPage || {};
  
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  const activeHero = heroBanners[currentHeroIndex] || heroBanners[0];

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) return toast.error('Ad ve telefon zorunludur.');
    setIsSubmitting(true);
    try {
      const db = getDb('customer_requests');
      await db.put({
        _id: `req_${Date.now()}`,
        name: contactName,
        phone: contactPhone,
        message: contactMessage,
        date: new Date().toISOString(),
        status: 'new'
      });
      toast.success('Talebiniz başarıyla alındı! En kısa sürede iletişime geçeceğiz.');
      setContactName(''); setContactPhone(''); setContactMessage('');
    } catch (err) {
      toast.error('Kayıt oluşturulamadı.');
    } finally { setIsSubmitting(false); }
  };

  const handleBiometricLogin = async () => {
    if (!username) {
      toast.error('Lütfen önce kullanıcı adınızı girin.');
      return;
    }
    
    let personnelData = getFromStorage<any[]>(StorageKey.PERSONEL_DATA) || [];
    if (!Array.isArray(personnelData)) personnelData = [];
    const emp = personnelData.find(p => (p.username || '').toLowerCase() === username.toLowerCase() || (p.name || '').toLowerCase() === username.toLowerCase());
    if (!emp || !emp.webauthnId) {
      toast.error('Bu kullanıcı için tanımlı biyometrik veri bulunamadı.');
      return;
    }

    try {
      setIsLoading(true);
      const { loginWithBiometric } = await import('../utils/webauthn');
      const successBiometric = await loginWithBiometric(emp.webauthnId);
      
      if (successBiometric) {
        // Biometric successful, bypass password
        const success = await login(username, 'biometric', true); // pass true for biometric bypass
        if (success) {
          toast.success('Biyometrik giriş başarılı.');
          navigate('/dashboard', { replace: true });
        } else {
          setError('Giriş reddedildi.');
        }
      } else {
        setError('Biyometrik doğrulama başarısız.');
      }
    } catch (err: any) {
      setError(err.message || 'Biyometrik doğrulama iptal edildi veya desteklenmiyor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const success = await login(adminTab === 'admin' ? 'admin' : username, adminTab === 'admin' ? adminPassword : password);
      if (success) {
        if (adminTab === 'admin') {
          const adminEmp = availableEmployees.find(e => e.id === 'admin-super');
          if (adminEmp) setCurrentEmployee(adminEmp);
        }
        toast.success(t('auth.loginSuccess'));
        navigate('/dashboard', { replace: true });
      } else {
        setError('Hatalı giriş.');
      }
    } catch { setError('Bir hata oluştu.'); }
    finally { setIsLoading(false); }
  };

  const TrustIcon = ({ name }: { name: string }) => {
    const iconName = name.toLowerCase();
    if (iconName.includes('shield')) return <Shield className="w-5 h-5 text-cyan-400" />;
    if (iconName.includes('truck')) return <ShoppingBag className="w-5 h-5 text-cyan-400" />;
    return <Beef className="w-5 h-5 text-cyan-400" />;
  };

  const colorMap: Record<string, string> = {
    blue: '#2563eb',
    cyan: '#06b6d4',
    purple: '#9333ea',
    orange: '#ea580c',
    emerald: '#10b981',
    red: '#ef4444',
  };

  const currentPrimaryColor = colorMap[pazarlamaContent?.theme?.primaryColor || 'blue'] || '#2563eb';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div 
      className="min-h-[100dvh] text-white flex flex-col font-sans"
      style={{
        background: `linear-gradient(to bottom, #07090f, ${currentPrimaryColor}15)`
      }}
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#0d111b]/80 backdrop-blur-xl border-b border-white/5 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg">
            <Beef className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-tight text-white leading-tight">{companyInfo.name}</h1>
            <p className="text-gray-400 text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-xs">{companyInfo.slogan}</p>
          </div>
        </div>
        <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
          <button 
            onClick={() => setViewMode('portal')} 
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${viewMode === 'portal' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Müşteri Portalı
          </button>
          <button 
            onClick={() => setViewMode('login')} 
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${viewMode === 'login' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Personel Girişi
          </button>
        </div>
      </div>

      {/* Main Layout - Split Screen on Desktop */}
      <div className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Panel: Marketing Details & Visuals */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex-shrink-0 relative overflow-hidden flex flex-col justify-end p-8 lg:border-r border-white/10">
          <AnimatePresence mode="wait">
            {activeHero && (
              <motion.img 
                key={activeHero.id || activeHero.imageUrl}
                src={activeHero.imageUrl} 
                alt="Marketing Background" 
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            )}
          </AnimatePresence>
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent mix-blend-multiply" />
          <div className="absolute inset-0" 
            style={{ 
              background: `linear-gradient(to top, ${currentPrimaryColor}80, transparent)` 
            }} 
          />

          {/* Marketing Content */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="relative z-10 flex flex-col mt-auto pb-4"
          >
            <motion.span variants={itemVariants} className="text-cyan-400 font-bold tracking-widest text-xs uppercase mb-3 drop-shadow-md">
              {loginConfig.tagline || companyInfo.slogan}
            </motion.span>
            <motion.h2 variants={itemVariants} className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4 whitespace-pre-wrap drop-shadow-xl">
              {loginConfig.headline || 'Kalite ve Güven'}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-300 text-sm leading-relaxed mb-8 max-w-sm drop-shadow-md">
              {loginConfig.description || 'Gıda sektöründe güvenilir iş ortağınız.'}
            </motion.p>

            {loginConfig.trustBar && loginConfig.trustBar.length > 0 && (
              <motion.div variants={itemVariants} className="flex flex-col gap-3 border-t border-white/10 pt-6">
                {loginConfig.trustBar.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                      <TrustIcon name={item.icon || ''} />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">{item.text}</span>
                  </div>
                ))}
              </motion.div>
            )}
            
            {activeHero?.title && (
              <motion.div variants={itemVariants} className="mt-8 bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-white font-bold text-sm">{activeHero.title}</p>
                <p className="text-gray-400 text-xs mt-1">{activeHero.subtitle}</p>
              </motion.div>
            )}
            
            {loginConfig?.leftExtraText && (
              <motion.div variants={itemVariants} className="mt-4 bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-gray-300 text-xs leading-relaxed">{loginConfig.leftExtraText}</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Panel: Active Screen Configuration */}
        <div 
          className="flex-1 relative overflow-y-auto"
          style={{ 
            background: `linear-gradient(135deg, ${currentPrimaryColor}10 0%, #07090f 100%)` 
          }}
        >
          {/* Particle Decoration */}
          {pazarlamaContent?.theme?.showParticles !== false && (
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                background: `radial-gradient(ellipse 600px 600px at 50% -10%, ${currentPrimaryColor}20 0%, transparent 100%)`
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {viewMode === 'portal' ? (
              <motion.div 
                key="portal" 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="p-4 sm:p-8 w-full max-w-5xl mx-auto min-h-full flex flex-col relative z-10"
              >
                {/* Portal Navigation */}
                <motion.div variants={itemVariants} className="flex justify-start sm:justify-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                  {[
                    { id: 'urunler', icon: ShoppingBag, label: 'Ürünlerimiz' },
                    { id: 'haberler', icon: Newspaper, label: 'Haberler & Kampanyalar' },
                    { id: 'iletisim', icon: PhoneCall, label: 'Bize Ulaşın / Sipariş' }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setPortalTab(tab.id as any)} 
                      className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all border ${portalTab === tab.id ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}`}>
                      <tab.icon className="w-4 h-4" /> <span>{tab.label}</span>
                    </button>
                  ))}
                </motion.div>

                {/* Tab Contents */}
                <motion.div variants={itemVariants} key={portalTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1">
                  {portalTab === 'urunler' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                      {products.length === 0 && <p className="text-gray-500 col-span-full text-center py-10 w-full">Henüz yayınlanan ürün bulunmuyor.</p>}
                      {products.map((p: any) => (
                        <div key={p.id} className="bg-[#111522] rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 group shadow-lg flex flex-col min-h-[350px]">
                          <div className="h-48 min-h-[12rem] bg-[#0a0d14] relative overflow-hidden flex-shrink-0">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-900/50"><ShoppingBag className="w-12 h-12" /></div>}
                            {p.badge && <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase shadow-lg">{p.badge}</div>}
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg text-white mb-2 group-hover:text-cyan-400 transition-colors">{p.name}</h3>
                            <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4 flex-1">{p.description}</p>
                            <div className="mt-auto flex items-end justify-between border-t border-gray-800/50 pt-4">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Ortalama Fiyat</p>
                                <p className="text-cyan-400 font-black text-xl">{p.price} ₺</p>
                              </div>
                              <button onClick={()=>setPortalTab('iletisim')} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600/40 transition-colors border border-blue-500/20 flex items-center gap-1.5 shrink-0">
                                Sipariş <PhoneCall className="w-3 h-3"/>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {portalTab === 'haberler' && (
                    <div className="space-y-6 max-w-4xl mx-auto w-full">
                      {announcements.length === 0 && <p className="text-gray-500 text-center py-10 w-full">Henüz duyuru bulunmuyor.</p>}
                      {announcements.map((a: any) => (
                        <div key={a.id} className="bg-gradient-to-r from-[#111522] to-[#0d111b] p-1 rounded-2xl border border-gray-800 hover:border-purple-500/30 transition-colors group">
                           <div className="bg-[#111522] rounded-xl p-5 flex flex-col sm:flex-row gap-6 h-full">
                            {a.imageUrl && (
                              <div className="w-full sm:w-56 h-40 rounded-xl overflow-hidden flex-shrink-0 bg-black/40">
                                <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col justify-center">
                              <div className="flex justify-between items-center mb-3">
                                <span className="px-2.5 py-1 bg-purple-500/15 text-purple-400 border border-purple-500/20 text-[10px] font-bold rounded-lg uppercase tracking-wider">{a.badge || 'Duyuru'}</span>
                                <span className="text-xs font-semibold text-gray-500">{a.date}</span>
                              </div>
                              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">{a.title}</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">{a.text}</p>
                            </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {portalTab === 'iletisim' && (
                    <div className="max-w-xl mx-auto bg-[#111522] rounded-3xl border border-gray-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                      
                      <div className="text-center mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                          <PhoneCall className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h2 className="text-2xl font-black mb-2 text-white">Bize Ulaşın</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">Ürünlerimiz hakkında detaylı bilgi almak veya hızlı sipariş oluşturmak için formu doldurun.</p>
                      </div>
                      
                      <form onSubmit={handleContactSubmit} className="space-y-5 relative z-10">
                        <div>
                          <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider block mb-1">Adınız Soyadınız</label>
                          <input required value={contactName} onChange={e=>setContactName(e.target.value)} type="text" className="w-full bg-[#0a0d14] border border-gray-800 rounded-xl px-4 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm text-white transition-all shadow-inner" placeholder="İsim Soyisim" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider block mb-1">Telefon Numaranız</label>
                          <input required value={contactPhone} onChange={e=>setContactPhone(e.target.value)} type="tel" className="w-full bg-[#0a0d14] border border-gray-800 rounded-xl px-4 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm text-white transition-all shadow-inner" placeholder="05XX XXX XX XX" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider block mb-1">Talebiniz / Sipariş Mesajınız</label>
                          <textarea required value={contactMessage} onChange={e=>setContactMessage(e.target.value)} rows={4} className="w-full bg-[#0a0d14] border border-gray-800 rounded-xl px-4 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm text-white transition-all resize-none shadow-inner" placeholder="Sipariş vermek istediğiniz ürünler veya mesajınız..." />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
                          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : 'Talebi Gönder'}
                        </button>
                      </form>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                key="login" 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex-1 flex items-center justify-center p-4 w-full min-h-full"
              >
                <div className="w-full max-w-md bg-[#111522] rounded-3xl border border-gray-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <motion.div variants={itemVariants} className="text-center mb-8 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <User className="w-7 h-7 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-black mb-1 text-white">{loginConfig?.formTitle || 'Sisteme Giriş'}</h2>
                    <p className="text-gray-400 text-sm">{loginConfig?.formSubtitle || 'Personel veya yönetici paneline erişim'}</p>
                  </motion.div>

                  {loginConfig?.rightExtraText && (
                    <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-100/80 text-[13px] leading-relaxed relative z-10 shadow-lg">
                      {loginConfig.rightExtraText}
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants} className="flex bg-[#0a0d14] p-1 rounded-xl mb-6 border border-gray-800 relative z-10">
                    <button onClick={() => { setAdminTab('user'); setError(''); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${adminTab === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Personel</button>
                    <button onClick={() => { setAdminTab('admin'); setError(''); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${adminTab === 'admin' ? 'bg-red-700 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Yönetici</button>
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="mb-5 overflow-hidden"
                      >
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 relative z-10 font-medium">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.form variants={itemVariants} onSubmit={handleLogin} className="space-y-4 relative z-10">
                    {adminTab === 'user' ? (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider block mb-1">Kullanıcı Adı</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input required autoFocus value={username} onChange={e=>setUsername(e.target.value)} className="w-full bg-[#0a0d14] border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none text-white shadow-inner transition-all" placeholder="personel_adi" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider block mb-1">Şifre</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input required type={showPassword ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0a0d14] border border-gray-800 rounded-xl py-3.5 pl-11 pr-11 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none text-white shadow-inner transition-all" placeholder="••••••••" />
                            <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-6">
                          <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] text-white transition-all disabled:opacity-50">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5" />} Giriş Yap
                          </button>
                          
                          {hasBiometric && (
                            <button type="button" onClick={handleBiometricLogin} disabled={isLoading} className="w-full py-3.5 bg-[#0a0d14] hover:bg-white/5 border border-blue-500/30 rounded-xl font-bold flex justify-center items-center gap-2 text-blue-400 transition-all disabled:opacity-50">
                              <Fingerprint className="w-5 h-5" /> Parmak İzi ile Giriş Yap
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-bold text-red-400 ml-1 uppercase tracking-wider block mb-1">Yönetici Şifresi</label>
                          <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-600" />
                            <input required autoFocus type={showAdminPw ? 'text' : 'password'} value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full bg-[#0a0d14] border border-red-900/50 rounded-xl py-3.5 pl-11 pr-11 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-none text-white shadow-inner transition-all" placeholder="••••••••" />
                            <button type="button" onClick={()=>setShowAdminPw(!showAdminPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                              {showAdminPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 rounded-xl font-bold flex justify-center items-center gap-2 mt-6 shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all disabled:opacity-50">
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ShieldCheck className="w-5 h-5" />} Yetkili Giriş
                        </button>
                      </>
                    )}
                  </motion.form>

                  <motion.div variants={itemVariants} className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-[10px] sm:text-xs text-gray-500 relative z-10">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Güvenli Bağlantı</div>
                    <button onClick={() => setShowChangelog(true)} className="hover:text-gray-300 font-bold hover:underline">v{CURRENT_VERSION.version}</button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  );
}

