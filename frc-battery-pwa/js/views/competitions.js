import { api } from "../api.js";

function toDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(d) {
  if (!d) return "";
  const dateOnly = toDateOnly(d);
  if (!dateOnly) return "";
  const [y, m, day] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRange(start, end) {
  if (!start && !end) return "Dates not set";
  if (start && end) return `${fmtDate(start)} - ${fmtDate(end)}`;
  return start ? `Starts ${fmtDate(start)}` : `Ends ${fmtDate(end)}`;
}

function parseDateOnlyToLocalDate(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const [y, m, day] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

function fmtRelativeWindow(start, end) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = parseDateOnlyToLocalDate(start);
  const endDate = parseDateOnlyToLocalDate(end);

  if (startDate && startDate > today) {
    const days = daysBetween(startDate, today);
    if (days === 1) return "Starts in 1 day";
    return `Starts in ${days} days`;
  }

  if (endDate && endDate < today) {
    const days = daysBetween(today, endDate);
    if (days === 1) return "Ended 1 day ago";
    return `Ended ${days} days ago`;
  }

  return "";
}

export async function renderCompetitions(container) {
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Competitions</h1>
      <button class="btn-icon" id="add-comp-btn" title="Add competition">+
      </button>
    </div>
    <div id="comps-body"><div class="loading-ring"></div></div>
    <div id="comp-form-panel" class="side-panel hidden"></div>
  `;

  document.getElementById("add-comp-btn").onclick = () => showForm(null);
  await loadCompetitions();

  async function loadCompetitions() {
    const body = document.getElementById("comps-body");
    try {
      const comps = await api.listCompetitions();
      const cards = await Promise.all(
        comps.map(async (c) => {
          let summary = [];
          try {
            summary = await api.getCompetitionSummary(c.id);
          } catch {
            summary = [];
          }
          const matchCount = summary.reduce((acc, row) => acc + row.match_count, 0);
          const chargeCount = summary.reduce((acc, row) => acc + row.charge_count, 0);
          return { ...c, matchCount, chargeCount };
        })
      );

      const active = cards.find((c) => c.active);
      const rest = cards.filter((c) => !c.active);
      const ordered = active ? [active, ...rest] : cards;

      body.innerHTML = ordered.length
        ? `<div class="battery-list">${ordered.map(renderCompCard).join("")}</div>`
        : `<div class="empty-msg">No competitions yet.</div>`;

      body.querySelectorAll(".comp-card").forEach((el) => {
        el.onclick = () => openDetail(parseInt(el.dataset.id));
      });
    } catch (e) {
      body.innerHTML = `<div class="error-msg">${e.message}</div>`;
    }
  }

  function renderCompCard(c) {
    const relativeWindow = fmtRelativeWindow(c.start_date, c.end_date);
    return `
      <button class="battery-card comp-card ${c.active ? "status-good" : ""}" data-id="${c.id}">
        <div class="card-left">
          <div class="card-info">
            <span class="card-label">${c.name}</span>
            <span class="card-meta">${c.location || "No location"} · ${fmtRange(c.start_date, c.end_date)}</span>
            ${relativeWindow ? `<span class="card-meta">${relativeWindow}</span>` : ""}
            <span class="card-meta">${c.matchCount} matches · ${c.chargeCount} charges</span>
          </div>
        </div>
        <div class="card-right">${c.active ? `<span class="status-dot">ACTIVE</span>` : ""}</div>
      </button>
    `;
  }

  async function openDetail(id) {
    const body = document.getElementById("comps-body");
    body.innerHTML = `<div class="loading-ring"></div>`;

    try {
      const [comp, summary] = await Promise.all([api.getCompetition(id), api.getCompetitionSummary(id)]);
      const relativeWindow = fmtRelativeWindow(comp.start_date, comp.end_date);
      body.innerHTML = `
        <div class="chart-section">
          <h3 class="section-heading">${comp.name}</h3>
          <p class="card-meta">${comp.location || "No location"}</p>
          <p class="card-meta">${fmtRange(comp.start_date, comp.end_date)}</p>
          ${relativeWindow ? `<p class="card-meta">${relativeWindow}</p>` : ""}
          <p class="card-meta">${comp.notes || ""}</p>
          <div class="action-row" style="margin-top:12px;">
            ${comp.active
              ? `<button class="btn-danger" id="deactivate-comp-btn">Deactivate</button>`
              : `<button class="btn-primary" id="activate-comp-btn">Set Active</button>`}
            <button class="btn-primary" id="edit-comp-btn">Edit</button>
            <button class="btn-back" id="back-to-comps-btn">Back</button>
          </div>
        </div>
        <div class="history-section">
          <h3 class="section-heading">Per-Battery Summary</h3>
          <div class="event-list">
            ${summary
              .sort((a, b) => b.match_count - a.match_count)
              .map((row) => `
                <div class="event-row">
                  <div class="event-info">
                    <span class="event-type">${row.battery_label}</span>
                    <span class="event-detail">${row.match_count} matches · ${row.charge_count} charges · min V ${row.min_voltage ?? "-"} · IR ${row.latest_ir ? row.latest_ir.toFixed(3) : "-"}Ω</span>
                  </div>
                  <span class="event-date">${row.status}</span>
                </div>
              `)
              .join("")}
          </div>
        </div>
      `;

      document.getElementById("back-to-comps-btn").onclick = loadCompetitions;
      document.getElementById("edit-comp-btn").onclick = () => showForm(comp);
      document.getElementById("activate-comp-btn")?.addEventListener("click", async () => {
        await api.activateCompetition(id);
        await openDetail(id);
      });
      document.getElementById("deactivate-comp-btn")?.addEventListener("click", async () => {
        await api.deactivateCompetition(id);
        await openDetail(id);
      });
    } catch (e) {
      body.innerHTML = `<div class="error-msg">${e.message}</div>`;
    }
  }

  function showForm(existing) {
    const panel = document.getElementById("comp-form-panel");
    panel.classList.remove("hidden");

    panel.innerHTML = `
      <div class="form-panel-header">
        <h2 class="section-heading">${existing ? "Edit Competition" : "Add Competition"}</h2>
        <button class="btn-icon" id="close-comp-panel">✕</button>
      </div>
      <div class="form-section"><label class="form-label">Name</label><input class="form-input" id="c-name" value="${existing?.name || ""}"></div>
      <div class="form-section"><label class="form-label">Location</label><input class="form-input" id="c-location" value="${existing?.location || ""}"></div>
      <div class="form-section"><label class="form-label">Start Date</label><input class="form-input" id="c-start" type="date" value="${toDateOnly(existing?.start_date)}"></div>
      <div class="form-section"><label class="form-label">End Date</label><input class="form-input" id="c-end" type="date" value="${toDateOnly(existing?.end_date)}"></div>
      <div class="form-section"><label class="form-label">Notes</label><textarea class="form-input form-textarea" id="c-notes">${existing?.notes || ""}</textarea></div>
      <button class="btn-primary btn-full" id="save-comp-btn">${existing ? "Save" : "Create"}</button>
      <div class="form-error" id="comp-err"></div>
    `;

    document.getElementById("close-comp-panel").onclick = () => panel.classList.add("hidden");
    document.getElementById("save-comp-btn").onclick = async () => {
      const payload = {
        name: document.getElementById("c-name").value.trim(),
        location: document.getElementById("c-location").value.trim() || null,
        start_date: document.getElementById("c-start").value || null,
        end_date: document.getElementById("c-end").value || null,
        notes: document.getElementById("c-notes").value.trim() || null,
      };
      if (!payload.name) {
        document.getElementById("comp-err").textContent = "Name is required";
        return;
      }
      try {
        if (existing) {
          await api.updateCompetition(existing.id, payload);
        } else {
          await api.createCompetition(payload);
        }
        panel.classList.add("hidden");
        await loadCompetitions();
      } catch (e) {
        document.getElementById("comp-err").textContent = e.message;
      }
    };
  }
}
