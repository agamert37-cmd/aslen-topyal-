/**
 * ChatGPT Powered AI Assistant
 * Gerçek ChatGPT API ile güçlendirilmiş akıllı asistan
 */

import OpenAI from 'openai';
import { getOpenAIKey } from './api-config';

// OpenAI Client - Safely initialize
let openai: OpenAI | null = null;
let lastUsedKey: string = '';

/**
 * OpenAI client'ı başlat veya yenile
 */
function initializeOpenAI() {
  try {
    const apiKey = getOpenAIKey();
    
    if (apiKey && apiKey !== 'YOUR_OPENAI_API_KEY_HERE' && apiKey.trim() !== '') {
      // Key değiştiyse yeniden oluştur
      if (apiKey !== lastUsedKey) {
        openai = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true,
        });
        lastUsedKey = apiKey;
      }
      return true;
    }
    openai = null;
    lastUsedKey = '';
  } catch (error) {
    console.warn('OpenAI initialization failed:', error);
  }
  return false;
}

// İlk başlatma
initializeOpenAI();

/**
 * OpenAI client'ı yeniden başlat (API key değiştiğinde)
 */
export function reinitializeOpenAI() {
  return initializeOpenAI();
}

export interface AIResponse {
  type: 'chart' | 'table' | 'stat' | 'text' | 'action';
  answer: string;
  data?: any;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  chartConfig?: any;
  sql?: string;
  actionData?: any;
  actionType?: 'satis' | 'alis' | 'gider' | 'cek' | 'tahsilat' | 'cari';
  actionSummary?: string;
}

/**
 * Özel rapor komutları (AI anahtarı olmadan veya doğrudan grafik istendiğinde çalışır)
 */
function handleSpecialReports(question: string): AIResponse | null {
  const q = question.toLowerCase();
  
  const getLS = (key: string) => {
    try {
      const data = localStorage.getItem('isleyen_et_' + key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  // Stok Grafiği
  if (q.includes('stok') && (q.includes('grafik') || q.includes('rapor'))) {
    const products = getLS('stok_data');
    if (!products || products.length === 0) {
      return { type: 'text', answer: 'Sistemde henüz stok verisi bulunmuyor.' };
    }
    const chartData = products.map((p: any) => ({
      name: p.name,
      value: p.currentStock || 0
    })).sort((a: any, b: any) => b.value - a.value).slice(0, 10);
    
    return {
      type: 'chart',
      answer: 'İşte stoklarınızın mevcut durumunu gösteren grafiksel rapor. En yüksek stoklu 10 ürün listelenmiştir.',
      data: chartData,
      chartType: 'bar',
      chartConfig: { xKey: 'name', yKey: 'value', color: '#10b981' }
    };
  }

  // Gider Grafiği
  if (q.includes('gider') && (q.includes('grafik') || q.includes('rapor') || q.includes('dağılım'))) {
    const kasa = getLS('kasa_data');
    const giderler = kasa.filter((k: any) => k.type === 'Gider');
    
    if (!giderler || giderler.length === 0) {
      return { type: 'text', answer: 'Sistemde henüz gider verisi bulunmuyor.' };
    }

    const categoryMap: Record<string, number> = {};
    giderler.forEach((g: any) => {
      categoryMap[g.category] = (categoryMap[g.category] || 0) + Number(g.amount);
    });

    const chartData = Object.keys(categoryMap).map(k => ({
      name: k,
      value: categoryMap[k]
    }));

    return {
      type: 'chart',
      answer: 'İşte kategori bazlı gider dağılımınızı gösteren grafiksel rapor.',
      data: chartData,
      chartType: 'pie',
      chartConfig: { nameKey: 'name', valueKey: 'value' }
    };
  }

  // Satış Grafiği
  if (q.includes('satış') && (q.includes('grafik') || q.includes('rapor') || q.includes('trend'))) {
    const fisler = getLS('fisler');
    const satislar = fisler.filter((f: any) => f.mode === 'satis');
    
    if (!satislar || satislar.length === 0) {
      return { type: 'text', answer: 'Sistemde henüz satış verisi bulunmuyor.' };
    }

    const dateMap: Record<string, number> = {};
    satislar.forEach((s: any) => {
      const d = s.date || 'Bilinmeyen';
      dateMap[d] = (dateMap[d] || 0) + Number(s.total);
    });

    const chartData = Object.keys(dateMap).map(k => ({
      date: k,
      value: dateMap[k]
    })).sort((a: any, b: any) => {
      let timeA = new Date(a.date).getTime();
      let timeB = new Date(b.date).getTime();
      if(isNaN(timeA)) {
         try { timeA = new Date(a.date.split('.').reverse().join('-')).getTime(); } catch(e) { timeA = 0; }
      }
      if(isNaN(timeB)) {
         try { timeB = new Date(b.date.split('.').reverse().join('-')).getTime(); } catch(e) { timeB = 0; }
      }
      return timeA - timeB;
    });

    return {
      type: 'chart',
      answer: 'İşte günlere göre satış trendinizi gösteren grafiksel rapor.',
      data: chartData,
      chartType: 'area',
      chartConfig: { xKey: 'date', yKey: 'value', color: '#3b82f6' }
    };
  }

  return null;
}

/**
 * ChatGPT ile konuş ve veri analizi yap
 */
export async function chatWithAI(userMessage: string, conversationHistory: any[] = []): Promise<AIResponse> {
  try {
    // Önce özel rapor mu diye kontrol et (API Key sormadan direkt lokalden getirir)
    const specialReport = handleSpecialReports(userMessage);
    if (specialReport) return specialReport;

    // Her çağrıda key'i yeniden kontrol et (kullanıcı sonradan girebilir)
    initializeOpenAI();

    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const getLS = (key: string) => {
      try {
        const data = localStorage.getItem('isleyen_et_' + key);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    };
    const getLSObj = (key: string, fallback: any = {}) => {
      try {
        const data = localStorage.getItem('isleyen_et_' + key);
        return data ? JSON.parse(data) : fallback;
      } catch { return fallback; }
    };

    // ─── Tüm sistem verilerini çek ──────────────────────────────
    const fisler        = getLS('fisler');
    const stok          = getLS('stok_data');
    const cari          = getLS('cari_data');
    const kasa          = getLS('kasa_data');
    const personel      = getLS('personel_data');
    const uretim        = getLS('uretim_data');
    const banka         = getLS('bank_data');
    const cekler        = getLS('cekler_data');
    const araclar       = getLS('arac_data');
    const settings      = getLSObj('system_settings', {});
    const stokCat       = getLS('stok_categories');
    const posData       = getLS('pos_data');

    // ─── Ön hesaplama: bugünkü ve haftalık özet ─────────────────
    const todayStr = new Date().toLocaleDateString('tr-TR');
    const todaySales   = fisler.filter((f: any) => f.mode === 'satis' && (f.date === todayStr || (f.date || '').startsWith(todayStr.split('.').reverse().join('-'))));
    const todayBuys    = fisler.filter((f: any) => f.mode === 'alis'  && (f.date === todayStr || (f.date || '').startsWith(todayStr.split('.').reverse().join('-'))));
    const todayRevenue = todaySales.reduce((s: number, f: any) => s + Number(f.total || 0), 0);
    const todayCost    = todayBuys.reduce((s: number, f: any) => s + Number(f.total || 0), 0);

    const criticalStok = stok.filter((s: any) => s.minStock != null && Number(s.currentStock || 0) <= Number(s.minStock));
    const totalStokVal = stok.reduce((s: number, p: any) => s + Number(p.currentStock || 0) * Number(p.purchasePrice || 0), 0);

    const kasaGelir  = kasa.filter((k: any) => k.type === 'Gelir').reduce((s: number, k: any) => s + Number(k.amount || 0), 0);
    const kasaGider  = kasa.filter((k: any) => k.type === 'Gider').reduce((s: number, k: any) => s + Number(k.amount || 0), 0);
    const kasaBakiye = kasaGelir - kasaGider;

    const bankaTopBakiye = banka.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);

    const topProducts = [...fisler.filter((f: any) => f.mode === 'satis')]
      .flatMap((f: any) => f.items || f.products || [])
      .reduce((acc: any, item: any) => {
        const key = item.name || item.productName || 'Bilinmeyen';
        acc[key] = (acc[key] || 0) + Number(item.total || item.amount || 0);
        return acc;
      }, {} as Record<string, number>);
    const topProductList = Object.entries(topProducts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total: Math.round(total as number) }));

    const companyInfo = settings?.companyInfo || {};

    // ─── Sistem promptu ─────────────────────────────────────────
    const systemPrompt = `Sen "İŞLEYEN ET" adlı et işletmesinin ERP sistem yapay zeka asistanısın. Kullanıcı (iş yeri sahibi veya personeli) ile doğrudan, sanki gerçek bir insanmışsın gibi, özellikle SESLİ komut asistanı edasıyla konuşuyorsun.

GÖREVLERİN (ÇOK ÖNEMLİ):
1. Raporlama ve Bilgi İsteme: Satışlar, cirolar, kasadaki para vb. sorulduğunda bilgiyi json ile ("chart", "stat" veya "text" type) ver.
2. İşlem/Veri Girişi (SATIŞ, ALIŞ, vb) YAPAMAZSIN. Eğer müşteri eksik bir işlem oluştur, şunu kaydet derse nazikçe: "Kusura bakmayın, sadece veri analizi ve raporlama yapabiliyorum. Fiş, fatura veya işlem kayıtlarını ilgili sayfalardan manuel yapmanız gerekiyor." şeklinde cevap ver.

CEVAP FORMATI HER ZAMAN AŞAĞIDAKİ GİBİ BİR JSON OLMALIDIR:
{
  "type": "text" | "chart",
  "answer": "Kullanıcıya vereceğin sözlü/yazılı samimi ve çözüm odaklı cevap",
  "data": [],
  "chartType": "bar"
}`;

    const messages: any[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    let aiResponse = "";
    
    const aiKeyOverride = localStorage.getItem('ops_center_gpt_override');
    const geminiSpecKey = localStorage.getItem('ops_gemini_key');
    const activeGeminiKey = (aiKeyOverride && aiKeyOverride.startsWith('AIza')) ? aiKeyOverride : geminiSpecKey;

    if (activeGeminiKey && activeGeminiKey.startsWith('AIza')) {
       // Gemini Doğrudan
       const { GoogleGenAI } = await import('@google/genai');
       const ai = new GoogleGenAI({ apiKey: activeGeminiKey });
       const formattedPrompt = `${systemPrompt}\n\nGeçmiş Sohbet:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
       const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: formattedPrompt,
          config: {
              temperature: 0.3
          }
       });
       aiResponse = res.text || "";
    } else if (openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3,
        max_tokens: 2000,
      });
      aiResponse = completion.choices[0]?.message?.content || '';
    } else {
       throw new Error('Geçerli bir yapay zeka API (OpenAI veya Gemini) anahtarı bulunamadı.');
    }

    if (!aiResponse) {
      throw new Error('ChatGPT cevap vermedi');
    }

    // JSON parse ve Auto-Heal (Otomatik Hata Giderme)
    let parsedResponse: any;
    try {
      let cleanJson = aiResponse;
      // Eğer ChatGPT markdown ile sardıysa veya ekstra metin koyduysa, sadece JSON kısmını yakala
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      
      // Auto-Heal: Sık rastlanan JSON format hatalarını otomatik onarma
      cleanJson = cleanJson
         .replace(/[\u201C\u201D]/g, '"') // Akıllı tırnakları düzelt
         .replace(/,\s*([}\]])/g, '$1');   // Array/Object sonundaki ekstra virgülleri kaldır (Trailing comma)

      parsedResponse = JSON.parse(cleanJson.trim());
    } catch (e: any) {
      console.warn("JSON Parse Failed for AI Response (Auto-healing failed):", aiResponse);
      // JSON parse edilemezse, sistem kendisi hatayı halledip kullanıcıya bunu açıklar
      return {
        type: 'text',
        answer: `Sistemsel bir veri çeviri hatasına rastladım ama müdahale ettim 😊 (Hata sebebi: ${e.message}). İsteğinin bazı kısımları teknik bir engele takıldı ama dediklerini anladım:\n\n${aiResponse.replace(/```json|```|{|}/gi, '')}\n\nLütfen ne yapmak istediğini kısaca tekrar teyit et, işlemi sorunsuzca halledelim.`,
      };
    }

    // AI geçerli bir chart veya stat data döndürdüyse ve data array değilse düzelt
    if (parsedResponse.type === 'chart' && (!parsedResponse.data || !Array.isArray(parsedResponse.data))) {
       parsedResponse.type = 'text'; // Fallback to text if malformed chart
    }

    return parsedResponse;
  } catch (error: any) {
    console.error('ChatGPT error:', error);
    
    // Fallback - basit pattern matching
    return fallbackResponse(userMessage);
  }
}

/**
 * Gemini Chat Call via Server Proxy
 */
export async function chatWithGemini(messages: any[], systemPrompt: string): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt })
  });
  if (!res.ok) {
    throw new Error('Gemini API request failed');
  }
  const data = await res.json();
  return data.answer;
}
function fallbackResponse(question: string): AIResponse {
  // Önce özel rapor var mı diye bak
  const specialReport = handleSpecialReports(question);
  if (specialReport) return specialReport;

  const q = question.toLowerCase();

  if (q.includes('satış') && (q.includes('bugün') || q.includes('bugun'))) {
    return {
      type: 'text',
      answer: '⚠️ ChatGPT API bağlantısı kurulamadı. Lütfen API key\'inizi kontrol edin.\n\nAPI key\'inizi .env.local dosyasına ekleyin:\nVITE_OPENAI_API_KEY=sk-...',
    };
  }

  return {
    type: 'text',
    answer: '⚠️ ChatGPT servisi şu anda kullanılamıyor.\n\nLütfen kontrol edin:\n' +
      '1. VITE_OPENAI_API_KEY .env.local dosyasında tanımlı mı?\n' +
      '2. API key geçerli mi?\n' +
      '3. İnternet bağlantınız var mı?\n\n' +
      'Yardım için: https://platform.openai.com/api-keys',
  };
}

/**
 * ChatGPT ile veri analizi yap
 */
export async function analyzeData(data: any[], question: string): Promise<string> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen bir veri analisti olarak bu verileri analiz et ve Türkçe özet ver.',
        },
        {
          role: 'user',
          content: `Soru: ${question}\n\nVeriler: ${JSON.stringify(data)}\n\nBu verileri analiz et ve özet çıkar.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || 'Analiz yapılamadı';
  } catch (error) {
    console.error('Data analysis error:', error);
    return 'Veri analizi yapılamadı.';
  }
}

/**
 * ChatGPT ile grafik önerisi al
 */
export async function suggestChart(data: any[], question: string): Promise<{
  chartType: 'bar' | 'line' | 'pie' | 'area';
  config: any;
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen bir veri görselleştirme uzmanısın. Veriye en uygun grafik türünü öner.',
        },
        {
          role: 'user',
          content: `Veri: ${JSON.stringify(data.slice(0, 5))}\n\nBu veri için en uygun grafik türü nedir? (bar, line, pie, area)\n\nJSON formatında cevap ver: {"chartType": "bar", "xKey": "name", "yKey": "value", "color": "#3b82f6"}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        chartType: parsed.chartType || 'bar',
        config: {
          xKey: parsed.xKey,
          yKey: parsed.yKey,
          color: parsed.color || '#3b82f6',
        },
      };
    }

    return {
      chartType: 'bar',
      config: { xKey: 'name', yKey: 'value', color: '#3b82f6' },
    };
  } catch (error) {
    console.error('Chart suggestion error:', error);
    return {
      chartType: 'bar',
      config: { xKey: 'name', yKey: 'value', color: '#3b82f6' },
    };
  }
}