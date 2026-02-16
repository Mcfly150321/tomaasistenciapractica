const API_URL = "/api";
let html5QrCode = null;
let isProcessing = false;

// Audio Context se crea globalmente pero se activa tras la primera interacción
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine"; // Sonido limpio
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // La (A5) - Pitido claro

    // Envolvente de volumen (evita el "clic")
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
}

async function startScanner() {
    if (html5QrCode) return;
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    document.getElementById("btnStartScanner").style.display = "none";
    document.getElementById("btnStopScanner").style.display = "block";

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess
        );
    } catch (err) {
        console.error("No se pudo iniciar la cámara", err);
        document.getElementById("message").textContent = "Error: No se puede acceder a la cámara";
        document.getElementById("message").className = "error";
        stopScannerExplicit();
    }
}

async function stopScannerExplicit() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch (e) {
            console.warn("Error al detener scanner", e);
        }
        html5QrCode = null;
    }
    document.getElementById("btnStartScanner").style.display = "block";
    document.getElementById("btnStopScanner").style.display = "none";
}

async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    // PITIDO SINTETIZADO (Instantáneo, sin latencia de archivo)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playBeep();

    // DETENER SCANNER INMEDIATAMENTE para evitar múltiples peticiones
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode = null;
        } catch (e) { console.error(e); }
    }

    // Ejecutar envío
    submitAssistance(decodedText).then((data) => {
        if (data) {
            // Mostrar overlay de éxito
            document.getElementById("scanResultName").textContent = data.student_name;
            document.getElementById("successOverlay").classList.add("active");
        } else {
            // Si falló el envío por alguna validación, permitimos resetear
            isProcessing = false;
            startScanner(); // Reiniciamos si fue un error de "no pertenece al plan"
        }
    }).catch(() => {
        isProcessing = false;
        startScanner();
    });
}

function resetForNext() {
    document.getElementById("successOverlay").classList.remove("active");
    document.getElementById("message").textContent = "";
    isProcessing = false;
    startScanner(); // Abre la cámara para el siguiente
}

function initAssistance() {
    const plan = document.getElementById("plan").value;
    const date = document.getElementById("date").value;
    const initMessage = document.getElementById("initMessage");
    const markingSection = document.getElementById("markingSection");

    if (!plan || !date) {
        initMessage.textContent = "Seleccione plan y fecha";
        initMessage.className = "error";
        return;
    }

    fetch(`${API_URL}/assistance/init?plan=${plan}&date=${date}`, { method: "POST" })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error backend"); });
            return res.json();
        })
        .then(data => {
            initMessage.textContent = "✔ " + data.message;
            initMessage.className = "success";
            
            document.getElementById("plan").disabled = true;
            document.getElementById("date").disabled = true;
            document.getElementById("btnInit").disabled = true;
            document.getElementById("btnStartScanner").disabled = false;
        })
        .catch(err => {
            initMessage.textContent = err.message;
            initMessage.className = "error";
        });
}

/**
 * @param {string} identifier - El hash del QR
 */
function submitAssistance(identifier) {
    const date = document.getElementById("date").value;
    const message = document.getElementById("message");

    message.textContent = "Registrando...";
    message.className = "";

    return fetch(
        `${API_URL}/assistance/${identifier}?date=${date}`,
        { method: "POST" }
    )
    .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error"); });
        return res.json();
    })
    .then((data) => {
        message.textContent = `Asistencia: ${data.student_name} ✔`;
        message.className = "success";
        return data;
    })
    .catch(err => {
        message.textContent = err.message;
        message.className = "error";
        return null;
    });
}

function loadStudents() {
    const plan = document.getElementById("plan").value;
    const list = document.getElementById("studentList");
    if (!list) return;
    list.innerHTML = "";

    if (!plan) return;

    fetch(`${API_URL}/students/?plan=${plan}`)
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