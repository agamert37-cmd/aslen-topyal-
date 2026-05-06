import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, Warehouse, Plus, Trash2, X, Activity, User, ArrowRightLeft, LayoutGrid, List, Search, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useTableSync } from '../hooks/useTableSync';
import { getFromStorage, setInStorage } from '../utils/storage';
import { Product, productFromDb, productToDb, IcebergCage, StockMovement } from './StokPage';
import { useModuleBus } from '../hooks/useModuleBus';
import { v4 as uuidv4 } from 'uuid';

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
    initialData: []
  });

  useEffect(() => {
    const unsub = on('system:data_refreshed', () => {
      refreshProducts();
    });
    return () => unsub();
  }, [refreshProducts, on]);

  const safeProducts = useMemo(() =>
    (products || []).filter(p => (p?.name || '').trim().length > 0).map(p => {
      return {
        ...p,
        movements: Array.isArray(p.movements) ? p.movements : [],
      };
    }), [products]);

  const { data: icebergCagesData, addItem: addCageItem, deleteItem: removeCageItem } = useTableSync<IcebergCage>({
    tableName: 'iceberg_cages',
    storageKey: 'iceberg_cages_data',
    initialData: [],
  });
  
  const icebergCages = useMemo(() => Array.isArray(icebergCagesData) ? icebergCagesData : [], [icebergCagesData]);

  const { data: transportersData, addItem: addTransporterItem, deleteItem: removeTransporterItem } = useTableSync<{id: string, name: string}>({
    tableName: 'transporters',
    storageKey: 'transporters_data',
    initialData: [],
  });
  
  const transporters = useMemo(() => Array.isArray(transportersData) ? transportersData : [], [transportersData]);
  
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

  const generateId = () => {
    try {
      if (crypto && crypto.randomUUID) return uuidv4();
    } catch(e) {}
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  };

  const handleAddCage = () => {
    if (newCageName.trim()) {
      addCageItem({ 
        id: generateId(), 
        name: newCageName, 
        capacityKg: newCageCapacity ? Number(newCageCapacity) : undefined,
        pricePerKg: newCagePrice ? Number(newCagePrice) : undefined,
        billingDay: newCageBillingDay ? Number(newCageBillingDay) : undefined,
        tareKg: newCageTare ? Number(newCageTare) : undefined,
        photoUrl: newCagePhoto || undefined,
      });
      setShowAddCage(false);
      setNewCageName('');
      setNewCageCapacity('');
      setNewCagePrice('');
      setNewCageBillingDay('1');
      setNewCageTare('');
      setNewCagePhoto('');
      toast.success("Kafes başarıyla oluşturuldu.");
    }
  };

  const handleAddTransporter = () => {
    if (newTransporterName.trim()) {
      addTransporterItem({ id: generateId(), name: newTransporterName });
      setShowAddTransporter(false);
      setNewTransporterName('');
      toast.success("Nakliyeci başarıyla eklendi.");
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

  const handleBulkAddCosts = () => {
    const total = globalStats.totalCost;
    if (total <= 0) {
      toast.info('Şu anda eklenecek bir depo kira gideri bulunmuyor.');
      return;
    }
    
    if (confirm(`Tüm kafesler için bugünkü toplam depolama kirasını ( ${formatAmount(total)} ) kasaya gider olarak eklemek istiyor musunuz?`)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date().toLocaleDateString('tr-TR');

      cageData.forEach(d => {
        if (d.cage.pricePerKg && d.totalCost > 0) {
           addKasaSync({
             id: `kasa-iceberg-${d.cage.id}-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
             type: 'Gider',
             category: 'Depolama Kirası',
             description: `Iceberg - ${d.cage.name} Günlük Kira (${todayStr})`,
             amount: d.totalCost,
             date: dateStr,
             time: timeStr
           });
        }
      });
      toast.success('Tüm depo kiraları başarıyla kasaya işlendi.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }} 
      animate={{ opacity: 1, filter: 'blur(0px)' }} 
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.div 
          initial={{ x: -20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            </div>
            Iceberg Soğuk Hava
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-xs sm:text-sm">
            Kafes bazında stok ve kira maliyet takibi. Ürün gönderim/giriş işlemleri "Stok Yönetimi" üzerinden yapılır.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ x: 20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <button
            onClick={handleBulkAddCosts}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-rose-500/25 active:scale-95 whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4" /> 
            Kiraları Gidere İşle
          </button>
        </motion.div>
      </div>

      {/* Overview Stats */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <div className="card-premium h-full p-4 flex flex-col gap-2 rounded-2xl w-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 text-cyan-400 relative z-10">
              <Package className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Tanımlı Kafes</h3>
            </div>
            <p className="text-2xl font-black text-foreground relative z-10">{globalStats.cageCount}</p>
          </div>
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <div className="card-premium h-full p-4 flex flex-col gap-2 rounded-2xl w-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 text-emerald-400 relative z-10">
              <Activity className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Mevcut Stok (KG)</h3>
            </div>
            <p className="text-2xl font-black text-foreground relative z-10">{formatStock(globalStats.totalKg, 'KG')}</p>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <div className="card-premium h-full p-4 flex flex-col gap-2 rounded-2xl w-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 text-rose-400 relative z-10">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Günlük Maliyet</h3>
            </div>
            <p className="text-2xl font-black text-foreground relative z-10">{formatAmount(globalStats.totalCost)}</p>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <div className="card-premium h-full p-4 flex flex-col gap-2 rounded-2xl w-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 text-indigo-400 relative z-10">
              <Truck className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Nakliyeci</h3>
            </div>
            <p className="text-2xl font-black text-foreground relative z-10">{transporters.length}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Toolbar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-md backdrop-blur-md"
      >
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Kafes veya ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-foreground placeholder:text-muted-foreground shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-black/40 shadow-inner rounded-xl p-1 border border-white/5">
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)] active:scale-95"
          >
            <Plus className="w-4 h-4" /> Yeni Kafes
          </button>
        </div>
      </motion.div>

      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {viewMode === 'grid' ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
            {filteredCages.map(({ cage, components, totalKg, totalCost }) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15, transition: { duration: 0.2 } }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 30 } }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                key={cage.id}
                onClick={() => setSelectedCage(cage)}
                className="card-premium rounded-2xl p-4 sm:p-5 flex flex-col h-full cursor-pointer hover:border-cyan-500/40 relative overflow-hidden group shadow-lg hover:shadow-[0_8px_30px_rgba(0,255,255,0.08)] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-shrink-0 items-center justify-center shadow-inner">
                      <Warehouse className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-cyan-300 transition-colors text-sm sm:text-base">{cage.name}</h3>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {cage.capacityKg && <p className="text-[10px] text-muted-foreground whitespace-nowrap">Kapasite: {cage.capacityKg} KG</p>}
                        {cage.billingDay && <p className="text-[10px] text-cyan-400/80 whitespace-nowrap">Hesap Kesimi: {cage.billingDay}. gün</p>}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`"${cage.name}" kafesini silmek istediğinize emin misiniz?\nUyarı: Mevcut stokları transfer ettiğinizden emin olun.`)) {
                        removeCageItem(cage.id);
                        toast.success("Kafes başarıyla silindi");
                      }
                    }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Kafesi Sil"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
                
                <div className="flex-1 space-y-2 mb-4 relative z-10">
                  {Object.keys(components).length > 0 ? Object.values(components).map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <span className="text-muted-foreground truncate pr-2">{c.product.name}</span>
                      <span className="font-black text-gray-200 whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-md">{formatStock(c.quantity, c.product.unit)} <span className="text-[10px] text-muted-foreground font-normal">{getUnitLabel(c.product.unit)}</span></span>
                    </div>
                  )) : (
                    <div className="h-full min-h-[60px] flex items-center justify-center text-xs text-muted-foreground italic bg-black/20 rounded-xl border border-white/5 border-dashed">
                      İçerisi boş...
                    </div>
                  )}
                </div>
                
                <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3 relative z-10">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Toplam Stok</p>
                      <p className="text-sm font-black text-cyan-400">{formatStock(totalKg, 'KG')} KG</p>
                    </div>
                    {cage.pricePerKg ? (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Maliyet ({cage.pricePerKg} kr)</p>
                        <p className="text-sm font-black text-emerald-400">{formatAmount(totalCost)}</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Günlük Kira</p>
                        <p className="text-xs text-muted-foreground italic truncate max-w-[80px]">Belirtilmedi</p>
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
                          toast.success('Kira başarıyla giderlere eklendi.');
                        }
                      }}
                      className="w-full mt-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                      Kirayı Giderlere Ekle
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
            {filteredCages.length === 0 && (
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-1 sm:col-span-2 xl:col-span-3 text-center py-16 card-premium rounded-3xl border border-dashed flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 inner-glow">
                  <Warehouse className="w-8 h-8 text-cyan-400/50" />
                </div>
                <p className="text-foreground font-bold text-lg mb-1">Buralar oldukça ıssız.</p>
                <p className="text-sm text-muted-foreground">Kafes bulunamadı veya aramanızla eşleşmedi.</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
             <div className="grid grid-cols-2 gap-4 px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-black/40 border border-white/10 rounded-xl shadow-inner">
                <div>Kafes Adı</div>
                <div className="text-right pr-12">Güncel Miktar</div>
             </div>
             <AnimatePresence mode="popLayout">
             {filteredCages.map(({ cage, components, totalKg, totalCost }) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                  key={cage.id} 
                  onClick={() => setSelectedCage(cage)}
                  className="card-premium grid grid-cols-2 gap-4 px-4 sm:px-6 py-4 items-center rounded-xl cursor-pointer hover:border-cyan-500/40 hover:bg-white/5 transition-all relative group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors border border-cyan-500/10 group-hover:border-cyan-500/30">
                       <Warehouse className="w-5 h-5 text-cyan-400" />
                     </div>
                     <div>
                       <h3 className="font-bold text-sm text-foreground">{cage.name}</h3>
                     </div>
                  </div>
                  <div className="text-right pr-12 sm:pr-14 flex items-center justify-end">
                    <span className="font-black text-cyan-400 text-base sm:text-lg">{formatStock(totalKg, 'KG')} <span className="text-[10px] text-muted-foreground uppercase">KG</span></span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm('Kafesi silmek istediğinize emin misiniz?')) {
                        removeCageItem(cage.id);
                        toast.success("Kafes silindi");
                      }
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
             ))}
             </AnimatePresence>
             {filteredCages.length === 0 && (
               <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12 card-premium rounded-2xl border border-dashed">
                  <p className="text-muted-foreground font-medium">Kayıt bulunmuyor.</p>
               </motion.div>
             )}
          </motion.div>
        )}

        <div className="mt-10 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" /> Tanımlı Nakliyeciler
            </h3>
            <button
              onClick={() => setShowAddTransporter(true)}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Nakliyeci Ekle
            </button>
          </div>
          <motion.div layout className="flex flex-wrap gap-2 sm:gap-3">
            <AnimatePresence>
            {transporters.map(t => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                key={t.id} 
                className="flex items-center gap-2 px-3 sm:px-4 py-2 card-premium rounded-xl text-sm group hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-foreground font-medium">{t.name}</span>
                <button 
                  onClick={() => {
                      if(confirm(`"${t.name}" adlı nakliyeciyi silmek istediğinize emin misiniz?`)) {
                          removeTransporterItem(t.id);
                      }
                  }}
                  className="p-1 hover:bg-red-500/20 rounded-md opacity-0 group-hover:opacity-100 transition-all sm:ml-2"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </motion.div>
            ))}
            </AnimatePresence>
            {transporters.length === 0 && (
              <span className="text-xs text-muted-foreground py-2 italic opacity-60">Kayıtlı nakliyeci bulunmuyor. Eklemek için sağ üstteki butonu kullanın.</span>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Cage Detail Modal */}
      <AnimatePresence>
        {selectedCage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedCage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0a0f1c] rounded-3xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-cyan-900/30 to-transparent flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 shadow-inner">
                    <Warehouse className="w-5 h-5 md:w-6 md:h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground leading-tight tracking-tight">{selectedCage.name}</h3>
                    <p className="text-[10px] sm:text-xs text-cyan-400/60 uppercase tracking-widest font-bold mt-0.5">Kafes İçeriği ve Geçmişi</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCage(null)} className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-muted-foreground transition-all">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              
              {(selectedCage.photoUrl || selectedCage.tareKg != null || selectedCage.capacityKg != null) && (
                <div className="p-4 sm:p-5 border-b border-white/5 bg-black/40 flex flex-col sm:flex-row gap-4 items-start sm:items-center shrink-0 shadow-inner">
                  {selectedCage.photoUrl && (
                    <img src={selectedCage.photoUrl} alt="Kafes" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-white/10 shadow-md" />
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                    {selectedCage.tareKg != null && (
                      <div className="bg-white/5 p-2 sm:p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Dara (Bilgi)</span>
                        <span className="text-sm font-black text-foreground">{selectedCage.tareKg} KG</span>
                      </div>
                    )}
                    {selectedCage.capacityKg != null && (
                      <div className="bg-white/5 p-2 sm:p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Max Kapasite</span>
                        <span className="text-sm font-black text-foreground">{selectedCage.capacityKg} KG</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#0a0f1c]/50">
                {(() => {
                  const history = getCageHistory(selectedCage.id);
                  if (history.length === 0) {
                     return (
                       <div className="p-12 sm:p-20 text-center text-muted-foreground flex flex-col items-center justify-center h-full min-h-[250px]">
                         <Activity className="w-12 h-12 mb-4 opacity-20" />
                         <p className="font-medium text-lg text-foreground mb-1">Hareket Yok</p>
                         <p className="text-sm">Bu kafeste henüz ürün girişi veya çıkışı olmamış.</p>
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
                         
                         return (
                           <div key={i} className={`p-4 sm:p-5 flex flex-col gap-2 hover:bg-white/[0.03] transition-colors ${isIntoCage ? 'border-l-4 border-l-emerald-500/50' : 'border-l-4 border-l-rose-500/50'}`}>
                             <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2.5">
                                  <div className={`p-1.5 rounded-lg ${isIntoCage ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    {isIntoCage ? <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> : <ArrowRightLeft className="w-4 h-4 text-rose-400" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-200 text-sm sm:text-base leading-none">{m.type.replace(/_/g, ' ')}</span>
                                    <span className="text-[10px] mt-1 font-mono text-muted-foreground">{new Date(m.date).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                               </div>
                               <div className={`font-black text-sm sm:text-base whitespace-nowrap bg-black/20 px-2 py-1 rounded-lg border border-white/5 ${isIntoCage ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {isIntoCage ? '+' : '-'}{formatStock(m.quantity, h.product.unit)} <span className="text-[10px] uppercase font-normal">{getUnitLabel(h.product.unit)}</span>
                               </div>
                             </div>
                             
                             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-2 sm:mt-1 gap-2 pt-2 border-t border-white/5">
                               <div className="flex flex-col gap-1">
                                  <span className="text-sm font-bold text-cyan-400">{h.product.name}</span>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User className="w-3.5 h-3.5 opacity-70" />
                                    <span>
                                      {m.partyName || 'Bilinmiyor'} 
                                      {m.transporter ? <span className="text-amber-400/80 ml-1">({m.transporter})</span> : ''}
                                    </span>
                                  </div>
                               </div>
                               {m.description && (
                                 <p className="text-[10px] bg-white/5 px-2.5 py-1.5 rounded-md text-gray-300 max-w-full sm:max-w-[250px] italic border border-white/5" title={m.description}>&quot;{m.description}&quot;</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card-premium rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-white/10 ring-1 ring-white/5">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Yeni Kafes Ekle</h3>
              <button onClick={() => setShowAddCage(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Kafes Kodu / Adı <span className="text-cyan-400">*</span></label>
                <input
                  type="text"
                  placeholder="Örn: KFS-01"
                  value={newCageName}
                  onChange={(e) => setNewCageName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Kapasite (KG)</label>
                <input
                  type="number"
                  placeholder="Hesaplama amaçlı (Opsiyonel)"
                  value={newCageCapacity}
                  onChange={(e) => setNewCageCapacity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Kira / KG (Kuruş)</label>
                  <input
                    type="number"
                    placeholder="Örn: 15"
                    value={newCagePrice}
                    onChange={(e) => setNewCagePrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Hesap Günü (1-31)</label>
                  <input
                    type="number"
                    placeholder="Örn: 1"
                    min="1" max="31"
                    value={newCageBillingDay}
                    onChange={(e) => setNewCageBillingDay(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Dara (KG)</label>
                <input
                  type="number"
                  placeholder="Bilgi amaçlı boş kafes ağırlığı"
                  value={newCageTare}
                  onChange={(e) => setNewCageTare(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowAddCage(false)} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all">İptal</button>
              <button 
                onClick={handleAddCage}
                disabled={!newCageName.trim()}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(8,145,178,0.3)] hover:shadow-[0_6px_20px_rgba(8,145,178,0.4)] disabled:shadow-none"
              >
                Kafesi Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transporter Modal */}
      {showAddTransporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card-premium rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col border border-white/10 ring-1 ring-white/5">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Yeni Nakliyeci</h3>
              <button onClick={() => setShowAddTransporter(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Nakliyeci Adı <span className="text-indigo-400">*</span></label>
                 <input
                   type="text"
                   placeholder="Örn: Ahmet Lojistik"
                   value={newTransporterName}
                   onChange={(e) => setNewTransporterName(e.target.value)}
                   className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                   autoFocus
                 />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3">
              <button onClick={() => setShowAddTransporter(false)} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all">İptal</button>
              <button 
                onClick={handleAddTransporter}
                disabled={!newTransporterName.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] disabled:shadow-none"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
