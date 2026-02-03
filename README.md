# Kutsal Map (Kutsal Harita)

İslami kutsal mekanları interaktif harita üzerinde keşfetmek için geliştirilmiş modern web uygulaması. Mekke ve Medine'deki tarihi ve dini açıdan önemli yerleri, şehitlikleri ve kutsal mekanları detaylı bilgiler, görseller, videolar ve ses kayıtlarıyla birlikte sunar.

## Özellikler

- **İnteraktif Harita**: Leaflet.js ile güçlendirilmiş harita deneyimi
  - Uydu ve karanlık mod harita görünümleri
  - Kutsal mekanları gösteren marker'lar
  - Detaylı popup kartları

- **Zengin Medya İçeriği**:
  - Yüksek kaliteli görsel galeri
  - YouTube video entegrasyonu (carousel desteği)
  - Ses kayıtları ve anlatımlar
  - Her konum için detaylı açıklamalar

- **Navigasyon Desteği**:
  - Google Maps yol tarifi
  - Yandex Navigasyon entegrasyonu
  - Kullanıcı konumu tespiti

- **Gelişmiş Arama**:
  - Mekan adı ile arama
  - OSM Nominatim API ile global arama (admin panel)
  - Gerçek zamanlı filtreleme

- **Admin Paneli**:
  - Yeni konum ekleme
  - Mevcut konumları düzenleme
  - Konum silme
  - CRUD işlemleri

- **Responsive Tasarım**:
  - Mobil ve masaüstü uyumlu
  - Modern glass morphism UI
  - Smooth animasyonlar

## Teknoloji Stack

### Frontend
- HTML5, CSS3 (Glass Morphism, Flexbox)
- JavaScript (Vanilla, ES6+)
- Leaflet.js v1.9.4 (Harita kütüphanesi)
- Font Awesome v6.4.0 (İkonlar)
- Google Fonts (Inter)

### Backend
- PHP 8.2
- RESTful API
- JSON dosya tabanlı veri depolama

### DevOps
- Docker & Docker Compose
- Apache Web Server
- Node.js & NPM (Development)

## Kurulum

### Docker ile Kurulum (Önerilen)

```bash
# Projeyi klonlayın
git clone https://github.com/yourusername/kutsalmap.git
cd kutsalmap

# Docker container'ı başlatın
docker-compose up

# Tarayıcıda açın
# http://localhost:8080
```

### NPM ile Development

```bash
# Bağımlılıkları yükleyin
npm install

# Development server'ı başlatın
npm start

# Tarayıcıda açın
# http://localhost:3000
```

### Manuel Kurulum

```bash
# PHP 8.2+ ve Apache kurulu olmalı

# Projeyi web server dizinine kopyalayın
cp -r kutsalmap /var/www/html/

# Apache'yi başlatın
sudo systemctl start apache2

# Tarayıcıda açın
# http://localhost/kutsalmap
```

## Kullanım

### Kullanıcı Arayüzü
1. **Ana Sayfa** (`index.html`): Konumları görüntüleme ve keşfetme
2. Harita üzerindeki marker'lara tıklayarak detayları görün
3. Arama çubuğunu kullanarak mekan bulun
4. "Konumumu Bul" butonu ile kendi konumunuzu tespit edin
5. Navigasyon butonları ile yol tarifi alın

### Admin Paneli
1. **Admin Sayfası** (`admin.html`): Konum yönetimi
2. Haritaya tıklayarak yeni konum ekleyin
3. Marker'lara tıklayarak düzenleyin veya silin
4. Form alanlarını doldurun (başlık, açıklama, medya URL'leri)

## API Dokümantasyonu

### Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api.php` | Tüm konumları getir |
| `POST` | `/api.php` | Yeni konum ekle |
| `PUT` | `/api.php` | Konum güncelle |
| `DELETE` | `/api.php?id={id}` | Konum sil |

### Veri Modeli

```json
{
  "id": "1",
  "lat": 21.42250476,
  "lng": 39.82617974,
  "title": "Kâbe-i Muazzama",
  "description": "Müslümanların kıblesi...",
  "video_url": "https://www.youtube.com/watch?v=...",
  "audio_url": "https://example.com/audio.mp3",
  "image_url": "https://example.com/image.jpg",
  "created_at": "2026-01-22 19:30:00"
}
```

## Mevcut Konumlar

Uygulama şu anda 20 kutsal mekanı içermektedir:

- Kâbe-i Muazzama
- Mescid-i Nebevî
- Nur Dağı (Hira Mağarası)
- Sevr Mağarası
- Arafat (Cebel-i Rahme)
- Kuba Mescidi
- Uhud Dağı ve Şehitliği
- Mescid-i Kıbleteyn
- Cennetü'l-Baki
- Mina (Jamarat)
- Müzdelife
- Mescid-i Şecere
- Yedi Mescitler (Hendek)
- Bedir Şehitliği
- Mescid-i Âişe (Ten'im)
- Gamame Mescidi
- Safa ve Merve Tepeleri
- Şübeyke Mezarlığı
- Peygamberimizin Doğduğu Ev
- Hz Hatice Annemizin Kabri

## Proje Yapısı

```
kutsalmap/
├── index.html          # Ana sayfa (ziyaretçi görünümü)
├── admin.html          # Admin paneli
├── script.js           # Ana sayfa JavaScript
├── admin.js            # Admin paneli JavaScript
├── api.php             # Backend API
├── style.css           # Stil dosyası
├── data.json           # Veri deposu
├── assets/             # Medya dosyaları
│   └── images/
├── Dockerfile          # Docker yapılandırması
├── docker-compose.yml  # Docker Compose
└── package.json        # NPM yapılandırması
```

## Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## Geliştirme Planı

- [ ] PostgreSQL veritabanı entegrasyonu
- [ ] Admin paneli için authentication
- [ ] API dokümantasyon sayfası
- [ ] Çoklu dil desteği (İngilizce, Arapça)
- [ ] Offline mod (PWA)
- [ ] Gelişmiş filtreleme (kategori, şehir)
- [ ] Kullanıcı yorumları ve değerlendirmeleri
- [ ] Sosyal medya paylaşım özellikleri

## Lisans

Bu proje açık kaynaklıdır.

## İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.