# MERT OS — Web Sitesi ve KARARGAH (Masaüstü Uygulaması) Kurulum Kılavuzu

> Bu kılavuz projenin hem bir **Web Sitesi** hem de bir **Masaüstü (Electron) Operasyon Merkezi (KARARGAH)** olarak nasıl çalıştırılacağını açıklamaktadır.

---

## GENEL YAPI (Ne Yapacağız?)

Bu proje iki alanda çalışacak şekilde tasarlanmıştır:
1. **Web Sitesi**: İstemcilerin bağlandığı genel web arayüzü (Tarayıcıdan erişilir).
2. **KARARGAH (Masaüstü Operasyon Merkezi)**: Sistemin özel ayarlarına ve Telegram botu vb. hassas entegrasyonlarına eriştiğiniz, kendi bilgisayarınızda çalışan Windows / Masaüstü uygulamasıdır. İçinde barındırılan sistem istatistikleri ve yedekleme gibi yerel işlevler sunar.

`KARARGAH` uygulaması `KARARGAH` klasörü içinde yer almaktadır ve Electron tabanlıdır. Geliştirme ortamında web sitesi ile eşgüdümlü olarak port 8080 üzerinden çalışacak şekilde ayarlanmıştır.

---

## ADIM 1 — Node.js Kur

### İndir:
- [https://nodejs.org](https://nodejs.org) adresine git
- Büyük yeşil **"LTS"** butonuna tıkla ve indir
- Kurulum sihirbazını çalıştır, hep "Next" de

### Doğrula:
Terminali aç (Windows: `Win + R` → `cmd` → Enter):
```bash
node --version
npm --version
```
Her ikisi de bir sayı göstermeliydi. (Örnek: `v22.0.0` ve `10.9.0`)

---

## ADIM 2 — Projeyi İndir ve Kur

```bash
git clone https://github.com/agamert37-cmd/deneme222.git
cd deneme222
npm install
```

Bu komut tüm gerekli paketleri indirir.

---

## ADIM 3 — Çalıştırma Yöntemleri

### Yöntem A: Sadece Web Sitesi Olarak Çalıştırma

Projeyi sadece web tarayıcısında (standart site olarak) başlatmak isterseniz:

```bash
# Geliştirme modu - Tarayıcıda açılır
npm run dev

# Veya özel port ile yerel ağda çalıştırmak için (Port 8080)
npm run dev:local
```

### Yöntem B: KARARGAH Operasyon Merkezi (Masaüstü) Olarak Çalıştırma

Masaüstü Operasyon Merkezini (Electron aracılığıyla kendi özel penceresinde) başlatmak isterseniz. Bu komut hem siteyi arka planda 8080 portunda çalıştırır hem de KARARGAH masaüstü uygulamasını açar.

```bash
npm run electron:dev
```

> **Not:** Windows kullanıyorsanız `npm run electron:dev` komutu size özel çerçeveli (Pencereli) "KARARGAH Operasyon Merkezi" yazılımını başlatacaktır.

---

## ADIM 4 — Uygulamayı Üretime (Production) Hazırlama (.exe Çıktısı Alma)

Eğer KARARGAH uygulamasını bir `.exe` (Windows Kurulum Dosyası) haline getirip başka bilgisayarlarda internet gerektirmeden/sunucu başlatmasıyla uğraşmadan kurmak isterseniz:

```bash
npm run electron:build
```
Bu işlem bittiğinde projenin içindeki `dist-electron` klasöründe kurulum dosyalarınız (`.exe` vb.) oluşacaktır.

---

## TEKNİK NOTLAR

- **Port:** AI Studio önizleme ortamında port zorunlu olarak `3000`'dir. Ancak yerel bilgisayarınızda KARARGAH'ı başlattığınızda sistem `8080` portunu da çift yönlü destekleyecek şekilde ayarlanmıştır (`npm run dev:local`).
- **Elektron Dosyaları:** Uygulamanın tüm masaüstü komutları `KARARGAH/electron-main.cjs` içindedir. Telegram bildirimleri, yerel sunucu yedeği alma vb. hassas operasyonların kod blokları oradan yönetilebilir.
- **Veritabanı:** Supabase Cloud — zaten yapılandırılmış, ek ayar gerekmez. Cloudflare ile siteyi dışa açma rehberi için bir önceki dökümana bakabilirsiniz.
