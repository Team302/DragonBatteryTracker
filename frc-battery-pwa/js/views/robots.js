import { api } from "../api.js";

const TYPE_LABELS = { alpha: "Alpha", beta: "Beta", sled: "Sled" };
const TYPE_BADGE_CLASS = { alpha: "badge-alpha", beta: "badge-beta", sled: "badge-sled" };

export async function renderRobots(container) {
  container.innerHTML = `
    <div class="view-header">
      <div></div>
      <h1 class="view-title">Robots</h1>
      <button class="btn-icon" id="add-robot-btn" title="Add robot">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </button>
    </div>
    <div id="robots-body"><div class="loading-ring"></div></div>
    <div id="robot-form-panel" class="side-panel hidden"></div>
  `;

  document.getElementById("add-robot-btn").onclick = () => showForm(null, null);

  await loadRobots();

  async function loadRobots() {
    const body = document.getElementById("robots-body");
    try {
      const robots = await api.listRobots();
      renderList(robots, body);
    } catch (e) {
      body.innerHTML = `<div class="error-msg">⚠ ${e.message}</div>`;
    }
  }

  function renderList(robots, body) {
    if (robots.length === 0) {
      body.innerHTML = `<div class="empty-state">No robots yet. Tap + to add your first robot.</div>`;
      return;
    }
    body.innerHTML = `
      <div class="robot-list">
        ${robots.map((r) => `
          <div class="robot-card">
            <span class="type-badge ${TYPE_BADGE_CLASS[r.robot_type] || "badge-gray"}">
              ${TYPE_LABELS[r.robot_type] || r.robot_type}
            </span>
            <div class="robot-info">
              <span class="robot-number">#${r.number}</span>
              <span class="robot-name">${r.name}</span>
            </div>
            ${!r.active ? `<span class="badge-inactive">Inactive</span>` : ""}
            <button class="btn-icon robot-edit-btn" data-id="${r.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        `).join("")}
      </div>
    `;
    body.querySelectorAll(".robot-edit-btn").forEach((btn) => {
      btn.onclick = () => {
        const robot = robots.find((r) => r.id === parseInt(btn.dataset.id));
        showForm(robot.id, robot);
      };
    });
  }

  function showForm(robotId, existing) {
    const panel = document.getElementById("robot-form-panel");
    let selectedType = existing?.robot_type ?? "alpha";

    panel.innerHTML = `
      <div class="form-panel-header">
        <h2 class="section-heading">${existing ? "Edit Robot" : "Add Robot"}</h2>
        <button class="btn-icon" id="close-panel-btn">✕</button>
      </div>
      <div class="form-section">
        <label class="form-label" for="rf-number">Number</label>
        <input class="form-input" id="rf-number" type="number" min="1" placeholder="254" value="${existing?.number ?? ""}">
      </div>
      <div class="form-section">
        <label class="form-label" for="rf-name">Name</label>
        <input class="form-input" id="rf-name" type="text" placeholder="Competition Bot" value="${existing?.name ?? ""}">
      </div>
      <div class="form-section">
        <label class="form-label">Type</label>
        <div class="segmented-control">
          ${["alpha", "beta", "sled"].map((t) => `
            <button class="seg-btn ${selectedType === t ? "selected" : ""}" data-type="${t}">
              ${TYPE_LABELS[t]}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="form-section">
        <label class="form-label">
          Active
          <input type="checkbox" id="rf-active" class="toggle-input" ${(existing?.active ?? true) ? "checked" : ""}>
        </label>
      </div>
      <div class="form-section">
        <label class="form-label" for="rf-notes">Notes <span class="optional">(optional)</span></label>
        <textarea class="form-input form-textarea" id="rf-notes" placeholder="Any notes...">${existing?.notes ?? ""}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn-primary btn-full" id="rf-save-btn">${existing ? "Save Changes" : "Add Robot"}</button>
        ${existing ? `<button class="btn-danger btn-full" id="rf-delete-btn">Delete Robot</button>` : ""}
      </div>
      <div id="rf-error" class="form-error"></div>
    `;

    panel.classList.remove("hidden");

    panel.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.onclick = () => {
        selectedType = btn.dataset.type;
        panel.querySelectorAll(".seg-btn").forEach((b) =>
          b.classList.toggle("selected", b.dataset.type === selectedType)
        );
      };
    });

    document.getElementById("close-panel-btn").onclick = () => panel.classList.add("hidden");

    document.getElementById("rf-save-btn").onclick = async () => {
      const saveBtn = document.getElementById("rf-save-btn");
      const errEl = document.getElementById("rf-error");
      const number = parseInt(document.getElementById("rf-number").value);
      const name = document.getElementById("rf-name").value.trim();
      const active = document.getElementById("rf-active").checked;
      const notes = document.getElementById("rf-notes").value.trim();

      if (!number || number < 1) { errEl.textContent = "Robot number is required."; return; }
      if (!name) { errEl.textContent = "Robot name is required."; return; }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      errEl.textContent = "";

      try {
        const data = { number, name, robot_type: selectedType, active, notes: notes || null };
        if (robotId) {
          await api.updateRobot(robotId, data);
        } else {
          await api.createRobot(data);
        }
        panel.classList.add("hidden");
        await loadRobots();
      } catch (e) {
        errEl.textContent = e.message;
        saveBtn.disabled = false;
        saveBtn.textContent = existing ? "Save Changes" : "Add Robot";
      }
    };

    const deleteBtn = document.getElementById("rf-delete-btn");
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm(`Delete ${existing.name}? This cannot be undone.`)) return;
        try {
          await api.deleteRobot(robotId);
          panel.classList.add("hidden");
          await loadRobots();
        } catch (e) {
          document.getElementById("rf-error").textContent = e.message;
        }
      };
    }
  }
}
