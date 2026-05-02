import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { getUpdateMessages } from '../lib/update-messages';

interface UpdateOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({ isVisible, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [funMessage, setFunMessage] = useState("");
  const [status, setStatus] = useState<'updating' | 'success' | 'error'>('updating');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Eğlenceli mesajları döngüye al
    let msgIndex = 0;
    const loadMessages = async () => {
      const msgs = await getUpdateMessages();
      const interval = setInterval(() => {
        setFunMessage(msgs[msgIndex % msgs.length]);
        msgIndex++;
      }, 3000);
      return () => clearInterval(interval);
    };
    loadMessages();

    // Electron'dan gelen logları dinle
    if ((window as any).electron) {
      (window as any).electron.on('update-log', (newLog: string) => {
        setLogs(prev => [...prev.slice(-50), newLog]); // Son 50 logu tut
      });
      (window as any).electron.on('update-finished', (res: { success: boolean }) => {
        setStatus(res.success ? 'success' : 'error');
      });
    }

    return () => {
      if ((window as any).electron) {
        (window as any).electron.removeAllListeners('update-log');
        (window as any).electron.removeAllListeners('update-finished');
      }
    };
  }, [isVisible]);

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
      <div className="max-w-3xl w-full space-y-8 text-center">
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
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">
            {status === 'updating' ? 'Sistem Güncelleniyor' : status === 'success' ? 'Güncelleme Tamamlandı' : 'Bir Sorun Oluştu'}
          </h1>
          <p className="text-blue-400 font-medium h-6">{funMessage}</p>
        </div>

        {/* Terminal Logları */}
        <div className="bg-black/60 border border-border rounded-2xl p-4 text-left font-mono text-[11px] h-[300px] flex flex-col shadow-2xl">
          <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
            <Terminal className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground uppercase tracking-widest text-[9px]">Sistem Konsolu</span>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-emerald-500/80">
            {logs.length === 0 && <span className="text-gray-700 italic">Loglar bekleniyor...</span>}
            {logs.map((log, i) => (
              <div key={i} className="leading-relaxed border-l border-emerald-500/20 pl-2">
                <span className="text-emerald-900 mr-2">[{i}]</span> {log}
              </div>
            ))}
          </div>
        </div>

        {status === 'success' && (
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            Sistemi Yeniden Başlat
          </button>
        )}

        {status === 'error' && (
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-foreground rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20"
          >
            Kapat ve Manuel Kontrol Et
          </button>
        )}
      </div>
    </motion.div>
  );
};
