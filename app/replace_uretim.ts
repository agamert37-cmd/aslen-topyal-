import fs from 'fs';

let content = fs.readFileSync('app/pages/UretimPage.tsx', 'utf8');

// replace useState bindings
content = content.replace(`  // Cari verisi — toptancı TR kodunu otomatik doldurmak için
  const cariList = useMemo(() => {
    try {
      return getFromStorage<any[]>(StorageKey.CARI_DATA) || [];
    } catch { return []; }
  }, []);`, `  // Cari verisi — toptancı TR kodunu otomatik doldurmak için
  const rawCariList = useGlobalTableData<any>('cari_hesaplar');
  const cariList = useMemo(() => Array.isArray(rawCariList) ? rawCariList : [], [rawCariList]);`);

// replace stok logic
content = content.replace(`  // Stok verisi - her yeni üretim başlatıldığında taze oku (isimsizleri temizle & normalize et)
  const [stokList, setStokList] = useState<any[]>([]);
  const refreshStok = () => {
    const raw = getFromStorage<any[]>(StorageKey.STOK_DATA) || [];
    // İsimsiz (boş isimli) stok ürünlerini temizle & movements/fiyat normalize et
    const cleaned = raw
      .filter(s => (s.name || '').trim().length > 0)
      .map(s => {
        // movements doğrudan array olabilir veya supplier_entries içinden parse edilmesi gerekebilir
        let movements = Array.isArray(s.movements) ? s.movements : [];
        let category = s.category || 'Genel';
        // Eğer movements boşsa ama supplier_entries varsa → parse et (KV'den gelen format)
        if (movements.length === 0 && s.supplier_entries) {
          try {
            const parsed = typeof s.supplier_entries === 'string'
              ? JSON.parse(s.supplier_entries)
              : s.supplier_entries;
            if (Array.isArray(parsed)) {
              movements = parsed.map((entry: any) => ({
                id: entry.id || uuidv4(),
                type: 'ALIS',
                partyName: entry.supplierName || 'Bilinmeyen',
                date: entry.date || new Date().toISOString(),
                quantity: entry.quantity || 0,
                price: entry.buyPrice || 0,
                totalAmount: entry.totalAmount || 0,
              }));
            } else if (parsed && Array.isArray(parsed.movements)) {
              movements = parsed.movements;
              category = parsed.category || category;
            }
          } catch {}
        }
        return {
          ...s,
          movements,
          category,
          currentStock: s.currentStock ?? s.current_stock ?? s.stock ?? 0,
          sellPrice: s.sellPrice ?? s.sell_price ?? s.price ?? 0,
        };
      });
    if (cleaned.length !== raw.length) {
      setInStorage(StorageKey.STOK_DATA, cleaned);
    }
    setStokList(cleaned);
  };`, `  // Stok verisi - Global Context'ten proaktif
  const rawStok = useGlobalTableData<any>('urunler') || [];
  const stokList = useMemo(() => {
    return rawStok
      .filter(s => (s.name || '').trim().length > 0)
      .map(s => {
        let movements = Array.isArray(s.movements) ? s.movements : [];
        let category = s.category || 'Genel';
        if (movements.length === 0 && s.supplier_entries) {
          try {
            const parsed = typeof s.supplier_entries === 'string'
              ? JSON.parse(s.supplier_entries)
              : s.supplier_entries;
            if (Array.isArray(parsed)) {
              movements = parsed.map((entry: any) => ({
                id: entry.id || uuidv4(),
                type: 'ALIS',
                partyName: entry.supplierName || 'Bilinmeyen',
                date: entry.date || new Date().toISOString(),
                quantity: entry.quantity || 0,
                price: entry.buyPrice || 0,
                totalAmount: entry.totalAmount || 0,
              }));
            } else if (parsed && Array.isArray(parsed.movements)) {
              movements = parsed.movements;
              category = parsed.category || category;
            }
          } catch {}
        }
        return {
          ...s,
          movements,
          category,
          currentStock: s.currentStock ?? s.current_stock ?? s.stock ?? 0,
          sellPrice: s.sellPrice ?? s.sell_price ?? s.price ?? 0,
        };
      });
  }, [rawStok]);`);

content = content.replace(/refreshStok\(\);\n/g, '');
content = content.replace(/refreshStok\(\); /g, '');
content = content.replace(/; refreshStok\(\)/g, '');

content = `import { useGlobalTableData } from '../contexts/GlobalTableSyncContext';\n` + content;

fs.writeFileSync('app/pages/UretimPage.tsx', content);
console.log('replaced');
