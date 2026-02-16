const API_URL = "/api";

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

function submitAssistance() {
    const carnet = document.getElementById("carnet").value.trim();
    const date = document.getElementById("date").value;
    const message = document.getElementById("message");

    message.textContent = "";
    message.className = "";

    if (!carnet || !date) {
        message.textContent = "Ingrese carnet y fecha";
        message.className = "error";
        return;
    }

    fetch(
        `${API_URL}/assistance/${carnet}?date=${date}&assistance=true`,
        { method: "POST" }
    )
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(() => {
        message.textContent = "Asistencia registrada ✔";
        message.className = "success";
        document.getElementById("carnet").value = "";
    })
    .catch(() => {
        message.textContent = "Error al registrar asistencia";
        message.className = "error";
    });
}