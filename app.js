const API_URL_SCANNER = "/api";
let html5QrCode_Asistencia = null;
let isProcessing_Asistencia = false;

// Audio Context se crea globalmente pero se activa tras la primera interacción
const audioCtx_Scanner = new (window.AudioContext || window.webkitAudioContext)();

function playBeepScanner() {
    const oscillator = audioCtx_Scanner.createOscillator();
    const gainNode = audioCtx_Scanner.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx_Scanner.destination);
    oscillator.type = "sine"; 
    oscillator.frequency.setValueAtTime(1046.50, audioCtx_Scanner.currentTime); 
    gainNode.gain.setValueAtTime(0, audioCtx_Scanner.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx_Scanner.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.10, audioCtx_Scanner.currentTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx_Scanner.currentTime + 0.5);
    oscillator.start();
    oscillator.stop(audioCtx_Scanner.currentTime + 0.55);
}

function playErrorBeepScanner() {
    const oscillator = audioCtx_Scanner.createOscillator();
    const gainNode = audioCtx_Scanner.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx_Scanner.destination);
    
    oscillator.type = "sawtooth"; // Sonido más áspero para error
    oscillator.frequency.setValueAtTime(220, audioCtx_Scanner.currentTime); // Más grave
    
    gainNode.gain.setValueAtTime(0, audioCtx_Scanner.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx_Scanner.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx_Scanner.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx_Scanner.currentTime + 0.6);

    oscillator.start();
    oscillator.stop(audioCtx_Scanner.currentTime + 0.65);
}

async function startScannerAsistencia() {
    if (html5QrCode_Asistencia) return;
    
    html5QrCode_Asistencia = new Html5Qrcode("reader-scanner");
    const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        let minEdgeContext = Math.min(viewfinderWidth, viewfinderHeight);
        let qrboxSize = Math.floor(minEdgeContext * 0.7);
        return { width: qrboxSize, height: qrboxSize };
    };

    const config = { 
        fps: 20, 
        qrbox: qrboxFunction,
        aspectRatio: 1.0 
    };

    document.getElementById("btnStartScanner-scanner").style.display = "none";
    document.getElementById("btnStopScanner-scanner").style.display = "block";

    try {
        await html5QrCode_Asistencia.start({ facingMode: "environment" }, config, onScanSuccessAsistencia);
    } catch (err) {
        console.error("No se pudo iniciar la cámara", err);
        const msg = document.getElementById("message-scanner");
        msg.textContent = "Error: No se puede acceder a la cámara";
        msg.className = "error-scanner";
        stopScannerExplicitScanner();
    }
}

async function stopScannerExplicitScanner() {
    if (html5QrCode_Asistencia) {
        try { await html5QrCode_Asistencia.stop(); } catch (e) { console.warn(e); }
        html5QrCode_Asistencia = null;
    }
    document.getElementById("btnStartScanner-scanner").style.display = "block";
    document.getElementById("btnStopScanner-scanner").style.display = "none";
}

async function onScanSuccessAsistencia(decodedText) {
    if (isProcessing_Asistencia) return;
    isProcessing_Asistencia = true;

    // RESUMIR CONTEXTO DE AUDIO (necesario en algunos navegadores)
    if (audioCtx_Scanner.state === 'suspended') audioCtx_Scanner.resume();

    // DETENER SCANNER INMEDIATAMENTE (BLOQUEO TOTAL)
    // Lo hacemos antes que cualquier otra cosa para garantizar que solo se envíe una petición
    if (html5QrCode_Asistencia) {
        try {
            await html5QrCode_Asistencia.stop();
            html5QrCode_Asistencia = null;
        } catch (e) { console.error(e); }
    }

    // Pequeño delay visual para que el usuario sienta la captura
    setTimeout(() => {
        submitAssistanceScanner(decodedText).then((data) => {
            if (data) {
                playBeepScanner();
                showResultUI(true, data.student_name);
            } else {
                playErrorBeepScanner();
                showResultUI(false, "QR Inválido o Alumna no encontrada");
            }
        }).catch((err) => {
            playErrorBeepScanner();
            showResultUI(false, err.message || "Error de conexión");
        });
    }, 300);
}

function showResultUI(isSuccess, studentName) {
    const overlay = document.getElementById("resultOverlay-scanner");
    const successCircle = document.getElementById("successCircle-scanner");
    const errorCircle = document.getElementById("errorCircle-scanner");
    const resultName = document.getElementById("scanResultName-scanner");
    const btnNext = document.getElementById("btnNext-scanner");

    resultName.textContent = studentName;
    overlay.classList.add("active");

    if (isSuccess) {
        successCircle.style.display = "flex";
        errorCircle.style.display = "none";
        resultName.className = "result-name-scanner success-text-scanner";
        btnNext.textContent = "Siguiente Alumna";
        btnNext.className = "next-btn-scanner btn-success-scanner";
    } else {
        successCircle.style.display = "none";
        errorCircle.style.display = "flex";
        resultName.className = "result-name-scanner error-text-scanner";
        btnNext.textContent = "Reintentar";
        btnNext.className = "next-btn-scanner btn-error-scanner";
    }
}

function resetForNextScanner() {
    document.getElementById("resultOverlay-scanner").classList.remove("active");
    document.getElementById("message-scanner").textContent = "";
    isProcessing_Asistencia = false;
    startScannerAsistencia(); 
}

function initAssistanceScanner() {
    const plan = document.getElementById("plan-scanner").value;
    const date = document.getElementById("date-scanner").value;
    const initMessage = document.getElementById("initMessage-scanner");

    if (!plan || !date) {
        initMessage.textContent = "Seleccione plan y fecha";
        initMessage.className = "error-scanner";
        return;
    }

    fetch(`${API_URL_SCANNER}/assistance/init?plan=${plan}&date=${date}`, { method: "POST" })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error backend"); });
            return res.json();
        })
        .then(data => {
            initMessage.textContent = "✔ " + data.message;
            initMessage.className = "success-scanner";
            document.getElementById("plan-scanner").disabled = true;
            document.getElementById("date-scanner").disabled = true;
            document.getElementById("btnInit-scanner").disabled = true;
            document.getElementById("btnStartScanner-scanner").disabled = false;
        })
        .catch(err => {
            initMessage.textContent = err.message;
            initMessage.className = "error-scanner";
        });
}

function submitAssistanceScanner(identifier) {
    const date = document.getElementById("date-scanner").value;
    const message = document.getElementById("message-scanner");

    message.textContent = "Registrando...";
    message.className = "";

    return fetch(
        `${API_URL_SCANNER}/assistance/${identifier}?date=${date}`,
        { method: "POST" }
    )
    .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error"); });
        return res.json();
    })
    .catch(err => {
        throw err;
    });
}

function loadStudentsScanner() {
    const plan = document.getElementById("plan-scanner").value;
    const list = document.getElementById("studentList-scanner");
    if (!list) return;
    list.innerHTML = "";
    if (!plan) return;

    fetch(`${API_URL_SCANNER}/students/?plan=${plan}`)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) { list.innerHTML = "<li>No hay alumnas</li>"; return; }
            data.forEach(student => {
                const li = document.createElement("li");
                li.innerHTML = `<span>${student.names} ${student.lastnames}</span> <small>${student.carnet}</small>`;
                list.appendChild(li);
            });
        })
        .catch(err => { list.innerHTML = "<li>Error al cargar alumnas</li>"; });
}