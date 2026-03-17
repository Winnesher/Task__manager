const API_BASE = "/api";

const taskForm = document.getElementById("taskForm");
const tasksContainer = document.getElementById("tasksContainer");
const formMessage = document.getElementById("formMessage");

function formatStatusClass(statut) {
  const map = {
    "À venir": "task-card--avenir",
    "En cours": "task-card--encours",
    "Terminée": "task-card--terminee",
  };
  return map[statut] || "";
}

function formatStatusLabel(statut) {
  const map = {
    "À venir": "🔵 À venir",
    "En cours": "🟠 En cours",
    "Terminée": "🟢 Terminée",
  };
  return map[statut] || statut;
}

function showMessage(message, type = "info") {
  formMessage.textContent = message;
  formMessage.style.color = type === "error" ? "#f87171" : "#a3e635";
}

async function fetchTasks() {
  const res = await fetch(`${API_BASE}/get-tasks`);
  if (!res.ok) {
    showMessage("Impossible de charger les tâches.", "error");
    return [];
  }
  return res.json();
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card ${formatStatusClass(task.statut)}`;

  const meta = document.createElement("div");
  meta.className = "task-card__meta";

  const title = document.createElement("h3");
  title.className = "task-card__title";
  title.textContent = task.titre;

  const times = document.createElement("p");
  times.className = "task-card__times";
  times.textContent = `${task.heure_debut} → ${task.heure_fin}`;

  const status = document.createElement("span");
  status.className = "task-card__status";
  status.textContent = formatStatusLabel(task.statut);

  const actions = document.createElement("div");
  actions.className = "task-card__actions";

  // Status change buttons
  const statusSelect = document.createElement("select");
  statusSelect.className = "status-select";
  ["À venir", "En cours", "Terminée"].forEach(stat => {
    const option = document.createElement("option");
    option.value = stat;
    option.textContent = stat;
    if (stat === task.statut) option.selected = true;
    statusSelect.appendChild(option);
  });
  statusSelect.addEventListener("change", () => updateTaskStatus(task.id, statusSelect.value));

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Supprimer";
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  actions.append(statusSelect, deleteBtn);

  meta.append(title, times);
  card.append(meta, status, actions);

  return card;
}

async function displayTasks() {
  tasksContainer.innerHTML = "";
  const tasks = await fetchTasks();
  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Aucune tâche pour le moment. Ajoute-en une !";
    empty.style.opacity = "0.8";
    tasksContainer.appendChild(empty);
    return;
  }

  tasks
    .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
    .forEach((task) => tasksContainer.appendChild(createTaskCard(task)));
}

async function sendToServer(task) {
  const res = await fetch(`${API_BASE}/add-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    // Try to extract a useful error message (JSON or plain text).
    let errorBody = "";
    try {
      const json = await res.json();
      errorBody = json.error || JSON.stringify(json);
    } catch {
      errorBody = await res.text().catch(() => "");
    }

    const message =
      errorBody && errorBody !== ""
        ? `${res.status} ${res.statusText}: ${errorBody}`
        : `${res.status} ${res.statusText}`;

    console.error("API error:", message);
    throw new Error(message);
  }

async function updateTaskStatus(taskId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/update-task/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatus }),
    });

    if (!res.ok) {
      throw new Error("Erreur lors de la mise à jour du statut.");
    }

    await displayTasks();
  } catch (err) {
    showMessage(err.message, "error");
  }
}

async function deleteTask(taskId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;

  try {
    const res = await fetch(`${API_BASE}/delete-task/${taskId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Erreur lors de la suppression de la tâche.");
    }

    await displayTasks();
  } catch (err) {
    showMessage(err.message, "error");
  }
}
  const form = new FormData(taskForm);
  return {
    titre: form.get("titre")?.toString().trim() ?? "",
    heure_debut: form.get("heure_debut")?.toString() ?? "",
    heure_fin: form.get("heure_fin")?.toString() ?? "",
    statut: form.get("statut")?.toString() ?? "À venir",
  };
}

function clearForm() {
  taskForm.reset();
}

async function onSubmit(event) {
  event.preventDefault();
  showMessage("");

  const task = captureInput();

  try {
    await sendToServer(task);
    showMessage("Tâche ajoutée avec succès !", "success");
    clearForm();
    await displayTasks();
  } catch (err) {
    showMessage(err.message, "error");
  }
}

function init() {
  taskForm.addEventListener("submit", onSubmit);
  displayTasks();
}

init();