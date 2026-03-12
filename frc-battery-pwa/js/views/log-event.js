import { api } from "../api.js";
import { navigate } from "../app.js";

const EVENT_TYPES = [
  { value: "beak_check", label: "🔬 Beak Check", fields: ["beak", "ir", "beak_status", "charge_percent"] },
  { value: "charge", label: "⚡ Charged", fields: [] },
  { value: "match", label: "🏆 Match", fields: ["match_number"] },
  { value: "practice", label: "🔧 Practice", fields: [] },
  { value: "incident", label: "⚠️ Incident", fields: ["notes"] },
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
  let beakMode = "single";
  let selectedRobotId = null;
  let selectedCompetitionId = null;
  let robots = [];
  let activeCompetition = null;

  try {
    robots = await api.listRobots(true);
  } catch {
    robots = [];
  }

  try {
    activeCompetition = await api.getActiveCompetition();
  } catch {
    activeCompetition = null;
  }

  function buildForm() {
    const selected = EVENT_TYPES.find((t) => t.value === selectedType);
    const showBeak = selected.fields.includes("beak");
    const showIR = selected.fields.includes("ir");
    const showBeakStatus = selected.fields.includes("beak_status");
    const showChargePercent = selected.fields.includes("charge_percent");
    const showMatch = selected.fields.includes("match_number");
    const showNotes = selected.fields.includes("notes");
    const showRobot = selectedType === "match" || selectedType === "practice";
    const showCompetition = selectedType === "match" || selectedType === "practice";
    const robotRequired = selectedType === "match";

    if (showCompetition && activeCompetition && !selectedCompetitionId) {
      selectedCompetitionId = activeCompetition.id;
    }

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
        ${showBeak ? `
          <div class="form-section">
            <label class="form-label">Voltage Mode</label>
            <div class="segmented-control">
              <button class="seg-btn ${beakMode === "single" ? "selected" : ""}" data-beak-mode="single" type="button">Single reading</button>
              <button class="seg-btn ${beakMode === "full" ? "selected" : ""}" data-beak-mode="full" type="button">Full load test</button>
            </div>
          </div>
          ${beakMode === "single" ? `
            <div class="form-section">
              <label class="form-label" for="f-v0">Voltage (0A)</label>
              <input class="form-input" id="f-v0" type="number" step="0.001" min="0" max="20" placeholder="12.800">
            </div>
          ` : `
            <div class="form-section">
              <label class="form-label" for="f-v0">0A - resting / open circuit</label>
              <input class="form-input" id="f-v0" type="number" step="0.001" min="0" max="20" placeholder="12.840">
            </div>
            <div class="form-section">
              <label class="form-label" for="f-v1">1A - light load</label>
              <input class="form-input" id="f-v1" type="number" step="0.001" min="0" max="20" placeholder="12.710">
            </div>
            <div class="form-section">
              <label class="form-label" for="f-v18">18A - full load</label>
              <input class="form-input" id="f-v18" type="number" step="0.001" min="0" max="20" placeholder="11.930">
            </div>
          `}
        ` : ""}
        ${showIR ? `
          <div class="form-section">
            <label class="form-label" for="f-ir">Internal Resistance (Ω)</label>
            <input class="form-input" id="f-ir" type="number" step="0.001" min="0" placeholder="0.010">
          </div>
        ` : ""}
        ${showBeakStatus ? `
          <div class="form-section">
            <label class="form-label" for="f-beak-status">Status <span class="optional">(optional)</span></label>
            <select class="form-input" id="f-beak-status">
              <option value="">Select status</option>
              <option value="bad">Bad</option>
              <option value="fair">Fair</option>
              <option value="good">Good</option>
            </select>
          </div>
        ` : ""}
        ${showChargePercent ? `
          <div class="form-section">
            <label class="form-label" for="f-charge-percent">Charge % <span class="optional">(optional)</span></label>
            <input class="form-input" id="f-charge-percent" type="number" step="0.1" min="0" max="100" placeholder="85">
          </div>
        ` : ""}
        ${showMatch ? `
          <div class="form-section">
            <label class="form-label" for="f-match">Match Number</label>
            <input class="form-input" id="f-match" type="number" min="1" placeholder="1">
          </div>
        ` : ""}
        ${showCompetition ? `
          <div class="form-section">
            <label class="form-label">Competition <span class="optional">(optional)</span></label>
            ${activeCompetition
              ? `<button class="type-chip selected" id="active-comp-chip" type="button">${activeCompetition.name}</button>`
              : `<span class="form-hint">No active competition - set one in Competitions</span>`}
          </div>
        ` : ""}
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
          </div>
        ` : ""}
        <div class="form-section">
          <label class="form-label" for="f-by">Logged By</label>
          <input class="form-input" id="f-by" type="text" placeholder="Your name or initials">
        </div>
        ${showNotes ? `
          <div class="form-section">
            <label class="form-label" for="f-notes">Notes <span class="optional">(optional)</span></label>
            <textarea class="form-input form-textarea" id="f-notes" placeholder="Any details..."></textarea>
          </div>
        ` : ""}
      </div>

      <button class="btn-primary btn-full" id="submit-btn">Save Event</button>
      <div id="form-error" class="form-error"></div>
    `;

    document.getElementById("back-btn").onclick = () => navigate("battery", { id });

    document.querySelectorAll(".type-chip[data-type]").forEach((chip) => {
      chip.onclick = () => {
        selectedType = chip.dataset.type;
        selectedRobotId = null;
        buildForm();
      };
    });

    document.querySelectorAll("[data-beak-mode]").forEach((btn) => {
      btn.onclick = () => {
        beakMode = btn.dataset.beakMode;
        buildForm();
      };
    });

    document.getElementById("active-comp-chip")?.addEventListener("click", () => {
      selectedCompetitionId = activeCompetition?.id || null;
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
      const v0 = document.getElementById("f-v0")?.value;
      const v1 = document.getElementById("f-v1")?.value;
      const v18 = document.getElementById("f-v18")?.value;
      const ir = document.getElementById("f-ir")?.value;
      const beakStatus = document.getElementById("f-beak-status")?.value;
      const chargePercent = document.getElementById("f-charge-percent")?.value;
      const match = document.getElementById("f-match")?.value;
      const by = document.getElementById("f-by")?.value;
      const notes = document.getElementById("f-notes")?.value;

      if (v0) {
        payload.voltage_0a = parseFloat(v0);
        payload.voltage = parseFloat(v0);
      }
      if (v1) payload.voltage_1a = parseFloat(v1);
      if (v18) payload.voltage_18a = parseFloat(v18);
      if (ir) payload.internal_resistance = parseFloat(ir);
      if (beakStatus) payload.beak_status = beakStatus;
      if (chargePercent !== undefined && chargePercent !== "") payload.charge_percent = parseFloat(chargePercent);
      if (match) payload.match_number = parseInt(match);
      if (by) payload.logged_by = by;
      if (notes) payload.notes = notes;
      if (selectedRobotId) payload.robot_id = selectedRobotId;
      if (selectedCompetitionId && (selectedType === "match" || selectedType === "practice")) {
        payload.competition_id = selectedCompetitionId;
      }

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
