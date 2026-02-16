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
    // Frecuencia más aguda (~1050Hz - Do6 aproximadamente)
    oscillator.frequency.setValueAtTime(1046.50, audioCtx_Scanner.currentTime); 

    // Envolvente de volumen mejorada (ataque suave, sustain corto, fade-out largo)
    gainNode.gain.setValueAtTime(0, audioCtx_Scanner.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx_Scanner.currentTime + 0.02); // Ataque
    gainNode.gain.linearRampToValueAtTime(0.10, audioCtx_Scanner.currentTime + 0.15); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx_Scanner.currentTime + 0.5); // Fade-out más largo

    oscillator.start();
    oscillator.stop(audioCtx_Scanner.currentTime + 0.55);
}

async function startScannerAsistencia() {
    if (html5QrCode_Asistencia) return;
    
    html5QrCode_Asistencia = new Html5Qrcode("reader-scanner");
    
    // Función para calcular un cuadro de escaneo siempre cuadrado y responsivo
    const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        let minEdgeContext = Math.min(viewfinderWidth, viewfinderHeight);
        let qrboxSize = Math.floor(minEdgeContext * 0.7);
        return {
            width: qrboxSize,
            height: qrboxSize
        };
    };

    const config = { 
        fps: 20, 
        qrbox: qrboxFunction,
        aspectRatio: 1.0 // Fuerza que el visor sea cuadrado
    };

    document.getElementById("btnStartScanner-scanner").style.display = "none";
    document.getElementById("btnStopScanner-scanner").style.display = "block";

    try {
        await html5QrCode_Asistencia.start(
            { facingMode: "environment" },
            config,
            onScanSuccessAsistencia
        );
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
        try {
            await html5QrCode_Asistencia.stop();
        } catch (e) {
            console.warn("Error al detener scanner", e);
        }
        html5QrCode_Asistencia = null;
    }
    document.getElementById("btnStartScanner-scanner").style.display = "block";
    document.getElementById("btnStopScanner-scanner").style.display = "none";
}

async function onScanSuccessAsistencia(decodedText) {
    if (isProcessing_Asistencia) return;
    isProcessing_Asistencia = true;

    // PITIDO SINTETIZADO MEJORADO
    if (audioCtx_Scanner.state === 'suspended') audioCtx_Scanner.resume();
    playBeepScanner();

    // PEQUEÑO DELAY (0.5s) para que el usuario sienta el "lock" del escáner
    setTimeout(async () => {
        // DETENER SCANNER
        if (html5QrCode_Asistencia) {
            try {
                await html5QrCode_Asistencia.stop();
                html5QrCode_Asistencia = null;
            } catch (e) { console.error(e); }
        }

        // Ejecutar envío
        submitAssistanceScanner(decodedText).then((data) => {
            if (data) {
                // Mostrar overlay de éxito
                document.getElementById("scanResultName-scanner").textContent = data.student_name;
                document.getElementById("successOverlay-scanner").classList.add("active");
            } else {
                // Si falló, permitimos reintentar
                isProcessing_Asistencia = false;
                startScannerAsistencia();
            }
        }).catch(() => {
            isProcessing_Asistencia = false;
            startScannerAsistencia();
        });
    }, 500); // El medio segundo de delay solicitado
}

function resetForNextScanner() {
    document.getElementById("successOverlay-scanner").classList.remove("active");
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
    .then((data) => {
        message.textContent = `Asistencia: ${data.student_name} ✔`;
        message.className = "success-scanner";
        return data;
    })
    .catch(err => {
        message.textContent = err.message;
        message.className = "error-scanner";
        return null;
    });
}

function loadStudentsScanner() {
    const plan = document.getElementById("plan-scanner").value;
    const list = document.getElementById("studentList-scanner");
    if (!list) return;
    list.innerHTML = "";

    if (!plan) return;

    fetch(`${API_URL_SCANNER}/students/?plan=${plan}`)
        .then(res => {
            if (!res.ok) throw new Error("Error backend");
            return res.json();
        })
        .then(data => {
            if (data.length === 0) {
                list.innerHTML = "<li>No hay alumnas</li>";
                return;
            }

            data.forEach(student => {
                const li = document.createElement("li");
                li.innerHTML = `<span>${student.names} ${student.lastnames}</span> <small>${student.carnet}</small>`;
                list.appendChild(li);
            });
        })
        .catch(err => {
            console.error(err);
            list.innerHTML = "<li>Error al cargar alumnas</li>";
        });
}