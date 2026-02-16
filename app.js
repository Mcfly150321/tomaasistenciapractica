const API_URL = "/api";

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
            // Bloqueamos selectores para consistencia en la sesión
            document.getElementById("plan").disabled = true;
            document.getElementById("date").disabled = true;
        })
        .catch(err => {
            initMessage.textContent = err.message;
            initMessage.className = "error";
        });
}

function handleEnter(event) {
    if (event.key === "Enter") submitAssistance();
}

function submitAssistance() {
    const carnet = document.getElementById("carnet").value.trim();
    const date = document.getElementById("date").value;
    const message = document.getElementById("message");

    message.textContent = "";
    message.className = "";

    if (!carnet) return;

    fetch(
        `${API_URL}/assistance/${carnet}?date=${date}`,
        { method: "POST" }
    )
    .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error"); });
        return res.json();
    })
    .then(() => {
        message.textContent = `Carnet ${carnet} marcado ✔`;
        message.className = "success";
        document.getElementById("carnet").value = "";
    })
    .catch(err => {
        message.textContent = err.message;
        message.className = "error";
    });
}

function loadStudents() {
    const plan = document.getElementById("plan").value;
    const list = document.getElementById("studentList");
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