// Harita Ayarları
const mapOptions = {
    center: [21.42250476, 39.82617974], // Kabe (Mekke) koordinatları
    zoom: 17,
    zoomControl: false
};

const map = L.map('map', mapOptions);

// Katmanlar
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; ESRI Community'
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
        console.log("Yazan Konumlar:", locations);

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
        offset: [0, -10] // Popup'ı biraz yukarı alalım ki nokta tam ortada kalsın
    });

    marker.on('click', (e) => {
        const latlng = e.target.getLatLng();
        const targetPoint = map.project(latlng);
        targetPoint.y -= 250; // Daha fazla aşağı kaydır (Üstte büyük yer kalsın)
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
    let mediaHtml = '';

    if (imgUrl) {
        mediaHtml += `<img src="${imgUrl}" style="width:100%; border-radius:12px; margin-bottom:15px;">`;
    }

    // Videoları işle (Carousel ile)
    const videoList = loc.videos || (loc.video_url ? (Array.isArray(loc.video_url) ? loc.video_url : [loc.video_url]) : []);

    if (videoList.length > 0) {
        const carouselId = `carousel-${loc.id}`;

        mediaHtml += `<div class="video-carousel" id="${carouselId}">
            <div class="video-carousel-container">`;

        videoList.forEach((vUrl, index) => {
            const ytUrl = getYouTubeEmbedUrl(vUrl);
            const activeClass = index === 0 ? 'active' : '';

            if (ytUrl) {
                mediaHtml += `<div class="video-slide ${activeClass}" data-index="${index}">
                    <iframe class="popup-video" width="100%" height="100%" src="${ytUrl}" frameborder="0" allowfullscreen></iframe>
                </div>`;
            } else if (vUrl) {
                mediaHtml += `<div class="video-slide ${activeClass}" data-index="${index}">
                    <video class="popup-video" controls src="${vUrl}" style="width:100%; border-radius:12px;"></video>
                </div>`;
            }
        });

        mediaHtml += `</div>`;

        // Navigation ve counter (sadece birden fazla video varsa)
        if (videoList.length > 1) {
            mediaHtml += `
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

        mediaHtml += `</div>`;
    }

    let audioHtml = '';
    if (loc.audio || loc.audio_url) {
        audioHtml = `
            <div style="margin-top:10px;">
                <audio class="popup-video" controls src="${loc.audio || loc.audio_url}" style="width:100%;"></audio>
            </div>
        `;
    }

    return `
        <div class="popup-info-card">
            ${mediaHtml}
            <h4>${loc.title}</h4>
            <p>${loc.description || 'Detay bulunmuyor.'}</p>
            ${audioHtml}

            <!-- Yol Tarifi Butonları -->
            <div class="direction-buttons">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank" class="btn-direction btn-google">
                    <i class="fab fa-google"></i> Google
                </a>
                <a href="https://yandex.com/maps/?rtext=~${loc.lat},${loc.lng}&rtt=auto" target="_blank" class="btn-direction btn-yandex">
                    <i class="fab fa-yandex"></i> Yandex
                </a>
            </div>

            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <span style="font-size:0.8rem; color:var(--text-muted);">${loc.date}</span>
                <div style="display:flex; gap:8px;">
                    <button class="btn-edit-small" onclick="editLocation(${loc.id})">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn-delete-small" onclick="deleteLocation(${loc.id})">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Tıklama ile Yeni Kayıt
let currentMarker = null;

map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    // Tıklanan yeri ekranın altına al (Popup için üstte geniş bir boşluk bırak)
    const targetPoint = map.project(e.latlng);
    targetPoint.y -= 250;
    map.panTo(map.unproject(targetPoint), { animate: true, duration: 0.5 });

    if (currentMarker) map.removeLayer(currentMarker);

    currentMarker = L.marker([lat, lng]).addTo(map);

    const formHtml = `
        <div class="popup-form-card">
            <h4>Yeni Konum Kaydet</h4>
            <label>Başlık</label>
            <input type="text" id="pop-title" placeholder="Örn: Merve Tepesi">
            <label>Detaylı Açıklama</label>
            <textarea id="pop-description" placeholder="Bu yer hakkında detaylı bilgi..."></textarea>
            <label>Fotoğraf URL</label>
            <input type="text" id="pop-image" placeholder="https://example.com/resim.jpg">
            <label>Video / YouTube URL (Her satıra bir link)</label>
            <textarea id="pop-videos" placeholder="https://youtube.com/watch?v=...&#10;https://example.com/video.mp4" style="height:80px;"></textarea>
            <label>Ses URL (MP3)</label>
            <input type="text" id="pop-audio" placeholder="https://example.com/ses.mp3">
            <button class="btn-primary" style="width:100%;" onclick="saveNewLocation(${lat}, ${lng})">
                <i class="fas fa-save"></i> Veritabanına Kaydet
            </button>
        </div>
    `;

    currentMarker.bindPopup(formHtml, {
        closeOnClick: true,
        autoClose: false,
        className: 'custom-premium-popup'
    }).openPopup();
});

async function saveNewLocation(lat, lng) {
    const title = document.getElementById('pop-title').value;
    const description = document.getElementById('pop-description').value;
    const image = document.getElementById('pop-image').value;
    const videoText = document.getElementById('pop-videos').value;
    const audio = document.getElementById('pop-audio').value;

    // Videoları array'e çevir
    const videos = videoText.split('\n').map(v => v.trim()).filter(v => v !== '');

    const data = { lat, lng, title, description, image, video: videos, audio };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            if (currentMarker) map.removeLayer(currentMarker);
            currentMarker = null;
            loadSavedLocations();
        }
    } catch (error) {
        alert('Hata!');
    }
}

async function deleteLocation(id) {
    if (!confirm('Emin misiniz?')) return;
    try {
        const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) loadSavedLocations();
    } catch (error) {
        alert('Silinemedi!');
    }
}

// Konum Düzenleme
function editLocation(id) {
    const markerData = markers.find(m => m.id == id);
    if (!markerData) return;

    const loc = markerData.data;
    const marker = markerData.marker;

    // Videoları satır satır hale getir
    const videoText = Array.isArray(loc.videos) ? loc.videos.join('\n') : (loc.videos || '');

    const editFormHtml = `
        <div class="popup-form-card">
            <h4>Konumu Düzenle</h4>
            <label>Başlık</label>
            <input type="text" id="edit-title" value="${loc.title || ''}" placeholder="Örn: Merve Tepesi">
            <label>Detaylı Açıklama</label>
            <textarea id="edit-description" placeholder="Bu yer hakkında detaylı bilgi...">${loc.description || ''}</textarea>
            <label>Fotoğraf URL</label>
            <input type="text" id="edit-image" value="${loc.image || ''}" placeholder="https://example.com/resim.jpg">
            <label>Video / YouTube URL (Her satıra bir link)</label>
            <textarea id="edit-videos" placeholder="https://youtube.com/watch?v=...&#10;https://example.com/video.mp4" style="height:80px;">${videoText}</textarea>
            <label>Ses URL (MP3)</label>
            <input type="text" id="edit-audio" value="${loc.audio || ''}" placeholder="https://example.com/ses.mp3">
            <div style="display:flex; gap:8px;">
                <button class="btn-primary" style="flex:1;" onclick="updateLocation(${id})">
                    <i class="fas fa-save"></i> Güncelle
                </button>
                <button class="btn-secondary" style="flex:1;" onclick="cancelEdit(${id})">
                    <i class="fas fa-times"></i> İptal
                </button>
            </div>
        </div>
    `;

    marker.setPopupContent(editFormHtml);
}

function cancelEdit(id) {
    const markerData = markers.find(m => m.id == id);
    if (!markerData) return;

    const marker = markerData.marker;
    const loc = markerData.data;
    marker.setPopupContent(createRichPopupHtml(loc));
}

async function updateLocation(id) {
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    const image = document.getElementById('edit-image').value;
    const videoText = document.getElementById('edit-videos').value;
    const audio = document.getElementById('edit-audio').value;

    const videos = videoText.split('\n').map(v => v.trim()).filter(v => v !== '');

    const markerData = markers.find(m => m.id == id);
    if (!markerData) return;

    const data = {
        id,
        lat: markerData.data.lat,
        lng: markerData.data.lng,
        title,
        description,
        image,
        video: videos,
        audio
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            loadSavedLocations();
        } else {
            alert('Güncelleme başarısız!');
        }
    } catch (error) {
        alert('Hata!');
    }
}

function updateStats(count) {
    const savedCount = document.getElementById('saved-count');
    if (savedCount) savedCount.innerText = count;
}

// Arama Özelliği
async function performSearch(query) {
    const resultsPanel = document.getElementById('search-results');
    resultsPanel.innerHTML = '';
    resultsPanel.classList.remove('active');

    if (!query) return;

    query = query.toLowerCase();

    // 1. Kayıtlı marker'lar içinde her şeyi bul (multiple match)
    const localMatches = markers.filter(m => {
        const title = (m.data.title || "").toLowerCase();
        const desc = (m.data.description || "").toLowerCase();
        return title.includes(query) || desc.includes(query);
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
                    <span class="result-meta">Senin kaydın - ${date}</span>
                `;

                div.onclick = () => {
                    focusOnMarker(match.marker);
                    resultsPanel.classList.remove('active');
                };
                resultsPanel.appendChild(div);
            });
        }
        return;
    }

    // 2. Global (OSM Nominatim) ara
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const results = await response.json();

        if (results.length > 0) {
            const first = results[0];
            const latlng = [parseFloat(first.lat), parseFloat(first.lon)];
            map.setView(latlng, 15, { animate: true });

            L.popup()
                .setLatLng(latlng)
                .setContent(`<div class="popup-info-card"><h4>${first.display_name}</h4><p>Global aramada bulundu.</p></div>`)
                .openOn(map);
        } else {
            alert("Sonuç bulunamadı.");
        }
    } catch (error) {
        console.error("Arama hatası:", error);
    }
}

function focusOnMarker(marker) {
    const latlng = marker.getLatLng();
    const targetPoint = map.project(latlng);
    targetPoint.y -= 250;
    map.panTo(map.unproject(targetPoint), { animate: true, duration: 0.5 });
    marker.openPopup();
}

// Boşluğa tıklayınca sonuçları kapat
document.addEventListener('click', (e) => {
    const resultsPanel = document.getElementById('search-results');
    if (resultsPanel && !e.target.closest('.search-container')) {
        resultsPanel.classList.remove('active');
    }
});

document.getElementById('map-search').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        performSearch(this.value);
    }
});

// Başlat
loadSavedLocations();

// Konumumu Bul Özelliği
let userMarker = null;

document.getElementById('locate-btn').addEventListener('click', function () {
    const btn = this;
    const icon = btn.querySelector('i');

    // Yükleniyor efekti
    icon.className = 'fas fa-spinner fa-spin';

    if (!navigator.geolocation) {
        alert("Tarayıcınız konum özelliğini desteklemiyor.");
        icon.className = 'fas fa-location-arrow';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const userLatLng = [latitude, longitude];

            // Eski marker'ı temizle
            if (userMarker) map.removeLayer(userMarker);

            // Özel Pulse Efektli Marker
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(map);
            userMarker.bindPopup("<b>Buradasınız</b>").openPopup();

            // Haritayı yumuşak bir şekilde oraya odakla
            map.setView(userLatLng, 16, { animate: true, duration: 1 });

            icon.className = 'fas fa-location-arrow';
        },
        (error) => {
            console.error("Konum hatası:", error);
            alert("Konumunuz alınamadı. Lütfen izin verdiğinizden emin olun.");
            icon.className = 'fas fa-location-arrow';
        },
        { enableHighAccuracy: true }
    );
});

// Video Carousel Navigation
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

    // Yeni index hesapla
    let newIndex = currentIndex + direction;

    // Sınırları kontrol et
    if (newIndex < 0) newIndex = slides.length - 1;
    if (newIndex >= slides.length) newIndex = 0;

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

    // Active sınıfını değiştir
    slides[currentIndex].classList.remove('active');
    slides[newIndex].classList.add('active');

    // Counter'ı güncelle
    if (counter) {
        counter.textContent = newIndex + 1;
    }
}
