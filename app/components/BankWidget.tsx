/**
 * BankWidget – Tahsilat ve çek işlemleri için hafif banka yönetimi.
 * KasaPage içinde gömülü kullanılır.
 */
import React, { useState, useCallback } from 'react';
import { Landmark, Plus, X, Check, Building2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTableSync } from '../hooks/useTableSync';
import { StorageKey } from '../utils/storage';

export interface SimpleBank {
  id: string;
  name: string;
  code?: string;
  branch?: string;
  type?: 'banka' | 'pos'; // Banka Hesabı veya POS Cihazı
}

const POPULAR_BANKS = [
  'Ziraat Bankası', 'İş Bankası', 'Garanti BBVA', 'Akbank',
  'Yapı Kredi', 'Halkbank', 'Vakıfbank', 'Denizbank',
  'QNB Finansbank', 'TEB',
];

const BANK_ACCENT_COLORS = [
  'from-blue-500/20 to-blue-600/10 border-blue-500/25 text-blue-400',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/25 text-emerald-400',
  'from-purple-500/20 to-purple-600/10 border-purple-500/25 text-purple-400',
  'from-amber-500/20 to-amber-600/10 border-amber-500/25 text-amber-400',
  'from-cyan-500/20 to-cyan-600/10 border-cyan-500/25 text-cyan-400',
  'from-rose-500/20 to-rose-600/10 border-rose-500/25 text-rose-400',
  'from-indigo-500/20 to-indigo-600/10 border-indigo-500/25 text-indigo-400',
];

export function BankWidget({ canEdit = true }: { canEdit?: boolean }) {
  const { data: banks, addItem, deleteItem } = useTableSync<SimpleBank>({
    tableName: 'bankalar',
    storageKey: StorageKey.BANK_DATA,
    orderBy: 'name',
    orderAsc: true,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{name: string, type: 'banka'|'pos'}>({ name: '', type: 'banka' });

  const addBank = useCallback(async (name: string, type: 'banka' | 'pos') => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Ad boş olamaz'); return; }
    if (banks.find(b => b.name.toLowerCase() === trimmed.toLowerCase() && (b.type || 'banka') === type)) {
      toast.error('Bu kayıt zaten var');
      return;
    }
    
    const timestamp = Date.now();
    await addItem({
      id: `bank-${timestamp}`,
      name: trimmed,
      type: type
    });
    
    toast.success(`${trimmed} eklendi`);
    setForm({ name: '', type: 'banka' });
    setShowForm(false);
  }, [banks, addItem]);

  const removeBank = async (id: string, name: string) => {
    await deleteItem(id);
    toast.success(`${name} kaldırıldı`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 240, damping: 26 }}
      className="rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/8 p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center">
            <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-none">Banka ve POS Hesapları</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {banks.length > 0 ? `${banks.length} hesap • tahsilat işlemleri için` : 'Tahsilat işlemleri için banka veya pos ekleyin'}
            </p>
          </div>
        </div>
        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              showForm
                ? 'bg-white/10 text-foreground border border-white/15'
                : 'bg-blue-600/15 text-blue-400 border border-blue-500/25 hover:bg-blue-600/25'
            }`}
          >
            <motion.div animate={{ rotate: showForm ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-3.5 h-3.5" />
            </motion.div>
            <span className="hidden sm:inline">Hesap Ekle</span>
          </motion.button>
        )}
      </div>

      {/* Expand form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/30 border border-white/8 space-y-3">
              {/* Quick-pick chips */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Hızlı Seç</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BANKS.filter(n => !banks.find(b => b.name === n)).map(n => (
                    <button
                      key={n}
                      onClick={() => addBank(n, 'banka')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-blue-500/15 border border-white/8 hover:border-blue-500/30 text-[11px] sm:text-xs text-muted-foreground hover:text-blue-400 transition-all"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {/* Manual input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as 'banka'|'pos' }))}
                    className="w-24 sm:w-28 px-3 py-2 bg-black/40 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="banka">Banka</option>
                    <option value="pos">POS</option>
                  </select>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addBank(form.name, form.type)}
                    placeholder="Hesap adı..."
                    className="flex-1 px-3 py-2 bg-black/40 border border-border rounded-xl text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => addBank(form.name, form.type)}
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <Check className="w-4 h-4 text-foreground" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank cards */}
      {banks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-6 sm:py-8 gap-2 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
            <Building2 className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Henüz hesap eklenmedi</p>
          <p className="text-xs text-gray-600">Banka hesapları ve POS cihazları ekleyin</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <AnimatePresence mode="popLayout">
            {banks.map((bank, i) => {
              const colors = BANK_ACCENT_COLORS[i % BANK_ACCENT_COLORS.length];
              return (
                <motion.div
                  key={bank.id}
                  layout
                  initial={{ opacity: 0, scale: 0.88, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -6 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28, delay: i * 0.03 }}
                  className={`group relative flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br border ${colors} transition-all hover:shadow-lg`}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate leading-none">{bank.name}</p>
                      {bank.type === 'pos' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-current border border-white/10 font-bold uppercase tracking-wider">POS</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeBank(bank.id, bank.name)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center flex-shrink-0 transition-all border border-red-500/20"
                      title="Hesabı kaldır"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer hint */}
      {banks.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-gray-600 flex items-center justify-center gap-1.5"
        >
          <ChevronRight className="w-3 h-3" />
          Bu hesaplar tahsilat, satış ve ödeme formlarında seçilebilir
        </motion.p>
      )}
    </motion.div>
  );
}
