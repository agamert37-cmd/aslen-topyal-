// ─── Termal Yazıcı Fiş Baskısı ────────────────────────────────────────────────
// 80mm (POS / termal) yazıcı için tarayıcı print dialog üzerinden çalışır.
// Kullanım: thermalPrint(fis, companyInfo)
// Müşteriye verilecek fiş formatı — sadece önemli bilgiler.

import type { CompanyInfo } from '../pages/SettingsPage';

// ─── Yardımcı ──────────────────────────────────────────────────────────────────
const line = (char = '-', len = 32) => char.repeat(len);

const pad = (left: string, right: string, total = 32): string => {
  const leftStr = String(left).substring(0, total - String(right).length - 1);
  const spaces = total - leftStr.length - String(right).length;
  return leftStr + ' '.repeat(Math.max(spaces, 1)) + String(right);
};

const fmtMoney = (val: number) =>
  val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

const fmtDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

const center = (text: string, width = 32) => {
  const t = text.substring(0, width);
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return ' '.repeat(pad) + t;
};

// ─── Fiş Tipi Etiketi ─────────────────────────────────────────────────────────
const getModeLabel = (mode: string) => {
  if (mode === 'satis' || mode === 'sale') return 'SATIŞ FİŞİ';
  if (mode === 'alis') return 'ALIŞ FİŞİ';
  return 'GİDER FİŞİ';
};

// ─── Ödeme Yöntemi Türkçe ──────────────────────────────────────────────────────
const getPaymentLabel = (method: string) => {
  const map: Record<string, string> = {
    nakit: 'Nakit',
    pos: 'Kredi Kartı (POS)',
    havale: 'Havale / EFT',
    cek: 'Çek',
    veresiye: 'Veresiye',
  };
  return map[method] || method || '-';
};

// ─── Ana HTML Oluşturucu ───────────────────────────────────────────────────────
function buildReceiptHtml(fis: any, company: CompanyInfo): string {
  const isSatis = fis.mode === 'satis' || fis.mode === 'sale';
  const isAlis = fis.mode === 'alis';
  const isGider = !isSatis && !isAlis;
  const modeLabel = getModeLabel(fis.mode);

  const items: any[] = fis.items || [];
  const total: number = fis.total || fis.amount || 0;
  const paid: number = fis.payment?.amount || 0;
  const remaining = total - paid;

  // Satır HTML'leri
  const rows: string[] = [];

  if (items.length > 0) {
    rows.push(`<tr class="section-header"><td colspan="4">ÜRÜNLER</td></tr>`);
    items.forEach(item => {
      const isIade = item.type === 'iade';
      const qty = Math.abs(item.quantity || 0);
      const price = item.unitPrice || item.price || 0;
      const itemTotal = Math.abs(item.totalPrice || item.total || qty * price);
      const name = (item.name || item.productName || 'Bilinmeyen').substring(0, 20);
      rows.push(`
        <tr class="${isIade ? 'iade-row' : ''}">
          <td colspan="2" class="item-name">${isIade ? '↩ ' : ''}${name}</td>
          <td class="qty">${qty} ${item.unit || 'AD'}</td>
          <td class="money">${fmtMoney(itemTotal)}</td>
        </tr>
        <tr class="sub-row">
          <td colspan="2" class="unit-price">  @${fmtMoney(price)}</td>
          <td colspan="2"></td>
        </tr>
      `);
    });
    rows.push(`<tr class="divider"><td colspan="4"><hr/></td></tr>`);
  } else if (isGider && fis.category) {
    rows.push(`<tr class="section-header"><td colspan="4">AÇIKLAMA</td></tr>`);
    rows.push(`<tr><td colspan="4" class="item-name">${fis.category}${fis.description ? ': ' + fis.description : ''}</td></tr>`);
    rows.push(`<tr class="divider"><td colspan="4"><hr/></td></tr>`);
  }

  // Tutar satırları
  rows.push(`<tr class="total-row"><td colspan="3"><b>TOPLAM</b></td><td class="money"><b>${fmtMoney(total)}</b></td></tr>`);

  if (fis.payment) {
    rows.push(`<tr><td colspan="3">Ödeme: ${getPaymentLabel(fis.payment.method)}</td><td class="money">${fmtMoney(paid)}</td></tr>`);
    if (remaining > 0.01) {
      rows.push(`<tr class="balance-row"><td colspan="3"><b>BAKİYE (KALAN)</b></td><td class="money"><b>${fmtMoney(remaining)}</b></td></tr>`);
    } else if (remaining < -0.01) {
      rows.push(`<tr><td colspan="3">Para Üstü</td><td class="money">${fmtMoney(Math.abs(remaining))}</td></tr>`);
    }
    if (fis.payment.bankName) {
      rows.push(`<tr class="bank-row"><td colspan="4">Banka: ${fis.payment.bankName}</td></tr>`);
    }
  }

  // Cari bakiye (varsa) — önceki + bu işlem + yeni bakiye
  if (!isGider && fis.cari?.id && fis.cari?.balance !== undefined) {
    const currentBalance: number = fis.cari.balance;         // Bu işlem sonrası bakiye
    const fisEffect = total - paid;                           // Bu işlemin bakiyeye etkisi (+borç)
    const prevBalance = currentBalance - fisEffect;           // Bu işlem öncesi bakiye

    rows.push(`<tr class="divider"><td colspan="4"><hr/></td></tr>`);
    rows.push(`<tr class="section-header"><td colspan="4">CARİ BAKİYE</td></tr>`);

    // Önceki bakiye (eğer sıfırdan farklıysa)
    if (Math.abs(prevBalance) > 0.01) {
      rows.push(`<tr class="cari-balance"><td colspan="3">Önceki Bakiye</td><td class="money ${prevBalance > 0 ? 'debt' : 'credit'}">${fmtMoney(Math.abs(prevBalance))} ${prevBalance > 0 ? '(Borç)' : '(Alacak)'}</td></tr>`);
    }

    // Bu işlemin etkisi
    if (Math.abs(fisEffect) > 0.01) {
      rows.push(`<tr class="cari-balance"><td colspan="3">${isSatis ? 'Bu Satış' : 'Bu Alış'}${paid > 0 ? ' - Ödeme' : ''}</td><td class="money ${fisEffect > 0 ? 'debt' : 'credit'}">${fisEffect > 0 ? '+' : '-'}${fmtMoney(Math.abs(fisEffect))}</td></tr>`);
    }

    // Yeni (güncel) bakiye — her zaman göster
    rows.push(`<tr class="total-row cari-new-balance"><td colspan="3"><b>Güncel Bakiye</b></td><td class="money ${currentBalance > 0.01 ? 'debt' : currentBalance < -0.01 ? 'credit' : ''}"><b>${currentBalance > 0.01 ? fmtMoney(currentBalance) + ' (Borç)' : currentBalance < -0.01 ? fmtMoney(Math.abs(currentBalance)) + ' (Alacak)' : 'Hesap Kapalı'}</b></td></tr>`);
  }

  const fisNo = fis.fisNo || fis.id?.substring(0, 8)?.toUpperCase() || '-';
  const cariName = fis.cari?.companyName || fis.cari?.contactPerson || '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fiş - ${fisNo}</title>
<style>
  /* ── Termal kağıt: 80mm genişlik, sonsuz uzunluk ── */
  @page {
    size: 80mm auto;
    margin: 4mm 3mm;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
    width: 72mm;
    max-width: 72mm;
  }

  .header {
    text-align: center;
    padding: 4px 0 2px;
    border-bottom: 1px dashed #000;
    margin-bottom: 6px;
  }
  .header .company-name {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .header .company-sub {
    font-size: 9px;
    margin-top: 1px;
    color: #333;
  }

  .fis-info {
    margin-bottom: 5px;
  }
  .fis-info table { width: 100%; border-collapse: collapse; }
  .fis-info td { font-size: 10px; padding: 1px 0; }
  .fis-info .label { color: #555; width: 45%; }
  .fis-info .value { font-weight: bold; }

  .mode-label {
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid #000;
    padding: 3px;
    margin: 5px 0;
    letter-spacing: 1px;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .items-table td {
    font-size: 10px;
    padding: 1.5px 1px;
    vertical-align: top;
  }
  .items-table .item-name { font-weight: bold; max-width: 120px; word-break: break-word; }
  .items-table .qty { text-align: center; white-space: nowrap; }
  .items-table .money { text-align: right; white-space: nowrap; font-weight: bold; }
  .items-table .unit-price { font-size: 9px; color: #555; }
  .items-table .section-header td {
    font-size: 9px; text-transform: uppercase; color: #555;
    border-bottom: 1px solid #ccc; padding-top: 3px;
  }
  .items-table .divider td { padding: 2px 0; }
  .items-table .divider hr { border: none; border-top: 1px dashed #000; }
  .items-table .total-row td { font-size: 12px; padding-top: 3px; border-top: 1px solid #000; }
  .items-table .balance-row td { color: #c00; font-size: 11px; }
  .items-table .cari-balance td { font-size: 10px; }
  .items-table .iade-row td { color: #777; }
  .items-table .bank-row td { font-size: 9px; color: #555; }
  .items-table .debt { color: #c00; }
  .items-table .credit { color: #060; }
  .items-table .sub-row td { font-size: 9px; }
  .items-table .cari-new-balance td { border-top: 1px solid #000; padding-top: 3px; font-size: 11px; }
  .items-table .section-header td { font-size: 9px; text-transform: uppercase; color: #555; border-bottom: 1px solid #ccc; padding-top: 4px; }

  .footer {
    text-align: center;
    font-size: 9px;
    color: #555;
    border-top: 1px dashed #000;
    margin-top: 8px;
    padding-top: 5px;
  }
  .footer .thanks {
    font-size: 11px;
    font-weight: bold;
    color: #000;
    margin-bottom: 2px;
  }

  /* Tarayıcı print düğmelerini gizle */
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }

  .logo-container {
    text-align: center;
    margin-bottom: 5px;
  }
  .logo-container img {
    max-width: 60mm;
    max-height: 40mm;
    object-fit: contain;
  }
</style>
</head>
<body>

<!-- ── Logo ── -->
${company.logo ? `<div class="logo-container"><img src="${company.logo}" alt="Logo" /></div>` : ''}

<!-- ── Başlık ── -->
<div class="header">
  <div class="company-name">${company.companyName}</div>
  ${company.phone ? `<div class="company-sub">Tel: ${company.phone}</div>` : ''}
  ${company.address ? `<div class="company-sub">${company.address.substring(0, 40)}</div>` : ''}
  ${company.taxNumber ? `<div class="company-sub">V.No: ${company.taxNumber} (${company.taxOffice || ''})</div>` : ''}
</div>

<!-- ── Fiş Tipi ── -->
<div class="mode-label">${modeLabel}</div>

<!-- ── Fiş Bilgileri ── -->
<div class="fis-info">
  <table>
    <tr>
      <td class="label">Fiş No</td>
      <td class="value">#${fisNo}</td>
    </tr>
    <tr>
      <td class="label">Tarih</td>
      <td class="value">${fmtDate(fis.date)}</td>
    </tr>
    ${cariName ? `<tr>
      <td class="label">${isSatis ? 'Müşteri' : isAlis ? 'Tedarikçi' : 'İlgili'}</td>
      <td class="value">${cariName.substring(0, 22)}</td>
    </tr>` : ''}
    ${fis.employeeName ? `<tr>
      <td class="label">Personel</td>
      <td class="value">${fis.employeeName}</td>
    </tr>` : ''}
  </table>
</div>

<!-- ── Kalem listesi + Tutarlar ── -->
<table class="items-table">
  ${rows.join('\n')}
</table>

<!-- ── Alt Bilgi ── -->
<div class="footer">
  <div class="thanks">Teşekkür ederiz!</div>
  ${company.slogan ? `<div>${company.slogan}</div>` : ''}
  <div style="margin-top:4px; font-size:8px;">
    Bu fiş ${new Date().toLocaleDateString('tr-TR')} tarihinde düzenlenmiştir.
  </div>
</div>

</body>
</html>`;
}

// ─── Txt Çıktı Oluşturucu (Mobil Paylaşım İçin) ──────────────────────────────────
function buildReceiptText(fis: any, company: CompanyInfo): string {
  const isSatis = fis.mode === 'satis' || fis.mode === 'sale';
  const isAlis = fis.mode === 'alis';
  const isGider = !isSatis && !isAlis;
  const modeLabel = getModeLabel(fis.mode);

  let text = '';
  text += center(company.companyName || 'İŞLEYEN ET', 32) + '\n';
  if (company.phone) text += center('Tel: ' + company.phone, 32) + '\n';
  text += line('-', 32) + '\n';
  text += center(modeLabel, 32) + '\n';
  text += line('-', 32) + '\n';
  
  const fisNo = fis.fisNo || fis.id?.substring(0, 8)?.toUpperCase() || '-';
  text += pad('Fis No:', '#' + fisNo, 32) + '\n';
  text += pad('Tarih:', fmtDate(fis.date), 32) + '\n';
  
  const cariName = fis.cari?.companyName || fis.cari?.contactPerson || '';
  if (cariName) {
    const role = isSatis ? 'Musteri:' : isAlis ? 'Tedarikci:' : 'Ilgili:';
    text += pad(role, cariName.substring(0, 20), 32) + '\n';
  }
  text += line('-', 32) + '\n';

  // Items
  const items: any[] = fis.items || [];
  const total: number = fis.total || fis.amount || 0;
  const paid: number = fis.payment?.amount || 0;
  
  if (items.length > 0) {
    items.forEach(item => {
      const isIade = item.type === 'iade';
      const qty = Math.abs(item.quantity || 0);
      const price = item.unitPrice || item.price || 0;
      const itemTotal = Math.abs(item.totalPrice || item.total || qty * price);
      const name = (isIade ? 'IADE ' : '') + (item.name || item.productName || 'Bilinmeyen');
      
      text += name.substring(0, 32) + '\n';
      const detailStr = `${qty}${item.unit || 'AD'} x ${fmtMoney(price)}`;
      text += pad(detailStr, fmtMoney(itemTotal), 32) + '\n';
    });
    text += line('-', 32) + '\n';
  } else if (isGider && fis.category) {
    text += fis.category + (fis.description ? ': ' + fis.description : '') + '\n';
    text += line('-', 32) + '\n';
  }

  text += pad('TOPLAM:', fmtMoney(total), 32) + '\n';
  if (fis.payment) {
    text += pad(`ODENEN (${getPaymentLabel(fis.payment.method)}):`, fmtMoney(paid), 32) + '\n';
  }
  
  if (!isGider && fis.cari?.id && fis.cari?.balance !== undefined) {
    text += line('-', 32) + '\n';
    const currentBalance = fis.cari.balance;
    const debtOrCredit = currentBalance > 0.01 ? '(B)' : currentBalance < -0.01 ? '(A)' : '';
    text += pad('GUNCEL BAKIYE:', fmtMoney(Math.abs(currentBalance)) + ' ' + debtOrCredit, 32) + '\n';
  }
  
  text += line('-', 32) + '\n';
  text += center('Tesekkur ederiz!', 32) + '\n';
  if (company.slogan) text += center(company.slogan.substring(0,32), 32) + '\n';

  return text;
}

// ─── Dışa Aktarılan Ana Fonksiyon ─────────────────────────────────────────────
export function thermalPrint(fis: any, company: CompanyInfo): void {
  const html = buildReceiptHtml(fis, company);
  const plainText = buildReceiptText(fis, company);

  // 1. Overlay Container (Mobil Dostu)
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '999999';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'flex-start';
  overlay.style.padding = '20px 10px 100px';
  overlay.style.overflowY = 'auto';
  overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  // 2. Receipt Preview Box
  const previewBox = document.createElement('div');
  previewBox.style.backgroundColor = '#fdfdfd';
  previewBox.style.padding = '10px';
  previewBox.style.borderRadius = '8px';
  previewBox.style.width = '100%';
  previewBox.style.maxWidth = '380px';
  previewBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
  previewBox.style.transform = 'translateY(20px)';
  previewBox.style.opacity = '0';
  previewBox.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Iframe for exact thermal rendering isolation
  const previewIframe = document.createElement('iframe');
  previewIframe.style.width = '100%';
  previewIframe.style.height = '600px'; // Initial
  previewIframe.style.border = 'none';
  previewIframe.style.overflow = 'hidden'; 
  
  previewBox.appendChild(previewIframe);
  overlay.appendChild(previewBox);

  // 3. Actions Container (Ekran Altına Sabit)
  const actionContainer = document.createElement('div');
  actionContainer.style.position = 'fixed';
  actionContainer.style.bottom = '0';
  actionContainer.style.left = '0';
  actionContainer.style.right = '0';
  actionContainer.style.padding = '15px';
  actionContainer.style.background = 'linear-gradient(to top, rgba(0,0,0,0.95) 75%, transparent)';
  actionContainer.style.display = 'flex';
  actionContainer.style.gap = '10px';
  actionContainer.style.justifyContent = 'center';
  actionContainer.style.alignItems = 'center';
  actionContainer.style.zIndex = '10';

  // Yazdır Button
  const printBtn = document.createElement('button');
  printBtn.innerHTML = `<svg style="width:18px;height:18px;margin-right:6px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Yazdır`;
  Object.assign(printBtn.style, {
    flex: '1', maxWidth: '160px', padding: '14px 10px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)', background: '#ea580c', color: 'white', fontSize: '15px', fontWeight: 'bold', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
  });

  // Paylaş / Kopyala Button
  const shareBtn = document.createElement('button');
  shareBtn.innerHTML = `<svg style="width:18px;height:18px;margin-right:6px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> Paylaş`;
  Object.assign(shareBtn.style, {
    flex: '1', maxWidth: '160px', padding: '14px 10px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)', background: '#2563eb', color: 'white', fontSize: '15px', fontWeight: 'bold', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
  });

  // Kapat Button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  Object.assign(closeBtn.style, {
    width: '46px', height: '46px', padding: '0', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '18px', fontWeight: 'bold', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  });

  actionContainer.appendChild(printBtn);
  if ('share' in navigator || 'clipboard' in navigator) { actionContainer.appendChild(shareBtn); }
  actionContainer.appendChild(closeBtn);
  overlay.appendChild(actionContainer);

  document.body.appendChild(overlay);

  // Write content to isolated iframe
  const doc = previewIframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html.replace('</head>', '<style>body{margin:0 auto;}</style></head>'));
    doc.close();
    // Auto adjust iframe height after render
    previewIframe.onload = () => {
      const body = previewIframe.contentWindow?.document.body;
      if (body) { previewIframe.style.height = (body.scrollHeight + 50) + 'px'; }
    };
  }

  // Animasyonla ekranda belirme
  requestAnimationFrame(() => {
    previewBox.style.transform = 'translateY(0)';
    previewBox.style.opacity = '1';
  });

  // Olaylar
  const close = () => {
    previewBox.style.transform = 'translateY(20px)';
    previewBox.style.opacity = '0';
    setTimeout(() => document.body.removeChild(overlay), 300);
  };
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.onclick = close;

  printBtn.onclick = () => {
    // Görünmez iframe ile direk yazdır
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const pDoc = printIframe.contentWindow?.document;
    if (pDoc) {
      pDoc.open();
      pDoc.write(html);
      pDoc.close();
      printIframe.onload = () => {
        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          // Biraz sonra temizle
          setTimeout(() => {
            if(document.body.contains(printIframe)) document.body.removeChild(printIframe);
          }, 3000);
        }, 200);
      };
    }
  };

  shareBtn.onclick = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Satış Fişi',
          text: plainText
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(plainText);
        alert('Fiş metni panoya kopyalandı! (Whatsapp vs ile yapıştırıp gönderebilirsiniz)');
      }
    } catch (err) {
      console.log('Paylaşım iptal edildi veya hata:', err);
    }
  };
}
