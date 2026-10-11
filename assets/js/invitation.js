// invitation.js - Interactive Engine for Online Wedding Invitations with Dynamic Custom Data Support

// 1. Get Guest Name from URL Parameter
function initGuestName() {
    const urlParams = new URLSearchParams(window.location.search);
    const guestName = urlParams.get('to') || urlParams.get('tamu') || urlParams.get('guest') || urlParams.get('u');
    const guestElements = document.querySelectorAll('.guest-name-placeholder');
    
    if (guestName) {
        const decodedName = decodeURIComponent(guestName.replace(/\+/g, ' '));
        guestElements.forEach(el => {
            el.textContent = decodedName;
        });
    } else {
        guestElements.forEach(el => {
            el.textContent = 'Tamu Undangan & Rekan';
        });
    }
}

// 2. Custom Wedding Data Integration (from Generator / LocalStorage / URL / postMessage)
let currentCustomMusicUrl = null;

function applyCustomDataToDOM(customData) {
    if (!customData) return;

    // Apply data fields
    document.querySelectorAll('[data-field]').forEach(el => {
        const field = el.getAttribute('data-field');
        if (customData[field] !== undefined && customData[field] !== null && customData[field] !== '') {
            if (el.tagName === 'IMG') {
                el.src = customData[field];
            } else if (el.tagName === 'A' && (field === 'maps_link' || field === 'ig_pria' || field === 'ig_wanita')) {
                el.href = customData[field];
            } else {
                el.textContent = customData[field];
            }
        }
    });

    // Dynamic document title update
    if (customData.judul_pasangan) {
        document.title = `The Wedding of ${customData.judul_pasangan}`;
    }

    // Apply countdown if custom date exists
    if (customData.tanggal_iso) {
        initCountdown(customData.tanggal_iso);
    }

    // Custom Background Music Support
    if (customData.music_url) {
        currentCustomMusicUrl = customData.music_url;
        const existingAudio = document.getElementById('bg-music');
        if (existingAudio && existingAudio.src !== customData.music_url) {
            existingAudio.src = customData.music_url;
            if (isPlaying) {
                existingAudio.play().catch(e => console.log("Music update autoplay:", e));
            }
        }
    }

    // Dynamic Photo Gallery Support (Up to 8+ photos)
    if (customData.galeri_foto && Array.isArray(customData.galeri_foto) && customData.galeri_foto.length > 0) {
        const galeriGrid = document.querySelector('#galeri .grid') || document.querySelector('#galeri [class*="grid"]');
        if (galeriGrid) {
            galeriGrid.innerHTML = '';
            customData.galeri_foto.forEach((fotoUrl, idx) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'aspect-square rounded-xl overflow-hidden cursor-pointer group shadow-sm bg-black/10 relative';
                wrapper.onclick = () => openLightbox(fotoUrl, `Momen Indah #${idx + 1}`);
                wrapper.innerHTML = `
                    <img src="${fotoUrl}" alt="Foto Kenangan ${idx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                        <i class="fa-solid fa-magnifying-glass-plus"></i>
                    </div>
                `;
                galeriGrid.appendChild(wrapper);
            });
        }
    }
}

function initCustomWeddingData() {
    let customData = null;

    // Check URL param ?custom=... first
    const urlParams = new URLSearchParams(window.location.search);
    const paramData = urlParams.get('custom');
    if (paramData) {
        try {
            customData = JSON.parse(decodeURIComponent(escape(atob(paramData))));
        } catch (e) {
            console.log("Could not parse URL custom data:", e);
        }
    }

    // Check LocalStorage if not from URL
    if (!customData) {
        try {
            const stored = localStorage.getItem('custom_wedding_data');
            if (stored) {
                customData = JSON.parse(stored);
            }
        } catch (e) {
            console.log("Could not load localStorage custom data:", e);
        }
    }

    if (customData) {
        applyCustomDataToDOM(customData);
    }
}

// Live Message Listener from Builder Preview Iframe
window.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'UPDATE_WEDDING_DATA' || event.data.type === 'PREVIEW_UPDATE')) {
        applyCustomDataToDOM(event.data.payload || event.data.data);
    }
});

// 3. Open Invitation Logic
let musicStarted = false;
function bukaUndangan() {
    const cover = document.getElementById('cover-invitation');
    const bottomNav = document.getElementById('bottom-nav');
    const musicBtn = document.getElementById('music-control-btn');
    
    if (cover) {
        cover.classList.add('cover-hidden');
        setTimeout(() => {
            cover.style.display = 'none';
            document.body.classList.remove('overflow-hidden');
            if (bottomNav) bottomNav.classList.remove('hidden');
            if (musicBtn) musicBtn.classList.remove('hidden');
            
            // Trigger animation for first section
            triggerAos();
        }, 800);
    }
    
    // Play Background Audio
    playBackgroundMusic();
}

// 4. Audio Controller
let audioEl = null;
let isPlaying = false;
let audioContext = null;
let synthInterval = null;

function initAudio() {
    audioEl = document.getElementById('bg-music');
    if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'bg-music';
        audioEl.loop = true;
        // Royalty-free acoustic wedding background melody
        audioEl.src = currentCustomMusicUrl || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-love-113543.mp3';
        document.body.appendChild(audioEl);
    } else if (currentCustomMusicUrl && audioEl.src !== currentCustomMusicUrl) {
        audioEl.src = currentCustomMusicUrl;
    }
}

function playBackgroundMusic() {
    initAudio();
    if (audioEl) {
        audioEl.play().then(() => {
            isPlaying = true;
            updateMusicButtonState(true);
        }).catch(err => {
            console.log("Audio autoplay fallback to synth:", err);
            startSoftSynth();
            isPlaying = true;
            updateMusicButtonState(true);
        });
    }
}

function toggleMusic() {
    if (audioEl && !synthInterval) {
        if (isPlaying) {
            audioEl.pause();
            isPlaying = false;
            updateMusicButtonState(false);
        } else {
            audioEl.play().then(() => {
                isPlaying = true;
                updateMusicButtonState(true);
            }).catch(() => {
                startSoftSynth();
                isPlaying = true;
                updateMusicButtonState(true);
            });
        }
    } else if (synthInterval) {
        if (isPlaying) {
            stopSoftSynth();
            isPlaying = false;
            updateMusicButtonState(false);
        } else {
            startSoftSynth();
            isPlaying = true;
            updateMusicButtonState(true);
        }
    } else {
        playBackgroundMusic();
    }
}

function updateMusicButtonState(playing) {
    const icon = document.getElementById('music-icon');
    const btn = document.getElementById('music-control-btn');
    if (icon) {
        if (playing) {
            icon.className = 'fa-solid fa-compact-disc fa-spin text-xl';
            if (btn) btn.classList.add('pulse-music');
        } else {
            icon.className = 'fa-solid fa-volume-xmark text-xl';
            if (btn) btn.classList.remove('pulse-music');
        }
    }
}

// Gentle Ambient Melody Synth Backup
function startSoftSynth() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioContext) audioContext = new AudioCtx();
        if (audioContext.state === 'suspended') audioContext.resume();

        const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];
        let noteIndex = 0;

        synthInterval = setInterval(() => {
            if (!isPlaying) return;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[noteIndex % notes.length], audioContext.currentTime);
            gain.gain.setValueAtTime(0.04, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.8);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 2.0);
            noteIndex++;
        }, 1200);
    } catch(e) {
        console.log("Synth error:", e);
    }
}

function stopSoftSynth() {
    if (synthInterval) {
        clearInterval(synthInterval);
        synthInterval = null;
    }
}

// 5. Countdown Timer
let countdownTimerId = null;
function initCountdown(targetDateString) {
    if (countdownTimerId) clearInterval(countdownTimerId);
    const targetDate = new Date(targetDateString).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            const countdownEl = document.getElementById('countdown-container');
            if (countdownEl) {
                countdownEl.innerHTML = `<div class="col-span-4 p-4 text-center font-bold text-base">Alhamdulillah, Acara Telah Berlangsung</div>`;
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const elDays = document.getElementById('count-days');
        const elHours = document.getElementById('count-hours');
        const elMinutes = document.getElementById('count-minutes');
        const elSeconds = document.getElementById('count-seconds');

        if (elDays) elDays.innerText = String(days).padStart(2, '0');
        if (elHours) elHours.innerText = String(hours).padStart(2, '0');
        if (elMinutes) elMinutes.innerText = String(minutes).padStart(2, '0');
        if (elSeconds) elSeconds.innerText = String(seconds).padStart(2, '0');
    }

    update();
    countdownTimerId = setInterval(update, 1000);
}

// 6. Copy Rekening to Clipboard with Toast Notification
function salinRekening(text, label = 'Nomor Rekening') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} berhasil disalin!`);
    }).catch(err => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`${label} berhasil disalin!`);
    });
}

function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white px-5 py-2.5 rounded-full text-xs md:text-sm font-medium z-50 shadow-xl transition-all duration-300 opacity-0 pointer-events-none flex items-center space-x-2 border border-white/20';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${message}</span>`;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');

    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2800);
}

// 7. RSVP & Guestbook Local Storage Handler
const STORAGE_KEY_PREFIX = 'undangan_wishes_';

function initWishes(themeId) {
    const key = STORAGE_KEY_PREFIX + (themeId || 'default');
    const container = document.getElementById('wishes-list');
    if (!container) return;

    let defaultWishes = [
        {
            nama: 'Rizky & Amanda',
            status: 'hadir',
            pesan: 'Barakallahu lakuma wa baraka alaikuma wa jama\'a bainakuma fii khoir. Selamat menempuh hidup baru sahabatku!',
            waktu: '2 jam yang lalu'
        },
        {
            nama: 'Keluarga Besar Bpk. Hendra',
            status: 'hadir',
            pesan: 'Selamat berbahagia untuk kedua mempelai dan keluarga besar. Semoga rukun selalu sampai kakek nenek!',
            waktu: '5 jam yang lalu'
        },
        {
            nama: 'Dina Permata',
            status: 'tidak_hadir',
            pesan: 'Selamat yaa! Mohon maaf belum bisa hadir secara langsung, tapi doa terbaik selalu mengiringi langkah kalian.',
            waktu: '1 hari yang lalu'
        }
    ];

    let stored = localStorage.getItem(key);
    let wishes = stored ? JSON.parse(stored) : defaultWishes;

    renderWishes(wishes, container);
}

function renderWishes(wishes, container) {
    container.innerHTML = '';
    wishes.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'p-3.5 rounded-xl border border-black/5 bg-white/80 shadow-sm backdrop-blur-sm transition hover:shadow-md';
        
        const badgeColor = item.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
        const badgeText = item.status === 'hadir' ? 'âœ“ Hadir' : 'âœ• Tidak Hadir';

        itemEl.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs uppercase text-slate-700">
                        ${item.nama.substring(0, 2)}
                    </div>
                    <div>
                        <h4 class="font-bold text-xs text-slate-800 leading-tight">${escapeHtml(item.nama)}</h4>
                        <span class="text-[10px] text-slate-400">${item.waktu || 'Baru saja'}</span>
                    </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}">
                    ${badgeText}
                </span>
            </div>
            <p class="text-xs text-slate-600 pl-9">${escapeHtml(item.pesan)}</p>
        `;
        container.appendChild(itemEl);
    });

    const countEl = document.getElementById('wishes-count');
    if (countEl) countEl.innerText = `${wishes.length} Doa & Ucapan`;
}

function kirimUcapan(e, themeId) {
    e.preventDefault();
    const namaInput = document.getElementById('rsvp-nama');
    const statusInput = document.getElementById('rsvp-status');
    const pesanInput = document.getElementById('rsvp-pesan');

    if (!namaInput || !pesanInput) return;

    const nama = namaInput.value.trim();
    const status = statusInput ? statusInput.value : 'hadir';
    const pesan = pesanInput.value.trim();

    if (!nama || !pesan) {
        alert('Mohon isi nama dan ucapan Anda.');
        return;
    }

    const key = STORAGE_KEY_PREFIX + (themeId || 'default');
    let stored = localStorage.getItem(key);
    let wishes = stored ? JSON.parse(stored) : [];

    const newWish = {
        nama: nama,
        status: status,
        pesan: pesan,
        waktu: 'Baru saja'
    };

    wishes.unshift(newWish);
    localStorage.setItem(key, JSON.stringify(wishes));

    const container = document.getElementById('wishes-list');
    if (container) renderWishes(wishes, container);

    namaInput.value = '';
    pesanInput.value = '';
    showToast('Terima kasih! Ucapan & doa berhasil dikirim.');
}

function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
}

// 8. Lightbox for Photo Gallery
function openLightbox(src, caption) {
    let lb = document.getElementById('gallery-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'gallery-lightbox';
        lb.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer';
        lb.onclick = () => { lb.style.display = 'none'; };
        lb.innerHTML = `
            <div class="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                <button class="absolute -top-10 right-0 text-white text-2xl hover:text-rose-400">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <img id="lightbox-img" src="" class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain">
                <p id="lightbox-cap" class="text-white/80 mt-3 text-sm text-center font-light"></p>
            </div>
        `;
        document.body.appendChild(lb);
    }
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-cap').innerText = caption || '';
    lb.style.display = 'flex';
}

// Trigger CSS animation trigger on scroll
function triggerAos() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initGuestName();
    initCustomWeddingData();
    triggerAos();
});
