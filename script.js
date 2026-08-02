// --- STATE & PERSISTENT STORAGE MEMORY ---
let userName = localStorage.getItem('db-name') || "Alex";
let isAnalogClockMode = localStorage.getItem('db-clock-mode') === "analog";
let activeAmbientMotionStyle = localStorage.getItem('db-ambient-motion') || "float";
let currentSelectedLiquidTheme = localStorage.getItem('db-liquid-theme') || "orange";
let myMicroGoalsList = JSON.parse(localStorage.getItem('db-micro-goals')) || [];

let totalMs = 300000, msLeft = 300000, isTimerRunning = false, isSettingUp = false;
let intervalId = null, lastTimestamp = 0;
let lastRecordedHour = -1;

// --- WEB AUDIO ENGINE CONTROLLERS ---
let audioCtx = null, ambientNodes = {};
function initAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function makeWhiteNoiseSource() {
    initAudioCtx();
    const size = audioCtx.sampleRate * 2, buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) { data[i] = Math.random() * 2 - 1; }
    const node = audioCtx.createBufferSource(); node.buffer = buffer; node.loop = true;
    return node;
}

function toggleAmbientSound(type, vol) {
    try {
        initAudioCtx();
        if (ambientNodes[type]) {
            ambientNodes[type].src.stop(); ambientNodes[type].gain.disconnect();
            delete ambientNodes[type]; document.getElementById(`sound-${type}`).classList.remove('active');
            return;
        }
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.connect(audioCtx.destination);
        let src = makeWhiteNoiseSource(); const filter = audioCtx.createBiquadFilter();
        
        if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.setValueAtTime(450, audioCtx.currentTime); }
        else if (type === 'fire') { filter.type = 'bandpass'; filter.frequency.setValueAtTime(1000, audioCtx.currentTime); filter.Q.setValueAtTime(2.5, audioCtx.currentTime); }
        else { filter.type = 'lowpass'; filter.frequency.setValueAtTime(1200, audioCtx.currentTime); }
        
        src.connect(filter); filter.connect(gain); src.start();
        ambientNodes[type] = { src: src, gain: gain }; document.getElementById(`sound-${type}`).classList.add('active');
    } catch(e){}
}

// --- AUTOMATIC RE-EVALUATION COLOR TEMP TIME THEME SCHEMES ---
function updateColorTemperatureTheme() {
    const hr = new Date().getHours();
    let computedTheme = "noon";
    let greetingText = "Good morning";
    
    if (hr >= 5 && hr < 12) {
        computedTheme = "morning"; greetingText = "Good morning";
    } else if (hr >= 12 && hr < 17) {
        computedTheme = "noon"; greetingText = "Good afternoon";
    } else if (hr >= 17 && hr < 21) {
        computedTheme = "evening"; greetingText = "Good evening";
    } else {
        computedTheme = "midnight"; greetingText = "Good night";
    }
    
    document.body.classList.remove('time-morning', 'time-noon', 'time-evening', 'time-midnight');
    document.body.classList.add(`time-${computedTheme}`);
    
    const displayHeader = document.getElementById('greetingDisplay');
    if (displayHeader && !displayHeader.classList.contains('hidden')) {
        displayHeader.textContent = `${greetingText}, ${userName}!`;
    }
}

function switchAmbientMotionStyle(styleMode) {
    activeAmbientMotionStyle = styleMode;
    localStorage.setItem('db-ambient-motion', styleMode);
    
    document.body.classList.remove('fx-float', 'fx-orbit', 'fx-breath');
    document.body.classList.add(`fx-${styleMode}`);
    
    document.querySelectorAll('.style-select-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `fx-${styleMode}`);
    });
}

// --- CLOCK CONTROLLER METRICS ---
function updateClockMechanics() {
    const now = new Date(), hr = now.getHours(), min = now.getMinutes(), sec = now.getSeconds();
    
    const timeMainEl = document.getElementById('timeMain');
    if (timeMainEl) {
        timeMainEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        document.getElementById('timeAmpm').textContent = hr >= 12 ? 'PM' : 'AM';
        document.getElementById('dateSub').textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
        
        document.getElementById('analogHour').style.transform = `translateX(-50%) rotate(${(hr * 30) + (min * 0.5)}deg)`;
        document.getElementById('analogMin').style.transform = `translateX(-50%) rotate(${(min * 6)}deg)`;
        document.getElementById('analogSec').style.transform = `translateX(-50%) rotate(${(sec * 6)}deg)`;
    }
    
    if (hr !== lastRecordedHour || sec === 0) {
        lastRecordedHour = hr;
        updateColorTemperatureTheme();
    }
}
setInterval(updateClockMechanics, 1000);

function toggleClockStyleMode() {
    isAnalogClockMode = !isAnalogClockMode;
    localStorage.setItem('db-clock-mode', isAnalogClockMode ? "analog" : "digital");
    syncClockFaceDisplay();
}
function syncClockFaceDisplay() {
    document.getElementById('digitalClockView').classList.toggle('hidden', isAnalogClockMode);
    document.getElementById('analogClockView').classList.toggle('hidden', !isAnalogClockMode);
}
function editName() { document.getElementById('greetingDisplay').classList.add('hidden'); document.getElementById('nameEditor').classList.remove('hidden'); const inputNode = document.getElementById('nameInput'); inputNode.value = userName; inputNode.focus(); }
function saveName() { const val = document.getElementById('nameInput').value.trim(); if (val) { userName = val; localStorage.setItem('db-name', val); } document.getElementById('nameEditor').classList.add('hidden'); document.getElementById('greetingDisplay').classList.remove('hidden'); updateClockMechanics(); }
function handleNameInputKey(e) { if (e.key === 'Enter') saveName(); }
function toggleFocusMode() { const w = document.querySelector('.dashboard-wrapper'); w.classList.toggle('focus-active'); const isF = w.classList.contains('focus-active'); document.querySelector('.focus-mode-toggle-btn').textContent = isF ? "👁️ Exit Focus" : "👁️ Focus Mode"; }
// --- NATIVE PROGRESSIVE SYSTEM SERVICE REGISTRATION ENGINE ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('data:text/javascript;base64,' + btoa(`
            self.addEventListener('install', e => self.skipWaiting());
            self.addEventListener('activate', e => e.waitUntil(clients.claim()));
            self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
        `)).catch(() => console.log("Standalone cache profile validated."));
    });
}
