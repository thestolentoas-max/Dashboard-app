// --- STATE & PERSISTENT STORAGE MEMORY ---
let userName = localStorage.getItem('db-name') || "Alex";
let isAnalogClockMode = localStorage.getItem('db-clock-mode') === "analog";
let activeAmbientMotionStyle = localStorage.getItem('db-ambient-motion') || "float";
let currentSelectedLiquidTheme = localStorage.getItem('db-liquid-theme') || "orange";
let myMicroGoalsList = JSON.parse(localStorage.getItem('db-micro-goals')) || [];

let totalMs = 300000, msLeft = 300000, isTimerRunning = false, isSettingUp = false;
let intervalId = null, lastTimestamp = 0;
let lastRecordedHour = -1;

// --- WEB AUDIO CONTROLLERS ---
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

// --- DYNAMIC BACKGROUND CONTROL LOGIC MATRICES ---
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
// --- MICRO GOALS CHECKLIST PANEL LOGIC ---
function renderMicroGoalsChecklist() {
    const container = document.getElementById('checklistItemsContainer'); if (!container) return;
    container.innerHTML = "";
    myMicroGoalsList.forEach((goal, index) => {
        const row = document.createElement('div'); row.className = "goal-item-row";
        const leftBlock = document.createElement('div'); leftBlock.className = `goal-left-block ${goal.complete ? 'complete' : ''}`;
        const checkbox = document.createElement('input'); checkbox.type = "checkbox"; checkbox.checked = goal.complete; checkbox.onclick = () => toggleGoalItemStatus(index);
        const textSpan = document.createElement('span'); textSpan.textContent = goal.text;
        leftBlock.appendChild(checkbox); leftBlock.appendChild(textSpan);
        const delBtn = document.createElement('button'); delBtn.className = "goal-delete-btn"; delBtn.textContent = "🗑️"; delBtn.onclick = () => removeMicroGoalItem(index);
        row.appendChild(leftBlock); row.appendChild(delBtn); container.appendChild(row);
    });
}
function addMicroGoalItem() {
    const node = document.getElementById('goalTextInput'), val = node.value.trim(); if (!val) return;
    myMicroGoalsList.push({ text: val, complete: false }); localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList));
    node.value = ""; renderMicroGoalsChecklist();
}
function handleGoalInputKey(e) { if (e.key === 'Enter') addMicroGoalItem(); }
function toggleGoalItemStatus(index) { myMicroGoalsList[index].complete = !myMicroGoalsList[index].complete; localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList)); renderMicroGoalsChecklist(); }
function removeMicroGoalItem(index) { myMicroGoalsList.splice(index, 1); localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList)); renderMicroGoalsChecklist(); }

// --- TIMER MECHANICAL LIFECYCLE ENGINE ---
function runTimerLoop() {
    if (!isTimerRunning) return;
    const now = performance.now(); msLeft -= (now - lastTimestamp); lastTimestamp = now;
    if (msLeft <= 0) {
        msLeft = 0; isTimerRunning = false; clearInterval(intervalId); intervalId = null;
        document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active');
        triggerDefaultChimeAlarm();
    }
    renderTimerUi();
}
function renderTimerUi() {
    const totalSecs = Math.ceil(msLeft / 1000);
    document.getElementById('countdownDisplay').textContent = `${String(Math.floor(totalSecs / 60)).padStart(2, '0')}:${String(totalSecs % 60).padStart(2, '0')}`;
    const fillNode = document.getElementById('liquidFill'); if (fillNode) { fillNode.style.top = `${(1 - (msLeft / totalMs)) * 100}%`; if (msLeft < 30000 && msLeft > 0) { fillNode.classList.add('timer-critical'); } else { fillNode.classList.remove('timer-critical'); } }
}
function triggerDefaultChimeAlarm() {
    try {
        initAudioCtx(); const tonesList = [523.25, 659.25, 783.99];
        tonesList.forEach((frequency) => {
            const osc = audioCtx.createOscillator(), gainNode = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
            osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 1.2);
        });
        if (document.hidden && Notification.permission === "granted") new Notification("Timer Finished!");
    } catch (e) {}
}
function toggleTimer() { if (isSettingUp) saveTimerSettings(); const btn = document.getElementById('pauseBtn'); if (isTimerRunning) { isTimerRunning = false; clearInterval(intervalId); btn.textContent = "Start"; btn.classList.remove('active'); } else { isTimerRunning = true; lastTimestamp = performance.now(); intervalId = setInterval(runTimerLoop, 50); btn.textContent = "Pause"; btn.classList.add('active'); } }
function cancelTimer() { isTimerRunning = false; if (intervalId) clearInterval(intervalId); msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); document.getElementById('pauseBtn').textContent = "Start"; document.getElementById('pauseBtn').classList.remove('active'); renderTimerUi(); }
function openTimerSettings() { if (isTimerRunning) return; isSettingUp = true; document.getElementById('countdownDisplay').classList.add('hidden'); document.getElementById('timerInputOverlay').classList.remove('hidden'); const totalSecs = totalMs / 1000; document.getElementById('inputMinutes').value = String(Math.floor(totalSecs / 60)).padStart(2, '0'); document.getElementById('inputSeconds').value = String(totalSecs % 60).padStart(2, '0'); }
function saveTimerSettings() { totalMs = ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60 + Math.min(59, parseInt(document.getElementById('inputSeconds').value) || 0)) * 1000; msLeft = totalMs; isSettingUp = false; document.getElementById('timerInputOverlay').classList.add('hidden'); document.getElementById('countdownDisplay').classList.remove('hidden'); renderTimerUi(); }
function handleTimerInputKey(e) { if (e.key === 'Enter') saveTimerSettings(); }
function loadTimerPreset(mins) { if (isTimerRunning) return; totalMs = mins * 60 * 1000; msLeft = totalMs; renderTimerUi(); }

// --- LIQUID FILL THEME CUSTOMIZER ---
function switchActiveThemeColor(color) {
    currentSelectedLiquidTheme = color;
    localStorage.setItem('db-liquid-theme', color);
    document.body.classList.remove('liquid-orange', 'liquid-mint', 'liquid-cyan', 'liquid-magenta');
    document.body.classList.add(`liquid-${color}`);
    document.querySelectorAll('.theme-dot').forEach(dot => { dot.classList.toggle('active', dot.classList.contains(color)); });
    generateNativeAppleTouchIcon(color);
}

// --- DYNAMIC PNG APPLE APP ICON GENERATION PLATFORM ---
function generateNativeAppleTouchIcon(colorThemeName) {
    try {
        const canv = document.createElement('canvas');
        canv.width = 180; canv.height = 180;
        const ctx = canv.getContext('2d');
        
        // Base dark matte layer background
        ctx.fillStyle = '#050206'; ctx.fillRect(0, 0, 180, 180);
        
        // Dynamic fluid highlight mapping configurations
        let accentHex = '#ff6f00';
        if (colorThemeName === 'mint') accentHex = '#107c41';
        else if (colorThemeName === 'cyan') accentHex = '#0078d4';
        else if (colorThemeName === 'magenta') accentHex = '#b4009e';
        
        ctx.shadowColor = accentHex; ctx.shadowBlur = 15;
        ctx.strokeStyle = accentHex; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(90, 90, 50, 0, Math.PI * 2); ctx.stroke();
        
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(65, 95); ctx.bezierCurveTo(75, 75, 85, 75, 95, 95); ctx.bezierCurveTo(105, 115, 115, 115, 125, 95);
        ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        
        const link = document.getElementById('apple-icon');
        if (link) link.href = canv.toDataURL('image/png');
    } catch(e) {}
}

// --- BOOTSTRAP INITIALIZATION BOOT ---
const observer = new IntersectionObserver((entries) => { entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)); }, { threshold: 0.15 });
function scrollToSection(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
document.querySelectorAll('.element-reveal').forEach(el => observer.observe(el));

if (window.Notification && Notification.permission === "default") Notification.requestPermission();

// Boot application operations sequentially
updateClockMechanics();
switchActiveThemeColor(currentSelectedLiquidTheme);
switchAmbientMotionStyle(activeAmbientMotionStyle);
syncClockFaceDisplay();
renderMicroGoalsChecklist();
renderTimerUi();
