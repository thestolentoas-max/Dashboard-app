// --- STATE & PERSISTENT STORAGE MEMORY ---
let userName = localStorage.getItem('db-name') || "Alex";
let activeLocKey = localStorage.getItem('db-loc-key') || "auto";
let totalMs = 300000, msLeft = 300000, isTimerRunning = false, isSettingUp = false;
let intervalId = null, lastTimestamp = 0;

const presets = {
    auto: { lat: -37.81, lon: 144.96, name: "Melbourne, VIC" },
    melbourne: { lat: -37.81, lon: 144.96, name: "Melbourne, AU" },
    sydney: { lat: -33.86, lon: 151.20, name: "Sydney, AU" },
    london: { lat: 51.50, lon: -0.12, name: "London, UK" },
    newyork: { lat: 40.71, lon: -74.00, name: "New York, US" },
    tokyo: { lat: 35.68, lon: 139.69, name: "Tokyo, JP" }
};

// --- RUNTIME CLOCK MECHANICS ---
function updateClock() {
    const now = new Date(), hr = now.getHours();
    document.getElementById('timeMain').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    document.getElementById('timeAmpm').textContent = hr >= 12 ? 'PM' : 'AM';
    document.getElementById('dateSub').textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    
    let greet = "Good morning", sub = "Time to crush your goals today.";
    if (hr >= 12 && hr < 17) { greet = "Good afternoon"; sub = "Keep up the momentum."; }
    else if (hr >= 17 && hr < 22) { greet = "Good evening"; sub = "Unwind and review."; }
    else if (hr >= 22 || hr < 5) { greet = "Good night"; sub = "Recharge for tomorrow."; }
    
    document.getElementById('greetingDisplay').textContent = `${greet}, ${userName}!`;
    document.getElementById('greetingSubtext').textContent = sub;
}
setInterval(updateClock, 1000); updateClock();

function editName() { document.getElementById('greetingDisplay').classList.add('hidden'); document.getElementById('nameEditor').classList.remove('hidden'); document.getElementById('nameInput').value = userName; }
function saveName() { const val = document.getElementById('nameInput').value.trim(); if (val) { userName = val; localStorage.setItem('db-name', val); } document.getElementById('nameEditor').classList.add('hidden'); document.getElementById('greetingDisplay').classList.remove('hidden'); updateClock(); }

// --- CORS-RESISTANT WEATHER TUNNEL ---
async function fetchLiveWeatherMetrics(lat = -37.81, lon = 144.96, name = "Melbourne, VIC") {
    const tempNode = document.getElementById('weatherTemp'), msgNode = document.getElementById('weatherMessage'), iconNode = document.getElementById('weatherIconContainer');
    document.getElementById('weatherLocation').textContent = name;
    const api = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    try {
        let res = null, data = null;
        try { res = await fetch(api); if (res.ok) data = await res.json(); } catch(e){}
        if (!data) { res = await fetch(`https://allorigins.win{encodeURIComponent(api)}`); const wrap = await res.json(); data = JSON.parse(wrap.contents); }
        const wCode = data.current.weather_code;
        tempNode.textContent = `${Math.round(data.current.temperature_2m)}°C`;
        let desc = "Clear Sky", icon = "☀️";
        if (wCode > 0 && wCode <= 3) { desc = "Partly Cloudy"; icon = "⛅"; }
        else if (wCode >= 45 && wCode <= 48) { desc = "Foggy"; icon = "CN"; }
        else if (wCode >= 51 && wCode <= 67) { desc = "Light Rain"; icon = "🌧️"; }
        else if (wCode >= 80 && wCode <= 82) { desc = "Rain Showers"; icon = "🌦️"; }
        else if (wCode >= 95) { desc = "Thunderstorms"; icon = "⛈️"; }
        iconNode.textContent = icon; msgNode.textContent = desc; msgNode.classList.remove('error-text');
    } catch {
        tempNode.textContent = "--°C"; iconNode.textContent = "❌"; msgNode.textContent = "Error loading metrics"; msgNode.classList.add('error-text');
    }
}

function handleDropdownLocationChange() { const key = document.getElementById('locationDropdown').value, t = presets[key]; if (t) { activeLocKey = key; localStorage.setItem('db-loc-key', key); fetchLiveWeatherMetrics(t.lat, t.lon, t.name); } }
async function fetchCustomLocationWeather() { const val = document.getElementById('citySearchInput').value.trim(); if (!val) return; document.getElementById('weatherMessage').textContent = "Searching..."; const api = `https://open-meteo.com{encodeURIComponent(val)}&count=1`; try { let res = await fetch(`https://allorigins.win{encodeURIComponent(api)}`), wrap = await res.json(), data = JSON.parse(wrap.contents); if (!data.results) throw new Error(); const m = data.results; await fetchLiveWeatherMetrics(m.latitude, m.longitude, `${m.name}, ${m.country_code ? m.country_code.toUpperCase() : ''}`); document.getElementById('locationDropdown').value = "auto"; } catch { document.getElementById('weatherMessage').textContent = "Location not found"; } }
function handleWeatherSearchKey(e) { if (e.key === 'Enter') fetchCustomLocationWeather(); }

// --- SYSTEMS TIME HARWARE INTERVALS ---
function runTimerLoop() {
    if (!isTimerRunning) return;
    const now = performance.now();
    msLeft -= (now - lastTimestamp); lastTimestamp = now;
    if (msLeft <= 0) {
        msLeft = 0; isTimerRunning = false; clearInterval(intervalId); intervalId = null;
        document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active');
        if (document.hidden && Notification.permission === "granted") new Notification("Timer Finished!");
        try { let ctx = new (window.AudioContext || window.webkitAudioContext)(), osc = ctx.createOscillator(), gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5); } catch(e){}
    }
    renderTimerUi();
}
function renderTimerUi() { const totalSecs = Math.ceil(msLeft / 1000); document.getElementById('countdownDisplay').textContent = `${String(Math.floor(totalSecs / 60)).padStart(2, '0')}:${String(totalSecs % 60).padStart(2, '0')}`; document.getElementById('liquidFill').style.top = `${(1 - (msLeft / totalMs)) * 100}%`; }
function toggleTimer() { if (isSettingUp) saveTimerSettings(); const btn = document.getElementById('pauseBtn'); if (isTimerRunning) { isTimerRunning = false; clearInterval(intervalId); btn.textContent = "Start"; btn.classList.remove('active'); } else { isTimerRunning = true; lastTimestamp = performance.now(); intervalId = setInterval(runTimerLoop, 50); btn.textContent = "Pause"; btn.classList.add('active'); } }
function cancelTimer() { isTimerRunning = false; if (intervalId) clearInterval(intervalId); msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active'); renderTimerUi(); }
function openTimerSettings() { if (isTimerRunning) return; isSettingUp = true; document.getElementById('countdownDisplay').classList.add('hidden'); document.getElementById('timerInputOverlay').classList.remove('hidden'); const totalSecs = totalMs / 1000; document.getElementById('inputMinutes').value = String(Math.floor(totalSecs / 60)).padStart(2, '0'); document.getElementById('inputSeconds').value = String(totalSecs % 60).padStart(2, '0'); }
function saveTimerSettings() { totalMs = ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60 + Math.min(59, parseInt(document.getElementById('inputSeconds').value) || 0)) * 1000; msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); renderTimerUi(); }
function handleTimerInputKey(e) { if (e.key === 'Enter') saveTimerSettings(); }

// --- PANEL LAYOUT REVEALS ---
const observer = new IntersectionObserver((entries) => { entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)); }, { threshold: 0.15 });
function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
document.querySelectorAll('.element-reveal').forEach(el => observer.observe(el));

if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
document.getElementById('locationDropdown').value = activeLocKey;
const startCoords = presets[activeLocKey];
fetchLiveWeatherMetrics(startCoords.lat, startCoords.lon, startCoords.name);
renderTimerUi();
