import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Sparkles, Bug, Paintbrush, Zap, BarChart3,
  Lock, ArrowLeft, Search, ChevronDown, ChevronRight,
  CheckCircle2, Package, TrendingUp, Hash, Star,
  X, Bell, Plus, Pencil, Trash2, AppWindow, Square, Minus, RefreshCcw, Activity, Info, FileText, MonitorCheck, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import {
  UPDATE_NOTES, CURRENT_VERSION, SEEN_VERSION_KEY,
  getVersionGroups, getAllVersions,
  addUpdateNote, updateUpdateNote, deleteUpdateNote,
  type UpdateCategory, type UpdateNote,
} from '../utils/updateNotes';
import { useGlobalTableData } from '../contexts/GlobalTableSyncContext';
import { useAuth } from '../contexts/AuthContext';

const CAT: Record<UpdateCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  security:    { label: 'Güvenlik',   icon: Lock,       color: 'text-[#00CC6A]', bg: 'bg-[#00CC6A]/10' },
  feature:     { label: 'Özellik',    icon: Sparkles,   color: 'text-[#0078D4]', bg: 'bg-[#0078D4]/10' },
  bugfix:      { label: 'Düzeltme',   icon: Bug,        color: 'text-[#E81123]', bg: 'bg-[#E81123]/10' },
  ui:          { label: 'Arayüz',     icon: Paintbrush, color: 'text-[#00B7C3]', bg: 'bg-[#00B7C3]/10' },
  performance: { label: 'Performans', icon: Zap,        color: 'text-[#FF8C00]', bg: 'bg-[#FF8C00]/10' },
  analytics:   { label: 'Analiz',     icon: BarChart3,  color: 'text-[#8764B8]', bg: 'bg-[#8764B8]/10' },
};

const IMPACT: Record<string, { label: string; color: string }> = {
  high:   { label: 'Kritik',  color: 'text-[#E81123]' },
  medium: { label: 'Önemli',  color: 'text-[#FF8C00]' },
  low:    { label: 'Küçük',   color: 'text-[#A0AABF]' },
};

export function UpdateNotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Yönetici';

  const liveNotes = useGlobalTableData<UpdateNote>('guncelleme_notlari');
  const notes = liveNotes.length > 0 ? liveNotes : UPDATE_NOTES;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<UpdateNote | null>(null);

  const handleEdit = (note: UpdateNote) => { setEditingNote(note); setModalOpen(true); };
  const handleOpenAdd = () => { setEditingNote(null); setModalOpen(true); };
  const handleDelete = async (id: string) => {
    if(!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteUpdateNote(id);
      toast.success('Not başarıyla silindi.');
    } catch (e: any) {
      toast.error(`Silinemedi: ${e?.message}`);
    }
  };

  const [hasNew, setHasNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');

  const existingVersions = useMemo(() => getAllVersions(notes), [notes]);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_VERSION_KEY);
    setHasNew(!seen || seen !== CURRENT_VERSION);
  }, []);

  const markSeen = () => {
    localStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
    setHasNew(false);
    window.dispatchEvent(new CustomEvent('update_notes_seen'));
    toast.success('Sistemin güncel olduğu doğrulandı.');
  };

  const grouped = useMemo(() => getVersionGroups(notes), [notes]);

  // Win11 styled UI
  return (
    <div className="h-dvh flex flex-col bg-[#202020] text-gray-100 font-sans" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      
      {/* Title Bar */}
      <div className="h-8 flex items-center justify-between bg-[#1C1C1C] select-none shrink-0 border-b border-black/50">
        <div className="flex items-center gap-2.5 px-3">
          <RefreshCcw className="w-3.5 h-3.5 text-[#0078D4]" />
          <span className="text-xs text-muted-foreground">Windows Update Merkezi</span>
        </div>
        <div className="flex h-full">
          <button className="px-4 hover:bg-white/10 text-muted-foreground transition-colors flex items-center justify-center">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="px-4 hover:bg-white/10 text-muted-foreground transition-colors flex items-center justify-center">
            <Square className="w-3 h-3" />
          </button>
          <button onClick={() => navigate(-1)} className="px-4 hover:bg-[#E81123] hover:text-foreground text-muted-foreground transition-colors flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar */}
        <div className="hidden md:flex w-72 flex-col pt-3 pb-2 px-1 border-r border-[#333333] bg-[#202020]">
           <div className="flex items-center gap-3 px-3 py-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0078D4]/20 flex items-center justify-center border border-[#0078D4]/30">
                <ShieldCheck className="w-5 h-5 text-[#0078D4]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">MERT.4 ERP</div>
                <div className="text-[10px] text-muted-foreground">Sistem Ayarları</div>
              </div>
           </div>

           <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Güncelleştirme ve Güvenlik</div>
           
           <button 
             onClick={() => setActiveTab('status')}
             className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-md transition-colors ${activeTab === 'status' ? 'bg-white/10' : 'hover:bg-white/5'}`}
           >
             <RefreshCcw className={`w-4 h-4 ${activeTab === 'status' ? 'text-[#0078D4]' : 'text-muted-foreground'}`} />
             <span className="text-sm text-gray-200">Windows Update</span>
             {hasNew && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0078D4]" />}
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-md transition-colors ${activeTab === 'history' ? 'bg-white/10' : 'hover:bg-white/5'}`}
           >
             <FileText className={`w-4 h-4 ${activeTab === 'history' ? 'text-[#0078D4]' : 'text-muted-foreground'}`} />
             <span className="text-sm text-gray-200">Güncelleştirme geçmişi</span>
           </button>
           
           <div className="mt-auto px-3 py-2">
             {isAdmin && (
               <button onClick={handleOpenAdd} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0078D4] hover:bg-[#0078D4]/80 text-foreground rounded-md text-sm transition-colors shadow-md">
                 <Plus className="w-4 h-4" /> Yeni Not Ekle
               </button>
             )}
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#181818]">
            {/* Mobile Header / Nav Items for Small screens */}
            <div className="md:hidden flex p-2 border-b border-[#333] bg-[#202020] gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('status')} className={`px-4 py-2 rounded text-sm whitespace-nowrap ${activeTab === 'status' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'}`}>Windows Update</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded text-sm whitespace-nowrap ${activeTab === 'history' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'}`}>Güncelleme Geçmişi</button>
                {isAdmin && <button onClick={handleOpenAdd} className="px-4 py-2 rounded text-sm whitespace-nowrap bg-[#0078D4] text-foreground">Yeni Ekle</button>}
            </div>

          <AnimatePresence mode="wait">
           {activeTab === 'status' ? (
             <motion.div key="status" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto py-8 px-6 lg:px-8">
                <h1 className="text-3xl font-semibold text-foreground mb-6">Windows Update</h1>
                
                <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
                   <div className="pt-1">
                     {hasNew ? (
                       <RefreshCcw className="w-10 h-10 text-[#FF8C00] animate-spin-slow" />
                     ) : (
                       <MonitorCheck className="w-10 h-10 text-[#00CC6A]" />
                     )}
                   </div>
                   <div className="flex-1">
                     <h2 className="text-xl font-medium text-foreground mb-1">
                       {hasNew ? "Güncelleştirmeler var" : "Güncelsiniz"}
                     </h2>
                     <p className="text-sm text-muted-foreground mb-4">
                       Son denetleme: Bugün, {new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
                     </p>
                     
                     <AnimatePresence>
                       {hasNew && (
                         <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }} className="p-4 rounded-md bg-[#2D2D2D] border border-border mb-4 flex items-center justify-between overflow-hidden">
                           <div>
                              <div className="font-medium text-foreground text-sm">ERP Sistem Güncelleştirmesi - Sürüm {CURRENT_VERSION}</div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2"><RefreshCcw className="w-3 h-3 animate-spin"/> İndiriliyor ve yükleniyor... %100</div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <button 
                       onClick={() => {
                         if(hasNew) {
                            markSeen();
                         } else {
                            toast.success('Şu anda en güncel sürümü kullanıyorsunuz.');
                         }
                       }} 
                       className="px-4 py-2 bg-[#2D2D2D] hover:bg-[#333333] border border-gray-600 hover:border-gray-400 rounded text-sm text-foreground transition-colors shadow-sm"
                     >
                       {hasNew ? "Şimdi Yeniden Başlat" : "Güncelleştirmeleri denetle"}
                     </button>
                   </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-1 mt-12 bg-[#282828] border border-border rounded-lg overflow-hidden">
                   <div className="px-4 py-3 border-b border-border flex items-center justify-between hover:bg-white/5 cursor-pointer">
                      <div className="flex items-center gap-3">
                         <Activity className="w-5 h-5 text-muted-foreground" />
                         <div>
                           <div className="text-sm text-foreground">Etkin saatleri değiştir</div>
                           <div className="text-xs text-muted-foreground">Şu anda 08:00 - 17:00 olarak ayarlandı</div>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                   </div>
                   <div className="px-4 py-3 border-b border-border flex items-center justify-between hover:bg-white/5 cursor-pointer" onClick={() => setActiveTab('history')}>
                      <div className="flex items-center gap-3">
                         <FileText className="w-5 h-5 text-muted-foreground" />
                         <div>
                           <div className="text-sm text-foreground">Güncelleştirme geçmişini görüntüle</div>
                           <div className="text-xs text-muted-foreground">Cihazınıza yüklenen başarılı güncellemelere bakın</div>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                   </div>
                   <div className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer">
                      <div className="flex items-center gap-3">
                         <AppWindow className="w-5 h-5 text-muted-foreground" />
                         <div>
                           <div className="text-sm text-foreground">Gelişmiş seçenekler</div>
                           <div className="text-xs text-muted-foreground">Ek güncelleştirme denetimleri ve ayarlar</div>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                   </div>
                </motion.div>
             </motion.div>
           ) : (
             <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto py-8 px-6 lg:px-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setActiveTab('status')} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-muted-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-semibold text-foreground">Güncelleştirme geçmişi</h1>
                </div>
                
                <div className="space-y-6">
                  {grouped.map(([version, versionNotes], vi) => (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: vi * 0.1 }} key={version} className="bg-[#2D2D2D]/60 border border-border rounded-lg overflow-hidden shadow-sm">
                       <div className="bg-[#2B2B2B] px-5 py-3 border-b border-border flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <MonitorCheck className="w-5 h-5 text-[#0078D4]" />
                           <div>
                             <div className="text-sm font-semibold text-foreground">ERP Kalite Güncelleştirmesi (Sürüm {version})</div>
                             <div className="text-xs text-muted-foreground">{new Date(versionNotes[0].date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde başarıyla yüklendi</div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="divide-y divide-white/5">
                         {versionNotes.map(note => {
                           const NoteIcon = CAT[note.category].icon;
                           return (
                           <div key={note.id} className="relative group px-5 py-4 hover:bg-white/[0.02]">
                              <div className="flex items-start gap-4">
                                 <div className={`mt-0.5 w-7 h-7 rounded flex items-center justify-center shrink-0 ${CAT[note.category].bg}`}>
                                   <NoteIcon className={`w-4 h-4 ${CAT[note.category].color}`} />
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <div className="text-sm font-medium text-gray-200">{note.title}</div>
                                      {note.isNew && <span className="px-1.5 py-0.5 text-[9px] bg-[#FF8C00]/20 text-[#FF8C00] rounded uppercase tracking-wider font-semibold">Yeni</span>}
                                      <span className={`px-1.5 py-0.5 text-[9px] border rounded ${CAT[note.category].bg} border-current ${CAT[note.category].color}`}>
                                          {CAT[note.category].label}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                                      {note.description}
                                    </p>
                                    {note.details && note.details.length > 0 && (
                                      <ul className="mt-3 space-y-1.5 pl-1 max-w-2xl">
                                        {note.details.map((d, i) => (
                                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <span className="text-muted-foreground mt-[3px] shrink-0 text-[10px]">■</span> {d}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                 </div>
                                 {isAdmin && (
                                   <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0 ml-4">
                                      <button onClick={() => handleEdit(note)} className="p-2 hover:bg-white/10 rounded-md text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDelete(note.id)} className="p-2 hover:bg-red-500/20 rounded-md text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                   </div>
                                 )}
                              </div>
                           </div>
                           );
                         })}
                       </div>
                    </motion.div>
                  ))}
                  
                  {grouped.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>Hiç güncelleme geçmişi bulunamadı.</p>
                      </div>
                  )}
                </div>
             </motion.div>
           )}
          </AnimatePresence>
        </div>
      </div>

      <NoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingNote}
        existingVersions={existingVersions}
      />
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
interface NoteForm {
  version: string; newVersion: string; category: UpdateCategory;
  title: string; description: string; details: string[];
  impact: 'high' | 'medium' | 'low'; isNew: boolean; emoji: string;
}

const DEFAULT_FORM: NoteForm = {
  version: CURRENT_VERSION, newVersion: '', category: 'feature',
  title: '', description: '', details: [''],
  impact: 'medium', isNew: false, emoji: '',
};

function NoteModal({ open, onClose, editing, existingVersions }: {
  open: boolean; onClose: () => void;
  editing: UpdateNote | null;
  existingVersions: string[];
}) {
  const [form, setForm] = useState<NoteForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [useNewVer, setUseNewVer] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        version: editing.version, newVersion: '',
        category: editing.category, title: editing.title,
        description: editing.description, details: editing.details?.length ? editing.details : [''],
        impact: editing.impact, isNew: editing.isNew ?? false, emoji: editing.emoji ?? '',
      });
      setUseNewVer(!existingVersions.includes(editing.version));
    } else {
      setForm(DEFAULT_FORM);
      setUseNewVer(false);
    }
  }, [editing, open]);

  const finalVersion = useNewVer ? form.newVersion : form.version;

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Başlık zorunlu'); return; }
    if (!finalVersion.trim()) { toast.error('Sürüm zorunlu'); return; }
    setSaving(true);
    try {
      const payload = {
        version: finalVersion.trim(),
        date: new Date().toISOString().split('T')[0],
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        details: form.details.filter(d => d.trim()),
        impact: form.impact,
        isNew: form.isNew,
        emoji: form.emoji.trim() || undefined,
      };
      if (editing) {
        await updateUpdateNote(editing.id, payload);
        toast.success('Değişiklikler kaydedildi');
      } else {
        await addUpdateNote(payload);
        toast.success('Yeni not eklendi');
      }
      onClose();
    } catch (e: any) {
      toast.error(`Hata: ${e?.message || 'Bilinmeyen'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateDetail = (i: number, val: string) => {
    setForm(f => { const d = [...f.details]; d[i] = val; return { ...f, details: d }; });
  };
  const addDetail = () => setForm(f => ({ ...f, details: [...f.details, ''] }));
  const removeDetail = (i: number) => setForm(f => ({ ...f, details: f.details.filter((_, j) => j !== i) }));

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[100] transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#202020] border border-[#333] rounded-lg z-[101] shadow-xl w-[95vw] max-w-xl max-h-[90vh] flex flex-col font-sans" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
          
          <div className="px-5 py-4 border-b border-[#333] flex justify-between items-center bg-[#2B2B2B] rounded-t-lg shrink-0">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {editing ? 'Güncellemeyi Düzenle' : 'Yeni Güncelleme Notu'}
            </Dialog.Title>
            <Dialog.Close className="hover:bg-white/10 p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="p-5 overflow-y-auto space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sürüm Durumu</label>
                 <select value={useNewVer ? 'new' : 'existing'} onChange={e => setUseNewVer(e.target.value === 'new')} className="w-full bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]">
                    <option value="existing">Mevcut Sürüm</option>
                    <option value="new">Yeni Sürüm Tanımla</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sürüm Numarası</label>
                 {useNewVer ? (
                   <input value={form.newVersion} onChange={e => setForm(f => ({...f, newVersion: e.target.value}))} placeholder="vX.X.X" className="w-full bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]" />
                 ) : (
                   <select value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} className="w-full bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]">
                     {existingVersions.map(v => <option key={v} value={v}>{v}</option>)}
                   </select>
                 )}
              </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-muted-foreground mb-2">Kategori</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {(Object.keys(CAT) as UpdateCategory[]).map(k => {
                    const c = CAT[k];
                    const active = form.category === k;
                    return (
                      <button key={k} onClick={() => setForm(f => ({...f, category: k}))} className={`flex items-center gap-2 p-2 rounded border text-xs font-medium transition-colors ${active ? `border-[#0078D4] bg-[#0078D4]/20 text-foreground` : 'border-[#333] bg-[#1A1A1A] text-muted-foreground hover:bg-white/5'}`}>
                         <c.icon className="w-3.5 h-3.5" />
                         {c.label}
                      </button>
                    )
                 })}
               </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Duyuru Başlığı</label>
               <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="w-full bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]" />
            </div>

            <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Kısa Açıklama</label>
               <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full resize-none bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]" />
            </div>
            
            <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Değişiklik Detayları (Madde Madde)</label>
               <div className="space-y-2">
                 {form.details.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={d} onChange={e => updateDetail(i, e.target.value)} placeholder={`Detay ${i+1}`} className="flex-1 bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]" />
                      <button onClick={() => removeDetail(i)} className="px-3 bg-[#333] hover:bg-red-500/20 hover:text-red-400 text-muted-foreground rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 ))}
                 <button onClick={addDetail} className="text-xs text-[#0078D4] hover:text-[#0078D4]/80 flex items-center gap-1 font-medium mt-1"><Plus className="w-3.5 h-3.5"/> Madde Ekle</button>
               </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-[#333]">
               <label className="flex flex-1 items-center gap-2 cursor-pointer border border-[#333] bg-[#1A1A1A] p-2 rounded">
                 <input type="checkbox" checked={form.isNew} onChange={e => setForm(f => ({...f, isNew: e.target.checked}))} className="w-4 h-4 accent-[#0078D4]" />
                 <span className="text-sm text-muted-foreground">"Yeni" Etiketi Vurgusu</span>
               </label>
               
               <div className="flex-1">
                  <select value={form.impact} onChange={e => setForm(f => ({...f, impact: e.target.value as any}))} className="w-full h-full min-h-[40px] bg-[#1A1A1A] border border-[#333] rounded p-2 text-sm text-foreground focus:outline-none focus:border-[#0078D4]">
                    <option value="low">Öncelik: Düşük</option>
                    <option value="medium">Öncelik: Orta</option>
                    <option value="high">Öncelik: Yüksek (Kritik)</option>
                  </select>
               </div>
            </div>
          </div>

          <div className="p-4 border-t border-[#333] bg-[#2B2B2B] rounded-b-lg flex justify-end gap-3 shrink-0">
             <Dialog.Close className="px-5 py-2 rounded bg-transparent border border-gray-500 hover:border-gray-400 hover:bg-white/5 text-sm text-foreground transition-colors">İptal</Dialog.Close>
             <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded bg-[#0078D4] hover:bg-[#0078D4]/90 disabled:bg-[#0078D4]/50 text-sm text-foreground transition-colors font-medium">
               {saving ? 'Kaydediliyor...' : 'Kaydet'}
             </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
