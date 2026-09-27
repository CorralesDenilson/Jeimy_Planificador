const STORAGE_KEY = "yansy_planificador_actividades_v1";

const calendar = document.getElementById("calendar");
const periodTitle = document.getElementById("periodTitle");
const status = document.getElementById("status");

const modal = document.getElementById("modal");
const form = document.getElementById("activityForm");
const modalTitle = document.getElementById("modalTitle");

const activityId = document.getElementById("activityId");
const activityTitle = document.getElementById("activityTitle");
const activityDate = document.getElementById("activityDate");
const activityTime = document.getElementById("activityTime");
const activityNote = document.getElementById("activityNote");

let currentView = "week";
let currentDate = new Date();
let editingId = null;
let activities = loadActivities();

function loadActivities() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const data = JSON.parse(saved);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveActivities() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function monthName(date) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function dayName(date) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short"
  }).format(date).replace(".", "");
}

function fullDate(date) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function escapeHTML(value = "") {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function isToday(value) {
  return value === formatDate(new Date());
}

function render() {
  if (currentView === "week") {
    renderWeek();
  } else {
    renderMonth();
  }
}

function renderWeek() {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  periodTitle.textContent =
    `${days[0].getDate()} – ${days[6].getDate()} de ` +
    new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(days[6]);

  calendar.innerHTML = `
    <div class="week-grid">
      ${days.map(day => {
        const date = formatDate(day);
        const dayActivities = activities
          .filter(item => item.date === date)
          .sort((a, b) => a.time.localeCompare(b.time));

        return `
          <div class="day-column">
            <div class="day-head">
              <div>
                <div class="day-name">${dayName(day)}</div>
                <div class="day-number">${day.getDate()}</div>
              </div>
              <button class="add-btn" data-add="${date}" title="Agregar actividad">+</button>
            </div>

            ${
              dayActivities.length
                ? dayActivities.map(activityTemplate).join("")
                : `<div class="empty">Sin actividades</div>`
            }
          </div>
        `;
      }).join("")}
    </div>
  `;

  status.textContent = `${activities.length} actividad${activities.length === 1 ? "" : "es"} guardada${activities.length === 1 ? "" : "s"} en total.`;
  bindCalendarEvents();
}

function activityTemplate(item) {
  return `
    <article class="task ${item.done ? "done" : ""}">
      <div class="task-time">${escapeHTML(item.time)}</div>
      <div class="task-title">${escapeHTML(item.title)}</div>
      ${item.note ? `<div class="task-note">${escapeHTML(item.note)}</div>` : ""}
      <div class="task-actions">
        <button class="task-action" data-toggle="${item.id}">
          ${item.done ? "↩ Pendiente" : "✓ Completar"}
        </button>
        <button class="task-action" data-edit="${item.id}">✏️ Editar</button>
        <button class="task-action delete" data-delete="${item.id}">🗑</button>
      </div>
    </article>
  `;
}

function renderMonth() {
  periodTitle.textContent = monthName(currentDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstMonday = startOfWeek(firstDay);

  const labels = ["L", "M", "X", "J", "V", "S", "D"];

  let html = `<div class="month-grid">`;
  html += labels.map(label => `<div class="month-label">${label}</div>`).join("");

  for (let i = 0; i < 42; i++) {
    const day = addDays(firstMonday, i);
    const date = formatDate(day);
    const otherMonth = day.getMonth() !== month;
    const todayClass = isToday(date) ? "today" : "";

    const dayActivities = activities
      .filter(item => item.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));

    html += `
      <div class="month-day ${otherMonth ? "other-month" : ""} ${todayClass}">
        <div class="month-number">${day.getDate()}</div>
        ${dayActivities.slice(0, 4).map(item => `
          <button class="month-task ${item.done ? "done" : ""}"
                  data-edit="${item.id}"
                  title="Abrir actividad">
            ${escapeHTML(item.time)} · ${escapeHTML(item.title)}
          </button>
        `).join("")}
        ${dayActivities.length > 4 ? `<div class="task-note">+${dayActivities.length - 4} más</div>` : ""}
        <button class="add-btn" data-add="${date}" title="Agregar actividad" style="margin-top:6px;">+</button>
      </div>
    `;
  }

  html += `</div>`;
  calendar.innerHTML = html;

  status.textContent = `${activities.length} actividad${activities.length === 1 ? "" : "es"} guardada${activities.length === 1 ? "" : "s"} en total.`;
  bindCalendarEvents();
}

function bindCalendarEvents() {
  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => openModal(button.dataset.add));
  });

  document.querySelectorAll("[data-toggle]").forEach(button => {
    button.addEventListener("click", () => toggleActivity(button.dataset.toggle));
  });

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => editActivity(button.dataset.edit));
  });

  document.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteActivity(button.dataset.delete));
  });
}

function openModal(date = formatDate(new Date()), id = null) {
  editingId = id;
  modal.classList.remove("hidden");

  if (id) {
    const item = activities.find(activity => String(activity.id) === String(id));
    if (!item) return;

    modalTitle.textContent = "Editar actividad";
    activityId.value = item.id;
    activityTitle.value = item.title;
    activityDate.value = item.date;
    activityTime.value = item.time;
    activityNote.value = item.note || "";
  } else {
    modalTitle.textContent = "Agregar actividad";
    form.reset();
    activityId.value = "";
    activityDate.value = date;
    activityTime.value = "09:00";
  }

  activityTitle.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  form.reset();
  editingId = null;
}

function editActivity(id) {
  openModal("", id);
}

function toggleActivity(id) {
  const item = activities.find(activity => String(activity.id) === String(id));
  if (!item) return;

  item.done = !item.done;
  saveActivities();
  render();
}

function deleteActivity(id) {
  const item = activities.find(activity => String(activity.id) === String(id));
  if (!item) return;

  const confirmed = confirm(`¿Eliminar "${item.title}"?`);
  if (!confirmed) return;

  activities = activities.filter(activity => String(activity.id) !== String(id));
  saveActivities();
  render();
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = activityTitle.value.trim();
  const date = activityDate.value;
  const time = activityTime.value;
  const note = activityNote.value.trim();

  if (!title || !date || !time) return;

  if (editingId) {
    const item = activities.find(activity => String(activity.id) === String(editingId));
    if (item) {
      item.title = title;
      item.date = date;
      item.time = time;
      item.note = note;
    }
    showStatus("Actividad actualizada.");
  } else {
    activities.push({
      id: Date.now(),
      title,
      date,
      time,
      note,
      done: false
    });
    showStatus("Actividad guardada.");
  }

  saveActivities();
  closeModal();
  render();
});

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => render(), 1600);
}

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.getElementById("weekViewBtn").addEventListener("click", () => {
  currentView = "week";
  document.getElementById("weekViewBtn").classList.add("active");
  document.getElementById("monthViewBtn").classList.remove("active");
  render();
});

document.getElementById("monthViewBtn").addEventListener("click", () => {
  currentView = "month";
  document.getElementById("monthViewBtn").classList.add("active");
  document.getElementById("weekViewBtn").classList.remove("active");
  render();
});

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentView === "week") {
    currentDate = addDays(currentDate, -7);
  } else {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }
  render();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentView === "week") {
    currentDate = addDays(currentDate, 7);
  } else {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  render();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  currentDate = new Date();
  render();
});

document.getElementById("saveBackup").addEventListener("click", () => {
  const backup = {
    app: "Yansy_Planificador",
    version: 1,
    createdAt: new Date().toISOString(),
    activities
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Yansy_Planificador_Copia_${formatDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);

  showStatus("Copia de seguridad descargada.");
});

document.getElementById("restoreBackup").addEventListener("click", () => {
  document.getElementById("backupFile").click();
});

document.getElementById("backupFile").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data || data.app !== "Yeimy_Planificador" || !Array.isArray(data.activities)) {
        throw new Error("Archivo inválido");
      }

      const validActivities = data.activities.filter(item =>
        item &&
        item.title &&
        item.date &&
        item.time
      );

      if (!confirm("¿Restaurar esta copia? Reemplazará las actividades actuales.")) {
        event.target.value = "";
        return;
      }

      activities = validActivities.map(item => ({
        id: item.id || Date.now() + Math.random(),
        title: String(item.title),
        date: String(item.date),
        time: String(item.time),
        note: item.note ? String(item.note) : "",
        done: Boolean(item.done)
      }));

      saveActivities();
      render();
      showStatus("Copia restaurada correctamente.");
    } catch {
      alert("El archivo no parece ser una copia válida de Yansy_Planificador.");
    }

    event.target.value = "";
  };

  reader.readAsText(file);
});

render();
