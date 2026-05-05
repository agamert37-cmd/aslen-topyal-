import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, Warehouse, Plus, Trash2, X, Activity, User, ArrowRightLeft, LayoutGrid, List, Search, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useTableSync } from '../hooks/useTableSync';
import { getFromStorage, setInStorage } from '../utils/storage';
import { Product, productFromDb, productToDb, IcebergCage, StockMovement } from './StokPage';
import { useModuleBus } from '../hooks/useModuleBus';

function GlassCard({ children, className = '', hover = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={`rounded-2xl lg:rounded-3xl card-premium ${hover ? 'hover:border-cyan-500/30 transition-all duration-300' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function IcebergPage() {
  const { on, emit } = useModuleBus();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products, refresh: refreshProducts } = useTableSync<Product>({
    tableName: 'urunler',
    storageKey: 'stok_data',
    initialData: [],
    toDb: productToDb,
    fromDb: productFromDb,
  });

  const { addItem: addKasaSync } = useTableSync<any>({
    tableName: 'kasa_islemleri',
    storageKey: 'kasa_data',
  });

  useEffect(() => {
    const unsub = on('system:data_refreshed', () => {
      refreshProducts();
      setIcebergCages(getFromStorage<IcebergCage[]>('iceberg_cages_data') || []);
      setTransporters(getFromStorage<{id: string, name: string}[]>('transporters_data') || []);
    });
    return () => unsub();
  }, [refreshProducts]);

  const safeProducts = useMemo(() =>
    (products || []).filter(p => (p.name || '').trim().length > 0).map(p => {
      return {
        ...p,
        movements: Array.isArray(p.movements) ? p.movements : [],
      };
    }), [products]);

  const [icebergCages, setIcebergCages] = useState<IcebergCage[]>(() => 
    getFromStorage<IcebergCage[]>('iceberg_cages_data') || []
  );
  const [transporters, setTransporters] = useState<{id: string, name: string}[]>(() => 
    getFromStorage<{id: string, name: string}[]>('transporters_data') || []
  );

  const saveIcebergCages = (updated: IcebergCage[]) => {
    setIcebergCages(updated);
    setInStorage('iceberg_cages_data', updated);
    emit('system:data_refreshed', { source: 'IcebergPage' });
  };

  const saveTransporters = (updated: {id: string, name: string}[]) => {
    setTransporters(updated);
    setInStorage('transporters_data', updated);
    emit('system:data_refreshed', { source: 'IcebergPage' });
  };
  
  const [showAddCage, setShowAddCage] = useState(false);
  const [newCageName, setNewCageName] = useState('');
  const [newCageCapacity, setNewCageCapacity] = useState('');
  const [newCagePrice, setNewCagePrice] = useState('');
  const [newCageBillingDay, setNewCageBillingDay] = useState('1');
  const [newCageTare, setNewCageTare] = useState('');
  const [newCagePhoto, setNewCagePhoto] = useState('');

  const [showAddTransporter, setShowAddTransporter] = useState(false);
  const [newTransporterName, setNewTransporterName] = useState('');

  const [selectedCage, setSelectedCage] = useState<IcebergCage | null>(null);

  const handleAddCage = () => {
    if (newCageName.trim()) {
      saveIcebergCages([...icebergCages, { 
        id: crypto.randomUUID(), 
        name: newCageName, 
        capacityKg: newCageCapacity ? Number(newCageCapacity) : undefined,
        pricePerKg: newCagePrice ? Number(newCagePrice) : undefined,
        billingDay: newCageBillingDay ? Number(newCageBillingDay) : undefined,
        tareKg: newCageTare ? Number(newCageTare) : undefined,
        photoUrl: newCagePhoto || undefined,
      }]);
      setShowAddCage(false);
      setNewCageName('');
      setNewCageCapacity('');
      setNewCagePrice('');
      setNewCageBillingDay('1');
      setNewCageTare('');
      setNewCagePhoto('');
    }
  };

  const handleAddTransporter = () => {
    if (newTransporterName.trim()) {
      saveTransporters([...transporters, { id: crypto.randomUUID(), name: newTransporterName }]);
      setShowAddTransporter(false);
      setNewTransporterName('');
    }
  };

  const getCageHistory = (cageId: string) => {
    let history: { product: Product; movement: StockMovement }[] = [];
    safeProducts.forEach(product => {
      product.movements.forEach(m => {
        if ((m.cageId === cageId) || (m.targetCageId === cageId)) {
          history.push({ product, movement: m });
        }
      });
    });
    // Sort descending by date
    return history.sort((a, b) => new Date(b.movement.date).getTime() - new Date(a.movement.date).getTime());
  };

  const computeCageStorage = (cageId: string) => {
    let components: Record<string, { product: Product; quantity: number }> = {};
    safeProducts.forEach(product => {
      let qty = 0;
      product.movements.forEach(m => {
        const loc = m.location || 'Dukkan';
        const targetLoc = m.targetLocation || 'Dukkan';
        
        if (m.type === 'TRANSFER') {
          if (loc === 'Dukkan' && targetLoc === 'Iceberg' && m.targetCageId === cageId) qty += m.quantity;
          if (loc === 'Iceberg' && m.cageId === cageId && targetLoc === 'Dukkan') qty -= m.quantity;
          if (loc === 'Iceberg' && m.cageId === cageId && targetLoc === 'Iceberg' && m.targetCageId !== cageId) qty -= m.quantity;
          if (loc === 'Iceberg' && m.cageId !== cageId && targetLoc === 'Iceberg' && m.targetCageId === cageId) qty += m.quantity;
        } else if (loc === 'Iceberg' && m.cageId === cageId) {
          if (['ALIS', 'MUSTERI_IADE', 'URETIM_GIRIS', 'FATURA_ALIS', 'ONCEKI_BAKIYE'].includes(m.type)) qty += m.quantity;
          else if (['SATIS', 'TOPTANCI_IADE', 'FIRE', 'URETIM_CIKIS', 'FATURA_SATIS'].includes(m.type)) qty -= m.quantity;
          else if (m.type === 'FATURA_IPTAL') qty += m.quantity;
        }
      });
      if (qty > 0) {
        components[product.id] = { product, quantity: qty };
      }
    });
    return components;
  };

  const formatAmount = (val: number) => `₺${(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatStock = (val: number, unit: string) => {
    if (unit === 'KG') return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  const getUnitLabel = (unit: string) => {
    switch (unit) { case 'KG': return 'KG'; case 'Adet': return 'Adet'; case 'Koli': return 'Koli'; default: return unit; }
  };

  // Pre-compute components and totals for all cages
  const cageData = useMemo(() => {
    return icebergCages.map(cage => {
      const components = computeCageStorage(cage.id);
      const totalKg = Object.values(components).reduce((sum, c) => sum + (c.product.unit === 'KG' ? c.quantity : 0), 0);
      const totalCost = cage.pricePerKg ? (totalKg * cage.pricePerKg / 100) : 0;
      return { cage, components, totalKg, totalCost };
    });
  }, [icebergCages, safeProducts]);

  const globalStats = useMemo(() => {
    let totalKg = 0;
    let totalCost = 0;
    cageData.forEach(d => {
      totalKg += d.totalKg;
      totalCost += d.totalCost;
    });
    return { totalKg, totalCost, cageCount: cageData.length };
  }, [cageData]);

  const filteredCages = useMemo(() => {
    let active = cageData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      active = active.filter(d => 
        d.cage.name.toLowerCase().includes(q) || 
        Object.values(d.components).some(c => c.product.name.toLowerCase().includes(q))
      );
    }
    return active;
  }, [cageData, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            </div>
            Iceberg Soğuk Hava
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-xs sm:text-sm">
            Kafes bazında stok ve kira maliyet takibi. Ürün gönderimleri ve girişleri "Stok Yönetimi" sekmesi üzerinden gerçekleştirilir.
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <GlassCard className="p-4 border border-border bg-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Package className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Tanımlı Kafes</h3>
          </div>
          <p className="text-2xl font-black text-foreground">{globalStats.cageCount}</p>
        </GlassCard>
        
        <GlassCard className="p-4 border border-border bg-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Mevcut Stok (KG)</h3>
          </div>
          <p className="text-2xl font-black text-foreground">{formatStock(globalStats.totalKg, 'KG')}</p>
        </GlassCard>

        <GlassCard className="p-4 border border-border bg-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Günlük Maliyet</h3>
          </div>
          <p className="text-2xl font-black text-foreground">{formatAmount(globalStats.totalCost)}</p>
        </GlassCard>

        <GlassCard className="p-4 border border-border bg-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Truck className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Nakliyeci</h3>
          </div>
          <p className="text-2xl font-black text-foreground">{transporters.length}</p>
        </GlassCard>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Kafes veya ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAddCage(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Yeni Kafes
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCages.map(({ cage, components, totalKg, totalCost }) => {
              return (
                <GlassCard 
                  key={cage.id} 
                  hover={true}
                  onClick={() => setSelectedCage(cage)}
                  className="p-4 border border-cyan-500/20 group cursor-pointer flex flex-col h-full bg-secondary/20"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Warehouse className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-cyan-300 transition-colors">{cage.name}</h3>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {cage.capacityKg && <p className="text-[10px] text-muted-foreground">Kapasite: {cage.capacityKg} KG</p>}
                          {cage.billingDay && <p className="text-[10px] text-cyan-500/80">Hesap Kesim: Her ayın {cage.billingDay}. günü</p>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Kafesi silmek istediğinize emin misiniz? (Mevcut stokları Dükkana veya başka kafese transfer ettiğinizden emin olun)')) {
                          saveIcebergCages(icebergCages.filter(c => c.id !== cage.id));
                        }
                      }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-md transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                  
                  <div className="flex-1 space-y-2 mb-4">
                    {Object.keys(components).length > 0 ? Object.values(components).map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 bg-white/5 rounded-lg border border-border hover:bg-white/10 transition-colors">
                        <span className="text-muted-foreground truncate pr-2">{c.product.name}</span>
                        <span className="font-bold text-foreground whitespace-nowrap">{formatStock(c.quantity, c.product.unit)} {getUnitLabel(c.product.unit)}</span>
                      </div>
                    )) : (
                      <div className="text-center p-6 text-xs text-muted-foreground italic bg-black/10 rounded-xl">Kafes içerisinde stok bulunmuyor</div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3 bg-black/30 -mx-4 -mb-4 p-4 rounded-b-[1.25rem]">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Toplam Ağırlık</p>
                        <p className="text-sm font-black text-cyan-400">{formatStock(totalKg, 'KG')} KG</p>
                      </div>
                      {cage.pricePerKg ? (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Günlük Maliyet ({cage.pricePerKg} kr/kg)</p>
                          <p className="text-sm font-black text-emerald-400">{formatAmount(totalCost)}</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Günlük Maliyet</p>
                          <p className="text-xs text-muted-foreground">Belirtilmedi</p>
                        </div>
                      )}
                    </div>
                    {cage.pricePerKg && totalCost > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Bu kafes için günlük depolama kirasını ( ${formatAmount(totalCost)} ) giderlere eklemek istiyor musunuz?`)) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            addKasaSync({
                              id: `kasa-iceberg-${cage.id}-${Date.now()}`,
                              type: 'Gider',
                              category: 'Depolama Kirası',
                              description: `Iceberg - ${cage.name} Günlük Kira (${todayStr})`,
                              amount: totalCost,
                              date: new Date().toLocaleDateString('tr-TR'),
                              time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                            });
                            toast.success('Günlük kira gideri başarıyla eklendi.');
                          }
                        }}
                        className="w-full mt-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 transition-colors"
                      >
                        Günlük Kirayı Giderlere Ekle
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
            {filteredCages.length === 0 && (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-12 bg-white/5 rounded-3xl border border-border border-dashed">
                <Warehouse className="w-10 h-10 text-cyan-400/50 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Buralar biraz ıssız sanki.</p>
                <p className="text-sm text-muted-foreground mt-1">Arama kriterlerine uygun kafes bulunamadı veya henüz kafes tanımlanmamış.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
             <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-white/5 border border-white/10 rounded-xl">
                <div className="col-span-4 sm:col-span-3">Kafes Adı</div>
                <div className="col-span-4 sm:col-span-3 text-right">Toplam Miktar (KG)</div>
                <div className="col-span-4 lg:col-span-3 hidden sm:block text-right">Günlük Maliyet</div>
                <div className="lg:col-span-3 hidden lg:block text-right">Kapasite</div>
             </div>
             {filteredCages.map(({ cage, components, totalKg, totalCost }) => (
                <div 
                  key={cage.id} 
                  onClick={() => setSelectedCage(cage)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-black/20 hover:bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-xl cursor-pointer transition-all relative group"
                >
                  <div className="col-span-8 sm:col-span-4 lg:col-span-3 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors border border-cyan-500/10 group-hover:border-cyan-500/30">
                       <Warehouse className="w-5 h-5 text-cyan-400" />
                     </div>
                     <div>
                       <h3 className="font-bold text-sm text-foreground">{cage.name}</h3>
                       {Object.keys(components).length > 0 ? (
                         <p className="text-[10px] text-muted-foreground hidden sm:block truncate mt-0.5 max-w-[200px]">
                           {Object.keys(components).length} farklı ürün
                         </p>
                       ) : (
                         <p className="text-[10px] text-red-400/80 hidden sm:block truncate mt-0.5 max-w-[200px]">Boş</p>
                       )}
                     </div>
                  </div>
                  <div className="col-span-4 sm:col-span-4 lg:col-span-3 text-right flex flex-col items-end justify-center">
                    <span className="font-black text-cyan-400">{formatStock(totalKg, 'KG')}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">KG</span>
                  </div>
                  <div className="col-span-4 lg:col-span-3 hidden sm:flex flex-col items-end justify-center text-right">
                     {cage.pricePerKg ? (
                        <>
                           <span className="font-bold text-emerald-400">{formatAmount(totalCost)}</span>
                           <span className="text-[10px] text-muted-foreground uppercase">{cage.pricePerKg} kr/kg</span>
                        </>
                     ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                     )}
                  </div>
                  <div className="lg:col-span-3 hidden lg:flex flex-col items-end justify-center text-right">
                     {cage.capacityKg ? (
                        <>
                           <span className="text-sm font-semibold">{formatStock(cage.capacityKg, 'KG')}</span>
                           <div className="w-24 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${totalKg > cage.capacityKg ? 'bg-red-500' : 'bg-cyan-500'}`} 
                                style={{ width: `${Math.min(100, Math.max(0, (totalKg / cage.capacityKg) * 100))}%` }} 
                              />
                           </div>
                        </>
                     ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                     )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm('Kafesi silmek istediğinize emin misiniz? (Mevcut stokları Dükkana veya başka kafese transfer ettiğinizden emin olun)')) {
                        saveIcebergCages(icebergCages.filter(c => c.id !== cage.id));
                      }
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
             ))}
             {filteredCages.length === 0 && (
               <div className="text-center py-12 bg-white/5 rounded-2xl border border-border">
                  <p className="text-muted-foreground">Kafes bulunamadı.</p>
               </div>
             )}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" /> Tanımlı Nakliyeciler
            </h3>
            <button
              onClick={() => setShowAddTransporter(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-bold rounded-lg transition-colors border border-border"
            >
              <Plus className="w-3 h-3" /> Ekle
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {transporters.map(t => (
              <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs group">
                <span className="text-indigo-200">{t.name}</span>
                <button 
                  onClick={() => saveTransporters(transporters.filter(tr => tr.id !== t.id))}
                  className="p-0.5 hover:bg-red-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
            {transporters.length === 0 && (
              <span className="text-xs text-muted-foreground">Kayıtlı nakliyeci bulunmuyor.</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Cage Detail Modal */}
      <AnimatePresence>
        {selectedCage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedCage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0f1c] rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border bg-gradient-to-r from-cyan-900/30 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Warehouse className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">{selectedCage.name}</h3>
                    <p className="text-[10px] text-cyan-200/50 uppercase tracking-widest font-bold">Kafes İçeriği ve Geçmişi</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCage(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {(selectedCage.photoUrl || selectedCage.tareKg != null || selectedCage.capacityKg != null) && (
                <div className="p-4 border-b border-border bg-black/20 flex flex-col sm:flex-row gap-4 items-start">
                  {selectedCage.photoUrl && (
                    <img src={selectedCage.photoUrl} alt="Kafes" className="w-24 h-24 object-cover rounded-xl border border-border" />
                  )}
                  <div className="flex-1 space-y-2">
                    {selectedCage.tareKg != null && (
                      <p className="text-xs text-muted-foreground"><span className="font-bold text-muted-foreground">Dara (KG):</span> {selectedCage.tareKg} kg <span className="text-[10px] text-muted-foreground ml-1">(Sadece bilgi amaçlıdır)</span></p>
                    )}
                    {selectedCage.capacityKg != null && (
                      <p className="text-xs text-muted-foreground"><span className="font-bold text-muted-foreground">Kapasite:</span> {selectedCage.capacityKg} kg</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                {(() => {
                  const history = getCageHistory(selectedCage.id);
                  if (history.length === 0) {
                     return (
                       <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                         <Activity className="w-10 h-10 mb-3 opacity-20" />
                         <p>Bu kafeste henüz bir hareket bulunmuyor.</p>
                       </div>
                     )
                  }
                  return (
                    <div className="divide-y divide-white/5">
                      {history.map((h, i) => {
                         const m = h.movement;
                         const isIntoCage = 
                           (m.targetCageId === selectedCage.id) || 
                           (m.cageId === selectedCage.id && ['ALIS', 'MUSTERI_IADE', 'URETIM_GIRIS', 'FATURA_ALIS', 'ONCEKI_BAKIYE'].includes(m.type));
                         const isOutOfCage = !isIntoCage;
                         
                         return (
                           <div key={i} className={`p-4 flex flex-col gap-2 hover:bg-white/[0.02] transition-colors ${isIntoCage ? 'border-l-2 border-l-emerald-500/50' : 'border-l-2 border-l-rose-500/50'}`}>
                             <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  {isIntoCage ? <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> : <ArrowRightLeft className="w-4 h-4 text-rose-400" />}
                                  <span className="font-bold text-gray-200 text-sm">{m.type}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(m.date).toLocaleString('tr-TR')}</span>
                               </div>
                               <div className={`font-black text-sm whitespace-nowrap ${isIntoCage ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {isIntoCage ? '+' : '-'}{formatStock(m.quantity, h.product.unit)} <span className="text-xs uppercase">{getUnitLabel(h.product.unit)}</span>
                               </div>
                             </div>
                             
                             <div className="flex justify-between items-end mt-1">
                               <div className="flex flex-col gap-1">
                                  <span className="text-sm text-cyan-300 font-medium">{h.product.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>
                                      {m.partyName || 'Bilinmiyor'} 
                                      {m.transporter ? ` (Nakliye: ${m.transporter})` : ''}
                                    </span>
                                  </div>
                               </div>
                               {m.description && (
                                 <p className="text-[10px] bg-white/5 px-2 py-1 rounded text-muted-foreground max-w-[200px] truncate" title={m.description}>{m.description}</p>
                               )}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Cage Modal */}
      {showAddCage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl border border-border w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Yeni Kafes Ekle</h3>
              <button onClick={() => setShowAddCage(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Kafes Kodu / Adı</label>
                <input
                  type="text"
                  placeholder="Örn: KFS-01"
                  value={newCageName}
                  onChange={(e) => setNewCageName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Kapasite (KG) - İsteğe bağlı</label>
                <input
                  type="number"
                  placeholder="Örn: 2000"
                  value={newCageCapacity}
                  onChange={(e) => setNewCageCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Kira Maliyeti (Kuruş/KG) - İsteğe bağlı</label>
                <input
                  type="number"
                  placeholder="Örn: 15"
                  value={newCagePrice}
                  onChange={(e) => setNewCagePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Hesap Kesim Günü (1-31)</label>
                <input
                  type="number"
                  placeholder="Örn: 1"
                  min="1" max="31"
                  value={newCageBillingDay}
                  onChange={(e) => setNewCageBillingDay(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Dara (KG) - Yalnızca Bilgi</label>
                <input
                  type="number"
                  placeholder="Örn: 650"
                  value={newCageTare}
                  onChange={(e) => setNewCageTare(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Fotoğraf URL (İsteğe bağlı)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newCagePhoto}
                  onChange={(e) => setNewCagePhoto(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-black/20 flex justify-end gap-2">
              <button onClick={() => setShowAddCage(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">İptal</button>
              <button 
                onClick={handleAddCage}
                disabled={!newCageName.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-foreground text-sm font-bold rounded-lg transition-colors"
              >
                Kafesi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transporter Modal */}
      {showAddTransporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl border border-border w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Yeni Nakliyeci Ekle</h3>
              <button onClick={() => setShowAddTransporter(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4">
              <label className="block text-xs font-bold text-muted-foreground mb-1">Nakliyeci Adı</label>
              <input
                type="text"
                value={newTransporterName}
                onChange={(e) => setNewTransporterName(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-indigo-500/50"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-border bg-black/20 flex justify-end gap-2">
              <button onClick={() => setShowAddTransporter(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">İptal</button>
              <button 
                onClick={handleAddTransporter}
                disabled={!newTransporterName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-foreground text-sm font-bold rounded-lg transition-colors"
              >
                Nakliyeci Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
