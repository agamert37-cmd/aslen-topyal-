import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, Edit2, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import { useTableSync } from '../hooks/useTableSync';
import { StorageKey } from '../utils/storage';

const getLS = (key: string, fallback: any = []) => {
   try {
      const data = localStorage.getItem('isleyen_et_' + key);
      return data ? JSON.parse(data) : fallback;
   } catch {
      return fallback;
   }
};

const setLS = (key: string, value: any) => {
   try {
      localStorage.setItem('isleyen_et_' + key, JSON.stringify(value));
   } catch(e) {
      console.error(e);
   }
};

export interface PendingAITransaction {
  id: string;
  type: 'satis' | 'alis' | 'gider' | 'cek' | 'tahsilat' | 'cari';
  data: any;
  summary: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function AIPendingApprovals() {
  const [pendingItems, setPendingItems] = useState<PendingAITransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<string>('');
  
  const { user } = useAuth();
  const { currentEmployee } = useEmployee();

  // Table Sync Hooks
  const { addItem: addFisSync } = useTableSync<any>({ tableName: 'fisler', storageKey: StorageKey.FISLER });
  const { data: syncCariList, updateItem: updateCariSync, addItem: addCariSync } = useTableSync<any>({ tableName: 'cari_hesaplar', storageKey: StorageKey.CARI_DATA });
  const { addItem: addKasaSync } = useTableSync<any>({ tableName: 'kasa_islemleri', storageKey: StorageKey.KASA_DATA });

  // Load items
  useEffect(() => {
    const list = getLS('ai_pending_transactions', []);
    setPendingItems(list.filter((i: any) => i.status === 'pending').sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const saveToStorage = (updatedList: PendingAITransaction[]) => {
    setPendingItems(updatedList.filter(i => i.status === 'pending'));
    const currentAll = getLS('ai_pending_transactions', []);
    const newAll = currentAll.map((old: any) => {
      const found = updatedList.find(n => n.id === old.id);
      return found ? found : old;
    });
    updatedList.forEach(n => {
      if (!currentAll.find((old: any) => old.id === n.id)) {
        newAll.push(n);
      }
    });
    setLS('ai_pending_transactions', newAll);
  };

  const handleApprove = async (item: PendingAITransaction) => {
    try {
      if (item.type === 'satis' || item.type === 'alis') {
        const newFis = {
          ...item.data,
          id: `fi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          date: new Date().toISOString(),
          approvedBy: currentEmployee?.name || user?.name || 'Sistem',
          mode: item.type
        };
        await addFisSync(newFis);

        // Update cari balances if needed
        if (newFis.cariId && newFis.total) {
          const karZarar = (newFis.total || 0) - (newFis.payment?.amount || 0);
          const cari = syncCariList.find(c => c.id === newFis.cariId);
          if (cari) {
             await updateCariSync(cari.id, { balance: cari.balance + (item.type === 'satis' ? karZarar : -karZarar) });
          }
        }

        // Kasa
        if (newFis.payment?.amount > 0) {
           await addKasaSync({
             id: `kasa-${Date.now()}`,
             type: item.type === 'satis' ? 'Gelir' : 'Gider',
             category: item.type === 'satis' ? 'Satış Tahsilatı' : 'Alış Ödemesi',
             amount: newFis.payment?.amount,
             date: new Date().toISOString().split('T')[0],
             description: newFis.description || `Yapay Zeka Onayı: ${item.summary}`
           });
        }
      } else if (item.type === 'gider') {
          const newFis = item.data;
          await addKasaSync({
             id: `kasa-${Date.now()}`,
             type: 'Gider',
             category: newFis.category || 'Diğer',
             amount: newFis.amount,
             date: new Date().toISOString().split('T')[0],
             description: newFis.description || `Yapay Zeka Onayı: ${item.summary}`
          });
      } else if (item.type === 'cari') {
          const newCari = {
             type: item.data.type || 'Müşteri',
             companyName: item.data.companyName || item.data.name || 'Yeni İsimsiz Cari',
             contactPerson: item.data.contactPerson || item.data.name || '',
             phone: item.data.phone || '0000000000',
             email: item.data.email || '',
             address: item.data.address || 'Belirtilmedi',
             taxNumber: item.data.taxNumber || '1111111111',
             taxOffice: item.data.taxOffice || 'Bilinmiyor',
             region: item.data.region || 'Merkez',
             balance: Number(item.data.balance) || 0,
             transactions: 0,
             transactionHistory: [],
             id: `cari-${Date.now()}`,
             createdAt: new Date().toISOString()
          };
          await addCariSync(newCari);
      }

      const updated = pendingItems.map(p => p.id === item.id ? { ...p, status: 'approved' as const } : p);
      saveToStorage(updated);
      toast.success('İşlem başarıyla onaylandı ve sisteme yansıdı.');
    } catch (e) {
      console.error(e);
      toast.error('Onaylanırken hata oluştu.');
    }
  };

  const handleReject = (id: string) => {
    const updated = pendingItems.map(p => p.id === id ? { ...p, status: 'rejected' as const } : p);
    saveToStorage(updated);
    toast.error('İşlem iptal edildi.');
  };

  const startEdit = (item: PendingAITransaction) => {
    setEditingId(item.id);
    setEditData(JSON.stringify(item.data, null, 2));
  };

  const saveEdit = (id: string) => {
    try {
      const parsed = JSON.parse(editData);
      const updated = pendingItems.map(p => p.id === id ? { ...p, data: parsed } : p);
      setPendingItems(updated); // temporary set, not full save yet until approved or modified in LS
      
      // Update LS immediately
      const currentAll = getLS('ai_pending_transactions', []);
      const newAll = currentAll.map((old: any) => old.id === id ? { ...old, data: parsed } : old);
      setLS('ai_pending_transactions', newAll);
      
      setEditingId(null);
      toast.success('Düzenleme kaydedildi.');
    } catch (e: any) {
       toast.error(`JSON Dosyasında kural ihlali var: ${e.message}. Tırnakları ve virgülleri kontrol edin.`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      
      const currentAll = getLS('ai_pending_transactions', []);
      const newAll = currentAll.map((old: any) => old.id === id ? { ...old, data: { ...old.data, photoUrl: base64 } } : old);
      setLS('ai_pending_transactions', newAll);
      
      const updatedItems = pendingItems.map(p => p.id === id ? { ...p, data: { ...p.data, photoUrl: base64 } } : p);
      setPendingItems(updatedItems);
      toast.success("Fiş fotoğrafı başarıyla eklendi.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 sm:p-6 pb-20">
      <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
         Bekleyen Yapay Zeka İşlemleri
         <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-full">{pendingItems.length}</span>
      </h2>
      {pendingItems.length === 0 ? (
        <div className="text-center p-8 bg-secondary/50 rounded-xl border border-border">
          <p className="text-muted-foreground">Şu anda onay bekleyen işlem bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {pendingItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border p-4 rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-bold uppercase rounded bg-blue-500/20 text-blue-400">
                      {item.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                       <button onClick={() => saveEdit(item.id)} className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-lg transition-colors flex items-center gap-1">
                         <Save className="w-5 h-5" />
                         <span className="font-semibold text-sm">Kaydet</span>
                       </button>
                    ) : (
                       <button onClick={() => startEdit(item)} className="p-2 bg-secondary/80 text-foreground hover:bg-secondary rounded-lg transition-colors">
                         <Edit2 className="w-5 h-5 cursor-pointer" />
                       </button>
                    )}
                    <label className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-lg transition-colors cursor-pointer" title="Fiş / Belge Fotoğrafı Ekle">
                      <ImageIcon className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, item.id)} />
                    </label>
                    <button onClick={() => handleReject(item.id)} className="p-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-lg transition-colors" title="İptal Et">
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleApprove(item)} className="p-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 rounded-lg transition-colors flex items-center gap-1" title="Onayla">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold text-sm">Onayla</span>
                    </button>
                  </div>
                </div>
                <p className="text-foreground font-medium mb-3">{item.summary}</p>
                
                {item.data?.photoUrl && (
                  <div className="mb-3">
                     <p className="text-xs text-muted-foreground mb-1">Fiş / Belge Fotoğrafı:</p>
                     <img src={item.data.photoUrl} alt="Fiş" className="w-32 h-32 object-cover rounded-md border border-border" />
                  </div>
                )}
                
                {editingId === item.id ? (
                   <div className="mt-3">
                      <textarea 
                        value={editData}
                        onChange={(e) => setEditData(e.target.value)}
                        className="w-full h-40 bg-background border border-border p-3 rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        spellCheck={false}
                      />
                   </div>
                ) : (
                   <div className="p-3 bg-secondary/50 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
                     <pre>{JSON.stringify(item.data, null, 2)}</pre>
                   </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
