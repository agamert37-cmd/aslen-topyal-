import React, { useState } from 'react';
import { Phone, CheckCircle2, Factory } from 'lucide-react';
import { toast } from 'sonner';
import { getDb } from '../lib/pouchdb';

export function PublicSitePage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) {
      toast.error('Lütfen isim ve iletişim numaranızı giriniz.');
      return;
    }

    try {
      const db = getDb('iletisim_talepleri');
      await db.put({
        _id: `talep_${Date.now()}`,
        name,
        phone,
        status: 'bekliyor',
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
      toast.success('Talebiniz alındı, en kısa sürede dönüş yapılacaktır.');
    } catch (e) {
      toast.error('Bir hata oluştu, lütfen tekrar deneyiniz.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Talebiniz Alındı!</h2>
          <p className="text-slate-600">
            İletişim bilgileriniz bize ulaştı. Operasyon ekibimiz en kısa sürede sizinle iletişime geçecektir.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="text-blue-600 font-medium hover:underline text-sm"
          >
            Yeni bir talep oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-blue-600">
            <Factory className="w-8 h-8" />
            <span className="text-xl font-black tracking-tight">İşleyen Et</span>
          </div>
          <a href="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Yönetim Girişi</a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
            Endüstriyel Et İşlemede Güvenilir Çözüm Ortağınız
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Yüksek üretim standartlarımız ve gelişmiş lojistik ağımızla firmanızın et ihtiyacını kesintisiz ve güvenli bir şekilde karşılıyoruz. Bize ulaşın, teklifimizi sunalım.
          </p>
          <div className="flex bg-blue-50 text-blue-700 py-4 px-6 rounded-2xl items-center gap-4 font-semibold w-fit">
            <Phone className="w-5 h-5 text-blue-500" />
            <span>0850 123 45 67</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md mx-auto w-full border border-slate-100">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Sizi Arayalım</h3>
          <p className="text-slate-500 mb-8 text-sm">İletişim bilgilerinizi bırakın, satış temsilcimiz hemen size ulaşsın.</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 text-left block">Adınız / Firma Adı</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn: Mert Şabap"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 text-left block">İletişim Numaranız</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Örn: 05XX XXX XX XX"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]">
              Beni Arayın
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
