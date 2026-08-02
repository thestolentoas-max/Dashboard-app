// --- STATE & PERSISTENT STORAGE MEMORY ---
let userName = localStorage.getItem('db-name') || "Alex";
let activeLocKey = localStorage.getItem('db-loc-key') || "auto";
let totalMs = 300000, msLeft = 300000, isTimerRunning = false, isSettingUp = false;
let intervalId = null, lastTimestamp = 0;
let currentCityName = "Melbourne, VIC";
let currentTemperatureString = "--°C";

const witAiBearerApiToken = "AQ.Ab8RN6IvY6nL1b3cOGwOxVNFrvjURfcNO3FMs4sGF4SnfVMv6Q";

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
// --- FIXED WEATHER TUNNEL ---
async function fetchLiveWeatherMetrics(lat = -37.81, lon = 144.96, name = "Melbourne, VIC") {
    const tempNode = document.getElementById('weatherTemp'), msgNode = document.getElementById('weatherMessage'), iconNode = document.getElementById('weatherIconContainer');
    currentCityName = name;
    document.getElementById('weatherLocation').textContent = name;
    const api = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    try {
        let res = await fetch(api);
        let data = null;
        if (res.ok) { data = await res.json(); } else {
            res = await fetch(`https://allorigins.win{encodeURIComponent(api)}`);
            const wrap = await res.json(); data = JSON.parse(wrap.contents);
        }
        const wCode = data.current.weather_code;
        currentTemperatureString = `${Math.round(data.current.temperature_2m)}°C`;
        tempNode.textContent = currentTemperatureString;
        let desc = "Clear Sky", icon = "☀️";
        if (wCode > 0 && wCode <= 3) { desc = "Partly Cloudy"; icon = "⛅"; }
        else if (wCode >= 45 && wCode <= 48) { desc = "Foggy"; icon = "🌫️"; }
        else if (wCode >= 51 && wCode <= 67) { desc = "Light Rain"; icon = "🌧️"; }
        else if (wCode >= 80 && wCode <= 82) { desc = "Rain Showers"; icon = "🌦️"; }
        else if (wCode >= 95) { desc = "Thunderstorms"; icon = "⛈️"; }
        iconNode.textContent = icon; msgNode.textContent = desc; msgNode.classList.remove('error-text');
    } catch {
        tempNode.textContent = "--°C"; iconNode.textContent = "❌"; msgNode.textContent = "Error loading metrics"; msgNode.classList.add('error-text');
    }
}

function handleDropdownLocationChange() { const key = document.getElementById('locationDropdown').value, t = presets[key]; if (t) { activeLocKey = key; localStorage.setItem('db-loc-key', key); fetchLiveWeatherMetrics(t.lat, t.lon, t.name); } }
async function fetchCustomLocationWeather() { const val = document.getElementById('citySearchInput').value.trim(); if (!val) return; document.getElementById('weatherMessage').textContent = "Searching..."; const api = `https://open-meteo.com{encodeURIComponent(val)}&count=1`; try { let res = await fetch(`https://allorigins.win{encodeURIComponent(api)}`), wrap = await res.json(), data = JSON.parse(wrap.contents); if (!data.results || data.results.length === 0) throw new Error(); const m = data.results; await fetchLiveWeatherMetrics(m.latitude, m.longitude, `${m.name}, ${m.country_code ? m.country_code.toUpperCase() : ''}`); document.getElementById('locationDropdown').value = "auto"; } catch { document.getElementById('weatherMessage').textContent = "Location not found"; } }
function handleWeatherSearchKey(e) { if (e.key === 'Enter') fetchCustomLocationWeather(); }

// --- COUNTDOWN TIMERS LOOP ---
function runTimerLoop() {
    if (!isTimerRunning) return;
    const now = performance.now();
    msLeft -= (now - lastTimestamp); lastTimestamp = now;
    if (msLeft <= 0) {
        msLeft = 0; isTimerRunning = false; clearInterval(intervalId); intervalId = null;
        document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active');
        try { let ctx = new (window.AudioContext || window.webkitAudioContext)(), osc = ctx.createOscillator(), gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5); } catch (e) { }
    }
    renderTimerUi();
}
function renderTimerUi() {
    const totalSecs = Math.ceil(msLeft / 1000);
    document.getElementById('countdownDisplay').textContent = `${String(Math.floor(totalSecs / 60)).padStart(2, '0')}:${String(totalSecs % 60).padStart(2, '0')}`;
    const fillNode = document.getElementById('liquidFill');
    fillNode.style.top = `${(1 - (msLeft / totalMs)) * 100}%`;
    if (msLeft < 30000 && msLeft > 0) { fillNode.classList.add('timer-critical'); } else { fillNode.classList.remove('timer-critical'); }
}

function toggleTimer() { if (isSettingUp) saveTimerSettings(); const btn = document.getElementById('pauseBtn'); if (isTimerRunning) { isTimerRunning = false; clearInterval(intervalId); btn.textContent = "Start"; btn.classList.remove('active'); } else { isTimerRunning = true; lastTimestamp = performance.now(); intervalId = setInterval(runTimerLoop, 50); btn.textContent = "Pause"; btn.classList.add('active'); } }
function cancelTimer() { isTimerRunning = false; if (intervalId) clearInterval(intervalId); msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active'); renderTimerUi(); }
function openTimerSettings() { if (isTimerRunning) return; isSettingUp = true; document.getElementById('countdownDisplay').classList.add('hidden'); document.getElementById('timerInputOverlay').classList.remove('hidden'); const totalSecs = totalMs / 1000; document.getElementById('inputMinutes').value = String(Math.floor(totalSecs / 60)).padStart(2, '0'); document.getElementById('inputSeconds').value = String(totalSecs % 60).padStart(2, '0'); }
function saveTimerSettings() { totalMs = ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60 + Math.min(59, parseInt(document.getElementById('inputSeconds').value) || 0)) * 1000; msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); renderTimerUi(); }
function handleTimerInputKey(e) { if (e.key === 'Enter') saveTimerSettings(); }

function toggleAiInterface() { document.getElementById('aiCardInterface').classList.toggle('hidden'); }
function handleAiInputKey(e) { if (e.key === 'Enter') processAiAssistantCommand(); }

async function processAiAssistantCommand() {
    const inputNode = document.getElementById('aiTextInput'), outputNode = document.getElementById('aiOutputText'), waveNode = document.getElementById('aiWaveContainer'), query = inputNode.value.trim();
    if (!query) return; inputNode.value = ""; waveNode.classList.add('speaking'); outputNode.textContent = "Processing semantic parameters...";
    const apiURL = `https://wit.ai{encodeURIComponent(query)}`;
    try {
        const res = await fetch(`https://allorigins.win{encodeURIComponent(apiURL)}`, { headers: { "Authorization": `Bearer ${witAiBearerApiToken}` } });
        if (!res.ok) throw new Error();
        const wrapper = await res.json(), nlpData = JSON.parse(wrapper.contents);
        let intent = nlpData.intents && nlpData.intents.length > 0 ? nlpData.intents.name : null;
        let traitIntent = nlpData.traits && nlpData.traits.intent ? nlpData.traits.intent.value : null;
        let resolvedIntent = intent || traitIntent || "unknown", answer = "I processed your request, but I couldn't match it to a system command. Try asking to 'start the timer' or 'check London weather'!", lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('timer') || resolvedIntent.includes('timer')) {
            if (lowerQuery.includes('start') || lowerQuery.includes('run') || lowerQuery.includes('play')) { if (!isTimerRunning) { toggleTimer(); answer = "Command accepted. Countdown clock loops initiated."; } }
            else if (lowerQuery.includes('stop') || lowerQuery.includes('pause')) { if (isTimerRunning) { toggleTimer(); answer = "Command accepted. Frozen fluid animation thresholds."; } }
            else if (lowerQuery.includes('clear') || lowerQuery.includes('reset') || lowerQuery.includes('cancel')) { cancelTimer(); answer = "Command accepted. Cap ceiling capacities restored."; }
            else { const numExtracts = lowerQuery.match(/\d+/); if (numExtracts) { const extractedMins = parseInt(numExtracts); totalMs = extractedMins * 60 * 1000; msLeft = totalMs; renderTimerUi(); answer = `Timer values updated to ${extractedMins} minutes.`; } }
        } else if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || resolvedIntent.includes('weather')) {
            let found = false; for (let k in presets) { if (lowerQuery.includes(k)) { await fetchLiveWeatherMetrics(presets[k].lat, presets[k].lon, presets[k].name); answer = `Weather indexes updated for ${presets[k].name}. Current state: ${currentTemperatureString}.`; found = true; break; } }
            if (!found) {
                const words = query.split(' '), city = words[words.length - 1].replace(/[^a-zA-Z]/g, ""); if (city.length > 2) {
                    const geoRes = await fetch(`https://allorigins.win{encodeURIComponent(`https://open-meteo.com{city}&count=1`)}`), geoWrap = await geoRes.json(), geoData = JSON.parse(geoWrap.contents); if (geoData.results && geoData.results.length > 0) { const m = geoData.results; await fetchLiveWeatherMetrics(m.latitude, m.longitude, `${m.name}, ${m.country_code ? m.country_code.toUpperCase() : ''}`); answer = `Weather profiles shifted dynamically to match ${m.name}. Currently returning ${currentTemperatureString}.`; } } }
        } else if (lowerQuery.includes('status') || lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
                    const mins = Math.floor((msLeft / 1000) / 60), secs = Math.ceil((msLeft / 1000) % 60);
                    answer = `Hello ${userName}! Telemetry metrics: Timer is ticking at ${mins}:${String(secs).padStart(2, '0')}. Weather in ${currentCityName} is tracking at ${currentTemperatureString}.`;
                }
                outputNode.textContent = answer;
            } catch { outputNode.textContent = "AI link execution dropped. Check connection protocols."; }
            waveNode.classList.remove('speaking');
        }

        const observer = new IntersectionObserver((entries) => { entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)); }, { threshold: 0.15 });
        function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
        document.querySelectorAll('.element-reveal').forEach(el => observer.observe(el));

        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
        document.getElementById('locationDropdown').value = activeLocKey;
        const startCoords = presets[activeLocKey];
        fetchLiveWeatherMetrics(startCoords.lat, startCoords.lon, startCoords.name);
        renderTimerUi();
