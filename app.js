const API_URL = "/api";
let html5QrCode = null;
let isScanned = false;

async function startScanner() {
    if (html5QrCode) return;
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

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
    }
}

function onScanSuccess(decodedText) {
    if (isScanned) return;
    isScanned = true;

    // Colocar el hash en el input (opcional visualmente)
    document.getElementById("carnet").value = decodedText;
    
    // Mostrar overlay de éxito
    const overlay = document.getElementById("successOverlay");
    overlay.classList.add("active");

    // Ejecutar envío
    submitAssistance(decodedText).finally(() => {
        // Reiniciar para el siguiente después de un breve delay
        setTimeout(() => {
            overlay.classList.remove("active");
            document.getElementById("carnet").value = "";
            isScanned = false;
        }, 1500);
    });
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
            markingSection.style.display = "block";
            
            document.getElementById("plan").disabled = true;
            document.getElementById("date").disabled = true;
            document.getElementById("btnInit").disabled = true;

            // Iniciar escáner
            startScanner();
        })
        .catch(err => {
            initMessage.textContent = err.message;
            initMessage.className = "error";
        });
}

function handleEnter(event) {
    if (event.key === "Enter") submitAssistance();
}

/**
 * @param {string} hash - Opcional, si viene del scanner
 */
function submitAssistance(hash = null) {
    const identifier = hash || document.getElementById("carnet").value.trim();
    const date = document.getElementById("date").value;
    const message = document.getElementById("message");

    if (!identifier) return Promise.resolve();

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
        if (!hash) document.getElementById("carnet").value = "";
    })
    .catch(err => {
        message.textContent = err.message;
        message.className = "error";
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
                li.textContent = `${student.names} ${student.lastnames} — ${student.carnet}`;
                list.appendChild(li);
            });
        })
        .catch(err => {
            console.error(err);
            list.innerHTML = "<li>Error al cargar alumnas</li>";
        });
}