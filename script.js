// --- STATE & PERSISTENT MEMORY MODULES ---
let userName = localStorage.getItem('db-name') || "Alex";
let currentTheme = localStorage.getItem('db-theme-color') || "orange";
let myMicroGoalsList = JSON.parse(localStorage.getItem('db-micro-goals')) || [];

let totalMs = 300000, msLeft = 300000, isTimerRunning = false, isSettingUp = false;
let intervalId = null, lastTimestamp = 0;

// --- DYNAMIC WEB AUDIO ENVIRONMENT ENGINE ---
let audioCtx = null, ambientNodes = {};

function initAudioContextInstance() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function generateProceduralWhiteNoiseNode() {
    initAudioContextInstance();
    const bufferSize = audioCtx.sampleRate * 2, buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    const noise = audioCtx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    return noise;
}

function toggleAmbientSound(type, targetVolume) {
    try {
        initAudioContextInstance();
        if (ambientNodes[type]) {
            ambientNodes[type].source.stop();
            ambientNodes[type].gain.disconnect();
            delete ambientNodes[type];
            document.getElementById(`sound-${type}`).classList.remove('active');
            return;
        }
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime);
        gainNode.connect(audioCtx.destination);
        
        let sourceNode = generateProceduralWhiteNoiseNode();
        const filter = audioCtx.createBiquadFilter();
        
        // Custom sound frequency filter curves
        if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.setValueAtTime(450, audioCtx.currentTime); }
        else if (type === 'fire') { filter.type = 'bandpass'; filter.frequency.setValueAtTime(1000, audioCtx.currentTime); filter.Q.setValueAtTime(2.5, audioCtx.currentTime); }
        else { filter.type = 'lowpass'; filter.frequency.setValueAtTime(1200, audioCtx.currentTime); }
        
        sourceNode.connect(filter); filter.connect(gainNode);
        sourceNode.start();
        
        ambientNodes[type] = { source: sourceNode, gain: gainNode };
        document.getElementById(`sound-${type}`).classList.add('active');
    } catch (e) { console.warn("Audio interaction delayed: ", e); }
}

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

function toggleFocusMode() {
    const wrapper = document.querySelector('.dashboard-wrapper');
    wrapper.classList.toggle('focus-active');
    const isFocus = wrapper.classList.contains('focus-active');
    document.querySelector('.focus-mode-toggle-btn').textContent = isFocus ? "👁️ Exit Focus" : "👁️ Focus Mode";
}
// --- FEATURE 5: DAILY TASK MICRO-GOALS CHECKLIST SYSTEM ---
function renderMicroGoalsChecklist() {
    const container = document.getElementById('checklistItemsContainer');
    if (!container) return;
    container.innerHTML = "";
    myMicroGoalsList.forEach((goal, index) => {
        const row = document.createElement('div');
        row.className = "goal-item-row";
        
        const leftBlock = document.createElement('div');
        leftBlock.className = `goal-left-block ${goal.complete ? 'complete' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = goal.complete;
        checkbox.onclick = () => toggleGoalItemStatus(index);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = goal.text;
        
        leftBlock.appendChild(checkbox);
        leftBlock.appendChild(textSpan);
        
        const delBtn = document.createElement('button');
        delBtn.className = "goal-delete-btn";
        delBtn.textContent = "🗑️";
        delBtn.onclick = () => removeMicroGoalItem(index);
        
        row.appendChild(leftBlock);
        row.appendChild(delBtn);
        container.appendChild(row);
    });
}

function addMicroGoalItem() {
    const node = document.getElementById('goalTextInput'), val = node.value.trim();
    if (!val) return;
    myMicroGoalsList.push({ text: val, complete: false });
    localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList));
    node.value = ""; renderMicroGoalsChecklist();
}
function handleGoalInputKey(e) { if (e.key === 'Enter') addMicroGoalItem(); }
function toggleGoalItemStatus(index) { myMicroGoalsList[index].complete = !myMicroGoalsList[index].complete; localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList)); renderMicroGoalsChecklist(); }
function removeMicroGoalItem(index) { myMicroGoalsList.splice(index, 1); localStorage.setItem('db-micro-goals', JSON.stringify(myMicroGoalsList)); renderMicroGoalsChecklist(); }

// --- ACCURATE COUNTDOWN TIMERS ENGINE ---
function runTimerLoop() {
    if (!isTimerRunning) return;
    const now = performance.now();
    msLeft -= (now - lastTimestamp); lastTimestamp = now;
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
    const fillNode = document.getElementById('liquidFill');
    fillNode.style.top = `${(1 - (msLeft / totalMs)) * 100}%`;
    if (msLeft < 30000 && msLeft > 0) { fillNode.classList.add('timer-critical'); } else { fillNode.classList.remove('timer-critical'); }
}

function triggerDefaultChimeAlarm() {
    try {
        initAudioContextInstance();
        const tonesList = [523.25, 659.25, 783.99];
        tonesList.forEach((frequency) => {
            const osc = audioCtx.createOscillator(), gainNode = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
            osc.connect(gainNode); gainNode.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 1.2);
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

function switchActiveThemeColor(color) {
    document.body.className = `theme-${color}`;
    localStorage.setItem('db-theme-color', color);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.classList.toggle('active', dot.classList.contains(color));
    });
}

// --- PANEL REVEALS ---
const observer = new IntersectionObserver((entries) => { entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)); }, { threshold: 0.15 });
function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
document.querySelectorAll('.element-reveal').forEach(el => observer.observe(el));

if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
switchActiveThemeColor(currentTheme);
renderMicroGoalsChecklist();
renderTimerUi();
