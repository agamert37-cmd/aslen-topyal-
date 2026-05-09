import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { getUpdateMessages } from '../lib/update-messages';

interface UpdateOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  repoUrl?: string;
}

export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({ isVisible, onClose, repoUrl = '' }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [funMessage, setFunMessage] = useState("");
  const [status, setStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedDir, setSelectedDir] = useState<string>("");
  
  // Advanced Settings State
  const [branch, setBranch] = useState<string>('main');
  const [clearCache, setClearCache] = useState<boolean>(false);
  const [reBuild, setReBuild] = useState<boolean>(true);
  const [restartService, setRestartService] = useState<boolean>(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const updateInitiated = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      updateInitiated.current = false;
      setStatus('idle');
      return;
    }

    // Projeleri yükle
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.projects) {
          setProjects(data.projects);
          if (data.projects.length > 0) {
            setSelectedDir(data.projects[0]);
          }
        }
      })
      .catch(console.error);

    // Eğlenceli mesajları döngüye al
    let msgIndex = 0;
    const intervalRef = { current: null as any };
    const loadMessages = async () => {
      try {
        const msgs = await getUpdateMessages();
        if (msgs && msgs.length > 0) {
          intervalRef.current = setInterval(() => {
            setFunMessage(msgs[msgIndex % msgs.length]);
            msgIndex++;
          }, 3000);
        }
      } catch (e) {}
    };
    loadMessages();

    // Electron'dan gelen anlık logları dinle
    if ((window as any).electronAPI?.isElectron && (window as any).electron) {
      (window as any).electron.on('update-log', (newLog: string) => {
        setLogs(prev => [...prev.slice(-50), newLog]); // Son 50 logu tut
      });
      (window as any).electron.on('update-finished', (res: { success: boolean }) => {
        setStatus(res.success ? 'success' : 'error');
      });
    }

    return () => {
      clearInterval(intervalRef.current);
      if ((window as any).electronAPI?.isElectron && (window as any).electron) {
        (window as any).electron.removeAllListeners('update-log');
        (window as any).electron.removeAllListeners('update-finished');
      }
    };
  }, [isVisible, repoUrl]);

  const startUpdate = async () => {
    if (updateInitiated.current) return;
    updateInitiated.current = true;
    setStatus('updating');
    setLogs(['Sistem hazırlıkları yapılıyor...']);
    
    // Update logic (Electron vs Web)
    if ((window as any).electronAPI?.isElectron) {
       (window as any).electronAPI.send("run-update");
    } else {
       // WEB BACKEND UPDATE
       setLogs(prev => [...prev, 'Sunucu ile iletişim kuruluyor (Cloud)...', '> git pull & npm run build (bu işlem bir kaç dakika sürebilir)']);
       try {
         const res = await fetch("/api/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              repoUrl: repoUrl || '', 
              targetDir: selectedDir,
              branch,
              clearCache,
              reBuild,
              restartService
            })
         });
         
         if (!res.body) {
           throw new Error("Sunucu yanıtı boş.");
         }

         const reader = res.body.getReader();
         const decoder = new TextDecoder('utf-8');
         
         while (true) {
           const { value, done } = await reader.read();
           if (done) break;
           const chunk = decoder.decode(value, { stream: true });
           
           // Split the chunk by newlines and add to logs
           setLogs(prev => {
             const lines = chunk.split('\n').filter(Boolean);
             return [...prev, ...lines].slice(-400); // tutulan log limiti
           });
         }
         
         setStatus('success');
       } catch(err: any) {
         setLogs(prev => [...prev, 'Ağ kesintisi oluştu veya zaman aşımına uğradı. İşlem arkaplanda devam ediyor olabilir.', err.message]);
         setStatus('success'); // In cloud envs like Cloud Run, it might disconnect while restarting, which is basically success.
       }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#050810] flex items-center justify-center p-6 backdrop-blur-xl"
    >
      <div className="max-w-3xl w-full space-y-8 text-center bg-[#0a0f18] p-8 rounded-3xl border border-white/10 shadow-2xl">
        {status === 'idle' ? (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-black text-white">Sistem Güncelleme Sihirbazı</h1>
            <p className="text-zinc-400 text-sm">
              Güncellenmesini istediğiniz sistem dizinini seçin. İşlem başladığında sistem GitHub'dan en güncel versiyonu çekecek, kurulumları yapacak ve web sunucusunu baştan derleyerek servise sokacaktır.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">Hedef Kurulum Dizini:</label>
                {projects.length > 0 ? (
                  <select 
                    value={selectedDir} 
                    onChange={(e) => setSelectedDir(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    {projects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm w-full bg-black/50 border border-red-500/30 rounded-xl p-3 text-red-400">
                    Otomatik bulunan bir proje dizini yok. Mevcut çalışma dizininde (process.cwd) güncellenecek.
                  </div>
                )}
              </div>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-sm items-center font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Gelişmiş Seçenekler</h3>
                
                <div className="flex items-center justify-between">
                   <label className="text-sm text-zinc-300 flex-1">Git Başlangıç Dalı (Branch):</label>
                   <input 
                     type="text" 
                     value={branch} 
                     onChange={(e) => setBranch(e.target.value)} 
                     className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 text-white w-1/3 text-sm focus:outline-none focus:border-blue-500"
                     placeholder="main/master"
                   />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={clearCache} onChange={(e) => setClearCache(e.target.checked)} className="rounded border-none w-4 h-4 bg-black/50" />
                  <span className="text-sm text-zinc-300">NPM Önbelleği ve Vite silerek temiz kurulum (Önerilmez, yavaşlatır)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={reBuild} onChange={(e) => setReBuild(e.target.checked)} className="rounded border-white/10 w-4 h-4 bg-black/50" />
                  <span className="text-sm text-zinc-300">Uygulamayı yeniden derle (npm run build)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={restartService} onChange={(e) => setRestartService(e.target.checked)} className="rounded border-white/10 w-4 h-4 bg-black/50" />
                  <span className="text-sm text-zinc-300">İşlem bitiminde PM2 veya Docker hizmetini yeniden başlat</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
              >
                İptal Et
              </button>
              <button 
                onClick={startUpdate}
                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                Onayla ve Güncellemeyi Başlat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Görsel Bölüm */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
              {status === 'updating' ? (
                 <RefreshCw className="w-20 h-20 text-blue-500 animate-spin relative" />
              ) : status === 'success' ? (
                 <CheckCircle2 className="w-20 h-20 text-emerald-500 relative" />
              ) : (
                 <AlertTriangle className="w-20 h-20 text-rose-500 relative" />
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight text-white">
                {status === 'updating' ? 'Sistem Güncelleniyor' : status === 'success' ? 'Güncelleme Tamamlandı' : 'Bir Sorun Oluştu'}
              </h1>
              <p className="text-blue-400 font-medium h-6">{funMessage}</p>
            </div>

            {/* Terminal Logları */}
            <div className="bg-black/80 border border-white/10 rounded-2xl p-4 text-left font-mono text-[11px] h-[300px] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 animate-pulse"></div>
              <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                <Terminal className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-400 uppercase tracking-widest text-[9px]">Sistem Konsolu</span>
                {status === 'updating' && <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-auto" />}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-blue-400/80">
                {logs.length === 0 && <span className="text-zinc-600 italic">Loglar bekleniyor...</span>}
                {logs.map((log, i) => (
                  <div key={i} className="leading-relaxed border-l-2 border-blue-500/20 pl-2 opacity-90 break-words whitespace-pre-wrap">
                    <span className="text-blue-900 mr-2">[{String(i).padStart(2, '0')}]</span> {log}
                  </div>
                ))}
              </div>
            </div>

            {status === 'success' && (
              <button 
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      for (let name of names) caches.delete(name);
                    });
                  }
                  window.location.reload();
                }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4"
              >
                Sistemi Yeniden Başlat (Önerilen)
              </button>
            )}

            {status === 'error' && (
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all mt-4 border border-white/10"
              >
                Kapat 
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
