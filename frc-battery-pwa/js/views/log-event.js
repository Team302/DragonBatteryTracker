import { api } from "../api.js";
import { navigate } from "../app.js";

const EVENT_TYPES = [
  { value: "beak_check", label: "🔬 Beak Check", fields: ["voltage", "ir"] },
  { value: "charge",     label: "⚡ Charged",     fields: [] },
  { value: "match",      label: "🏆 Match",       fields: ["match_number"] },
  { value: "practice",   label: "🔧 Practice",    fields: [] },
  { value: "incident",   label: "⚠️ Incident",    fields: ["notes"] },
];

export async function renderLogEvent(container, { id }) {
  let battery;
  try {
    battery = await api.getBattery(id);
  } catch {
    container.innerHTML = `<div class="error-msg">Battery not found.</div>`;
    return;
  }

  let selectedType = "beak_check";
  let selectedRobotId = null;
  let robots = [];
  try {
    robots = await api.listRobots(true);
  } catch {
    robots = [];
  }

  function buildForm() {
    const selected = EVENT_TYPES.find((t) => t.value === selectedType);
    const showVoltage = selected.fields.includes("voltage");
    const showIR = selected.fields.includes("ir");
    const showMatch = selected.fields.includes("match_number");
    const showNotes = selected.fields.includes("notes");
    const showRobot = selectedType === "match" || selectedType === "practice";
    const robotRequired = selectedType === "match";

    container.innerHTML = `
      <div class="view-header">
        <button class="btn-back" id="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 class="view-title">Log Event</h1>
        <div></div>
      </div>
      <div class="form-battery-label">${battery.label}</div>

      <div class="form-section">
        <label class="form-label">Event Type</label>
        <div class="event-type-grid">
          ${EVENT_TYPES.map((t) => `
            <button class="type-chip ${t.value === selectedType ? "selected" : ""}" data-type="${t.value}">
              ${t.label}
            </button>
          `).join("")}
        </div>
      </div>

      <div id="dynamic-fields">
        ${showVoltage ? `
          <div class="form-section">
            <label class="form-label" for="f-voltage">Voltage (V)</label>
            <input class="form-input" id="f-voltage" type="number" step="0.001" min="0" max="20" placeholder="12.800">
          </div>` : ""}
        ${showIR ? `
          <div class="form-section">
            <label class="form-label" for="f-ir">Internal Resistance (mΩ)</label>
            <input class="form-input" id="f-ir" type="number" step="0.1" min="0" placeholder="18.5">
          </div>` : ""}
        ${showMatch ? `
          <div class="form-section">
            <label class="form-label" for="f-match">Match Number</label>
            <input class="form-input" id="f-match" type="number" min="1" placeholder="1">
          </div>` : ""}
        ${showRobot ? `
          <div class="form-section">
            <label class="form-label">Robot ${robotRequired ? "" : "<span class=\"optional\">(optional)</span>"}</label>
            <div class="robot-chip-grid">
              ${robots.map((r) => `
                <button class="robot-chip ${r.id === selectedRobotId ? "selected" : ""}" data-robot-id="${r.id}" type="button">
                  <span class="robot-chip-num">#${r.number}</span>
                  <span class="robot-chip-name">${r.name}</span>
                </button>
              `).join("")}
              ${robots.length === 0 ? `<span class="form-hint">No active robots found</span>` : ""}
            </div>
          </div>` : ""}
        <div class="form-section">
          <label class="form-label" for="f-by">Logged By</label>
          <input class="form-input" id="f-by" type="text" placeholder="Your name or initials">
        </div>
        ${showNotes || true ? `
          <div class="form-section">
            <label class="form-label" for="f-notes">Notes <span class="optional">(optional)</span></label>
            <textarea class="form-input form-textarea" id="f-notes" placeholder="Any details..."></textarea>
          </div>` : ""}
      </div>

      <button class="btn-primary btn-full" id="submit-btn">Save Event</button>
      <div id="form-error" class="form-error"></div>
    `;

    document.getElementById("back-btn").onclick = () => navigate("battery", { id });

    document.querySelectorAll(".type-chip").forEach((chip) => {
      chip.onclick = () => {
        selectedType = chip.dataset.type;
        selectedRobotId = null;
        buildForm();
      };
    });

    if (showRobot) {
      document.querySelectorAll(".robot-chip").forEach((chip) => {
        chip.onclick = () => {
          const clickedId = parseInt(chip.dataset.robotId);
          selectedRobotId = selectedRobotId === clickedId ? null : clickedId;
          document.querySelectorAll(".robot-chip").forEach((c) => {
            c.classList.toggle("selected", parseInt(c.dataset.robotId) === selectedRobotId);
          });
        };
      });
    }

    document.getElementById("submit-btn").onclick = async () => {
      const btn = document.getElementById("submit-btn");
      const errEl = document.getElementById("form-error");

      if (robotRequired && !selectedRobotId) {
        errEl.textContent = "Robot selection is required for match events.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Saving...";
      errEl.textContent = "";

      const payload = { event_type: selectedType };
      const v = document.getElementById("f-voltage")?.value;
      const ir = document.getElementById("f-ir")?.value;
      const match = document.getElementById("f-match")?.value;
      const by = document.getElementById("f-by")?.value;
      const notes = document.getElementById("f-notes")?.value;

      if (v) payload.voltage = parseFloat(v);
      if (ir) payload.internal_resistance = parseFloat(ir);
      if (match) payload.match_number = parseInt(match);
      if (by) payload.logged_by = by;
      if (notes) payload.notes = notes;
      if (selectedRobotId) payload.robot_id = selectedRobotId;

      try {
        await api.logEvent(id, payload);
        navigate("battery", { id });
      } catch (e) {
        errEl.textContent = e.message;
        btn.disabled = false;
        btn.textContent = "Save Event";
      }
    };
  }

  buildForm();
}
