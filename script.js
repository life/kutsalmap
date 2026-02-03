// Harita Ayarları
const mapOptions = {
    center: [21.42250476, 39.82617974], // Kabe (Mekke) koordinatları
    zoom: 17,
    zoomControl: false,
    maxZoom: 19 // Daha fazla yaklaşabilmek için
};

const map = L.map('map', mapOptions);

// Katmanlar
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; ESRI Community',
    maxZoom: 19
});

satelliteLayer.addTo(map);

const baseMaps = {
    "Uydu": satelliteLayer,
    "Karanlık": darkLayer
};
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Video Ses Seviyesini Otomatik Ayarla (Kısık Ses: %20)
map.on('popupopen', function (e) {
    const container = e.popup._contentNode;
    const videos = container.querySelectorAll('.popup-video');

    videos.forEach(media => {
        // Eğer normal <video> etiketi ise
        if (media.tagName === 'VIDEO') {
            media.volume = 0.2;
        }
        // Eğer YouTube iframe ise (API üzerinden ses ayarı)
        else if (media.tagName === 'IFRAME') {
            media.onload = () => {
                const settingVolume = JSON.stringify({
                    event: 'command',
                    func: 'setVolume',
                    args: [20] // %20 ses seviyesi
                });
                media.contentWindow.postMessage(settingVolume, '*');
            };
            // Eğer iframe zaten yüklendiyse hemen gönder
            media.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'setVolume',
                args: [20]
            }), '*');
        }
    });
});

// Popup kapandığında videoları durdur
map.on('popupclose', function (e) {
    const container = e.popup._contentNode;
    if (!container) return;

    // Normal video elementlerini durdur
    const videos = container.querySelectorAll('video');
    videos.forEach(video => {
        video.pause();
    });

    // YouTube iframe'lerini durdur
    const iframes = container.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'pauseVideo'
        }), '*');
    });
});

// API URL
const API_URL = 'api.php';
let markers = [];

// Konumları Yükle
async function loadSavedLocations() {
    console.log("Veriler yükleniyor...");
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API hatası: " + response.status);

        const locations = await response.json();
        console.log("Yüklenen Konumlar:", locations);

        markers.forEach(m => map.removeLayer(m.marker));
        markers = [];

        locations.forEach(loc => {
            const formattedLoc = {
                id: loc.id,
                lat: parseFloat(loc.lat),
                lng: parseFloat(loc.lng),
                title: loc.title || loc.note || 'İsimsiz Konum',
                description: loc.description || loc.text || '',
                videos: Array.isArray(loc.video_url) ? loc.video_url : (loc.video_url ? [loc.video_url] : []),
                image: loc.image_url || loc.image || '',
                audio: loc.audio_url || loc.audio || '',
                date: loc.created_at ? new Date(loc.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'
            };
            addSavedMarker(formattedLoc);
        });
        updateStats(locations.length);
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        if (window.location.port === '8000') {
            alert("Dikkat: 8000 portunda PHP çalışmaz. Lütfen siteye 8080 portundan (Docker) girin.");
        }
    }
}

function addSavedMarker(loc) {
    const marker = L.marker([loc.lat, loc.lng]).addTo(map);
    const popupContent = createRichPopupHtml(loc);

    marker.bindPopup(popupContent, {
        maxWidth: 500,
        className: 'custom-premium-popup',
        closeOnClick: true,
        autoClose: true,
        offset: [0, -10]
    });

    marker.on('click', (e) => {
        const latlng = e.target.getLatLng();
        const targetPoint = map.project(latlng);
        // Harita yüksekliğinin %40'ı kadar yukarı kaydır (marker aşağı insin)
        targetPoint.y -= map.getSize().y * 0.4;
        map.panTo(map.unproject(targetPoint), { animate: true, duration: 0.5 });
    });

    markers.push({ id: loc.id, marker: marker, data: loc });
}

// YouTube URL Helper
function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?enablejsapi=1` : null;
}

function createRichPopupHtml(loc) {
    const imgUrl = loc.image || loc.image_url;

    // 1. Videoları Hazırla
    const videoList = loc.videos || (loc.video_url ? (Array.isArray(loc.video_url) ? loc.video_url : [loc.video_url]) : []);
    let videoContentHtml = '';
    const hasVideo = videoList.length > 0;

    if (hasVideo) {
        const carouselId = `carousel-${loc.id}`;

        videoContentHtml += `<div class="video-carousel" id="${carouselId}">
            <div class="video-carousel-container">`;

        videoList.forEach((vUrl, index) => {
            const ytUrl = getYouTubeEmbedUrl(vUrl);
            const activeClass = index === 0 ? 'active' : '';

            if (ytUrl) {
                videoContentHtml += `<div class="video-slide ${activeClass}" data-index="${index}">
                    <iframe class="popup-video" width="100%" height="100%" src="${ytUrl}" frameborder="0" allowfullscreen></iframe>
                </div>`;
            } else if (vUrl) {
                videoContentHtml += `<div class="video-slide ${activeClass}" data-index="${index}">
                    <video class="popup-video" controls src="${vUrl}" style="width:100%; border-radius:12px;"></video>
                </div>`;
            }
        });

        videoContentHtml += `</div>`;

        if (videoList.length > 1) {
            videoContentHtml += `
                <button class="carousel-btn carousel-prev" onclick="changeVideo('${carouselId}', -1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="carousel-btn carousel-next" onclick="changeVideo('${carouselId}', 1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <div class="video-counter">
                    <span class="current-video">1</span> / ${videoList.length}
                </div>`;
        }
        videoContentHtml += `</div>`;
    }

    // 2. Sesi Hazırla
    const hasAudio = !!(loc.audio || loc.audio_url);
    let audioContentHtml = '';

    if (hasAudio) {
        audioContentHtml = `
            <div style="margin-top:20px; text-align:center;">
                <div style="margin-bottom:15px;">
                    <i class="fas fa-headphones-alt" style="font-size:3rem; color:var(--primary); opacity:0.8;"></i>
                </div>
                <audio class="popup-video" controls src="${loc.audio || loc.audio_url}" style="width:100%;"></audio>
            </div>
        `;
    }

    // 3. Tab Yapısını Oluştur
    // Tab Butonları
    let tabsHtml = `<div class="popup-tabs">
        <button class="tab-btn active" onclick="openTab(event, 'oku', ${loc.id})">
            <i class="fas fa-book-open"></i> Oku
        </button>
        <button class="tab-btn" onclick="openTab(event, 'yol', ${loc.id})">
            <i class="fas fa-route"></i> Yol Tarifi
        </button>`;

    if (hasVideo) {
        tabsHtml += `<button class="tab-btn" onclick="openTab(event, 'izle', ${loc.id})">
            <i class="fas fa-play-circle"></i> İzle
        </button>`;
    }

    if (hasAudio) {
        tabsHtml += `<button class="tab-btn" onclick="openTab(event, 'dinle', ${loc.id})">
            <i class="fas fa-music"></i> Dinle
        </button>`;
    }
    tabsHtml += `</div>`;

    // 4. Tab İçerikleri
    // Oku İçeriği (Butonlar buradan kaldırıldı)
    let readContent = `
        <div class="tab-content active" data-tab="oku">
            ${imgUrl ? `<img src="${imgUrl}" style="width:100%; border-radius:12px; margin-bottom:15px;">` : ''}
            <h4>${loc.title}</h4>
            <p>${loc.description || 'Detay bulunmuyor.'}</p>
            <div style="margin-top:10px;">
                <span style="font-size:0.8rem; color:var(--text-muted);">${loc.date}</span>
            </div>
        </div>
    `;

    // Yeni Yol Tarifi İçeriği
    let routeContent = `
        <div class="tab-content" data-tab="yol">
            <h4>Konum Bilgileri</h4>
            
            <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:10px; margin-bottom:20px; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <span style="color:var(--text-muted); font-size:0.9rem;"><i class="fas fa-arrows-alt-v"></i> Enlem</span>
                    <span style="font-family:'Courier New', monospace; font-weight:600; color:var(--primary);">${loc.lat}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--text-muted); font-size:0.9rem;"><i class="fas fa-arrows-alt-h"></i> Boylam</span>
                    <span style="font-family:'Courier New', monospace; font-weight:600; color:var(--primary);">${loc.lng}</span>
                </div>
            </div>

            <h4>Navigasyon Seçin</h4>
            <div class="direction-buttons" style="flex-direction:column;">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank" class="btn-direction btn-google" style="padding:15px;">
                    <i class="fab fa-google" style="font-size:1.5rem;"></i> 
                    <span style="font-size:1.1rem;">Google Haritalar ile Git</span>
                </a>
                <a href="https://yandex.com/maps/?rtext=~${loc.lat},${loc.lng}&rtt=auto" target="_blank" class="btn-direction btn-yandex" style="padding:15px;">
                    <i class="fab fa-yandex" style="font-size:1.5rem;"></i> 
                    <span style="font-size:1.1rem;">Yandex Navigasyon ile Git</span>
                </a>
            </div>
        </div>
    `;

    // İzle İçeriği
    let watchContent = '';
    if (hasVideo) {
        watchContent = `
            <div class="tab-content" data-tab="izle">
                <h4>Video Galeri</h4>
                ${videoContentHtml}
                <p style="font-size:0.9rem; color:var(--text-muted); margin-top:10px;">
                    ${loc.title} için ${videoList.length} video bulunuyor.
                </p>
            </div>
        `;
    }

    // Dinle İçeriği
    let listenContent = '';
    if (hasAudio) {
        listenContent = `
            <div class="tab-content" data-tab="dinle">
                <h4>Ses Kaydı</h4>
                ${audioContentHtml}
            </div>
        `;
    }

    // Hepsini Birleştir
    return `
        <div class="popup-info-card" id="popup-card-${loc.id}">
            ${tabsHtml}
            ${readContent}
            ${routeContent}
            ${watchContent}
            ${listenContent}
        </div>
    `;
}

function updateStats(count) {
    const savedCount = document.getElementById('saved-count');
    if (savedCount) savedCount.innerText = count;
}

// Arama Özelliği - Sadece JSON veri başlıklarında arama
async function performSearch(query) {
    const resultsPanel = document.getElementById('search-results');
    resultsPanel.innerHTML = '';
    resultsPanel.classList.remove('active');

    if (!query) return;

    query = query.toLowerCase();

    // 1. Sadece Kayıtlı marker'lar içinde BAŞLIK (title) araması yap
    const localMatches = markers.filter(m => {
        const title = (m.data.title || "").toLowerCase();
        // const desc = (m.data.description || "").toLowerCase(); // Kaldırıldı
        return title.includes(query);
    });

    if (localMatches.length > 0) {
        if (localMatches.length === 1) {
            focusOnMarker(localMatches[0].marker);
        } else {
            resultsPanel.classList.add('active');
            localMatches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'search-result-item';

                const title = match.data.title || 'İsimsiz Konum';
                const date = match.data.date || '';

                div.innerHTML = `
                    <span class="result-title">${title}</span>
                    <span class="result-meta">${date}</span>
                `;

                div.onclick = () => {
                    focusOnMarker(match.marker);
                    resultsPanel.classList.remove('active');
                };
                resultsPanel.appendChild(div);
            });
        }
    } else {
        alert("Eşleşen kayıt bulunamadı!");
    }
}

// Arama kutusunda Enter tuşu
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('map-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performSearch(searchInput.value.trim());
            }
        });
    }

    loadSavedLocations();
});

// Arama panelini dışarı tıklayınca kapat
document.addEventListener('click', function (event) {
    const searchContainer = document.querySelector('.search-container');
    const resultsPanel = document.getElementById('search-results');

    if (searchContainer && !searchContainer.contains(event.target)) {
        if (resultsPanel) {
            resultsPanel.classList.remove('active');
        }
    }
});

function focusOnMarker(marker) {
    const latlng = marker.getLatLng();
    const targetPoint = map.project(latlng);
    // Harita yüksekliğinin %40'ı kadar yukarı kaydır
    targetPoint.y -= map.getSize().y * 0.4;
    map.panTo(map.unproject(targetPoint), { animate: true, duration: 0.5 });
    marker.openPopup();
}

// === MY LOCATION ===
const locateBtn = document.getElementById('locate-btn');
let userLocationMarker = null;

if (locateBtn) {
    locateBtn.addEventListener('click', function () {
        if (!navigator.geolocation) {
            alert("Tarayıcınız konum özelliğini desteklemiyor.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Eski marker'ı kaldır
                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                }

                // Kırmızı pulsing marker ekle
                const pulsingIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
                    iconSize: [30, 30]
                });

                userLocationMarker = L.marker([lat, lng], { icon: pulsingIcon }).addTo(map);

                // Haritayı kullanıcının konumuna taşı
                map.setView([lat, lng], 15);

                userLocationMarker.bindPopup(`
                    <div style="text-align:center;">
                        <i class="fas fa-map-marker-alt" style="color:#e74c3c; font-size:1.2rem;"></i>
                        <p style="margin:5px 0 0 0; font-weight:600;">Konumunuz</p>
                    </div>
                `).openPopup();
            },
            function (error) {
                alert("Konum alınamadı: " + error.message);
            }
        );
    });
}

// Video carousel fonksiyonu
function changeVideo(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.video-slide');
    const counter = carousel.querySelector('.current-video');

    let currentIndex = 0;
    slides.forEach((slide, index) => {
        if (slide.classList.contains('active')) {
            currentIndex = index;
        }
    });

    // Önceki videoyu durdur
    const currentSlide = slides[currentIndex];
    const videoElement = currentSlide.querySelector('video');
    const iframeElement = currentSlide.querySelector('iframe');

    if (videoElement) {
        videoElement.pause();
    }

    if (iframeElement) {
        // YouTube video'yu durdur
        iframeElement.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'pauseVideo'
        }), '*');
    }

    // Yeni index hesapla
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = slides.length - 1;
    if (newIndex >= slides.length) newIndex = 0;

    // Aktif sınıfları güncelle
    slides[currentIndex].classList.remove('active');
    slides[newIndex].classList.add('active');

    // Counter'ı güncelle
    if (counter) {
        counter.textContent = newIndex + 1;
    }
}

// Tab Değiştirme Fonksiyonu
function openTab(event, tabName, id) {
    // Popup içindeki container
    const container = document.getElementById('popup-card-' + id);
    if (!container) return;

    // Tüm tab içeriklerini gizle
    const tabContents = container.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Tüm tab butonlarını pasif yap
    const tabBtns = container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));

    // Seçilen tabı aktif yap
    const selectedTab = container.querySelector('.tab-content[data-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add('active');

    // Tıklanan butonu aktif yap
    event.currentTarget.classList.add('active');
}
