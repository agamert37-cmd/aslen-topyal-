import { jsPDF } from 'jspdf';
import { getFromStorage, StorageKey } from './storage';

const loadLogoBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

const C = {
  headerBar:    [40, 45, 60]   as [number, number, number],
  sectionAccent: [30, 64, 175] as [number, number, number],
  textDark:   [30, 35, 50]   as [number, number, number],
  labelColor: [120, 130, 150] as [number, number, number],
  tblHead:    [230, 235, 242] as [number, number, number],
  tblHeadTxt: [50, 60, 80]   as [number, number, number],
  tblBorder:  [210, 215, 225] as [number, number, number],
  tblAltRow:  [248, 250, 253] as [number, number, number],
};

const fmt = (num: number) => {
  return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const s = (str: any) => (str ? String(str).replace(/ı/g, 'i')
  .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C') : '');

export const generateFiyatListesiPDF = async (
  customerName: string,
  products: any[],
  markupPercentage: number,
  customTitle?: string
) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const M = 15;

  const setts = getFromStorage<any>(StorageKey.SYSTEM_SETTINGS) || {};
  const co = setts.companyInfo || { name: 'İşleyen Et', phone: '', address: '' };
  const now = new Date();

  let y = M;

  // Header
  doc.setFillColor(...C.headerBar);
  doc.rect(0, 0, pw, 25, 'F');

  // Logo
  let currentY = 18;
  if (co.logo) {
    const l64 = await loadLogoBase64(co.logo);
    if (l64) {
      doc.addImage(l64, 'PNG', M, 3, 20, 20, '', 'FAST');
    } else {
        doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text(s(co.name), M, currentY);
    }
  } else {
    doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text(s(co.name), M, currentY);
  }

  doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  const title = customTitle || `${customerName} OZEL FIYAT LISTESI`;
  doc.text(s(title).toUpperCase(), pw / 2, 16, { align: 'center' });
  
  doc.setFontSize(9); doc.setTextColor(200, 200, 220); doc.setFont('helvetica', 'normal');
  doc.text(`Tarih: ${now.toLocaleDateString('tr-TR')}`, pw - M, 16, { align: 'right' });

  y = 35;

  // Tablo
  doc.setFillColor(...C.tblHead);
  doc.rect(M, y, pw - 2*M, 8, 'F');
  doc.setDrawColor(...C.tblBorder);
  doc.line(M, y, pw - M, y);
  doc.line(M, y + 8, pw - M, y + 8);

  doc.setFontSize(9); doc.setTextColor(...C.tblHeadTxt); doc.setFont('helvetica', 'bold');
  const cx = [M + 2, M + 15, pw - M - 20];
  doc.text('NO', cx[0], y + 5.5);
  doc.text('URUN ADI', cx[1], y + 5.5);
  doc.text('FIYAT (TL)', cx[2], y + 5.5, { align: 'right' });

  y += 8;

  doc.setFont('helvetica', 'normal');
  let rowIdx = 0;

  for (const pr of products) {
    if (y > ph - 25) {
      doc.addPage();
      y = M;
      doc.setFillColor(...C.tblHead);
      doc.rect(M, y, pw - 2*M, 8, 'F');
      doc.setDrawColor(...C.tblBorder);
      doc.line(M, y, pw - M, y);
      doc.line(M, y + 8, pw - M, y + 8);
    
      doc.setFontSize(9); doc.setTextColor(...C.tblHeadTxt); doc.setFont('helvetica', 'bold');
      doc.text('NO', cx[0], y + 5.5);
      doc.text('URUN ADI', cx[1], y + 5.5);
      doc.text('FIYAT (TL)', cx[2], y + 5.5, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'normal');
    }

    if (rowIdx % 2 !== 0) {
      doc.setFillColor(...C.tblAltRow);
      doc.rect(M, y, pw - 2*M, 8, 'F');
    }

    doc.setTextColor(...C.textDark);
    
    // Fiyat hesabı: Ana fiyat (veya son alis fiyati vs.) * (1 + markupPercentage/100)
    // Şirket ayarlarına göre base price vs hesaplanır, componentten geçilecek basePrice.
    const priceWithMarkup = (pr._basePrice || 0) * (1 + markupPercentage / 100);

    doc.text(`${rowIdx + 1}`, cx[0], y + 5.5);
    doc.text(s(pr.name), cx[1], y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${fmt(priceWithMarkup)}`, cx[2], y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(...C.tblBorder);
    doc.line(M, y + 8, pw - M, y + 8);

    y += 8;
    rowIdx++;
  }

  // Footer  
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
    doc.text(`Sayfa ${pg} / ${totalPages}`, pw / 2, ph - 10, { align: 'center' });
    doc.text(s(co.name) + ' Müşteri Fiyat Listesi', M, ph - 10);
  }

  doc.save(`fiyat-listesi-${s(customerName).replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
};
