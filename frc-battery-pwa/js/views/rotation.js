import { api } from "../api.js";

const STATUSES = ["ready", "charging", "in_use", "cool_down"];
const LABELS = {
  ready: "READY",
  charging: "CHARGING",
  in_use: "IN USE",
  cool_down: "COOL DOWN",
};

export async function renderRotation(container) {
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Rotation</h1>
      <div></div>
    </div>
    <div id="rotation-top" class="stats-row"></div>
    <div id="rotation-board"><div class="loading-ring"></div></div>
    <div id="rotation-sheet" class="qr-overlay hidden">
      <div class="qr-modal">
        <div class="qr-header"><span>Move Battery</span><button id="close-rotation-sheet">✕</button></div>
        <div style="padding:12px" id="rotation-sheet-actions"></div>
      </div>
    </div>
  `;

  let batteries = [];
  let activeCompetitionName = null;
  let selectedBattery = null;

  try {
    const [allBatteries] = await Promise.all([api.listBatteries(false)]);
    batteries = await Promise.all(
      allBatteries.map(async (b) => {
        let events = [];
        try {
          events = await api.getEvents(b.id, "beak_check");
        } catch {
          events = [];
        }
        const beak = events[0];
        return {
          ...b,
          latest_ir: beak?.internal_resistance ?? null,
          latest_voltage: beak?.voltage_0a ?? beak?.voltage ?? null,
        };
      })
    );
    try {
      const comp = await api.getActiveCompetition();
      activeCompetitionName = comp.name;
    } catch {
      activeCompetitionName = null;
    }
    await renderBoard();
  } catch (e) {
    document.getElementById("rotation-board").innerHTML = `<div class="error-msg">${e.message}</div>`;
  }

  async function renderBoard() {
    const top = document.getElementById("rotation-top");
    const counts = Object.fromEntries(STATUSES.map((s) => [s, batteries.filter((b) => b.rotation_status === s && !b.retired).length]));

    top.innerHTML = `
      <div class="stat-pill" style="flex:2;align-items:flex-start;">
        <span class="stat-label">Active Competition</span>
        <span class="stat-num" style="font-size:16px">${activeCompetitionName || "None"}</span>
      </div>
      ${STATUSES.map((s) => `<div class="stat-pill"><span class="stat-num">${counts[s]}</span><span class="stat-label">${LABELS[s]}</span></div>`).join("")}
    `;

    const board = document.getElementById("rotation-board");
    board.innerHTML = `
      <div class="rotation-grid">
        ${STATUSES.map((status) => renderLane(status)).join("")}
      </div>
    `;

    board.querySelectorAll(".rotation-card").forEach((btn) => {
      btn.onclick = () => openSheet(parseInt(btn.dataset.id));
    });
  }

  function renderLane(status) {
    const inLane = batteries.filter((b) => !b.retired && b.rotation_status === status);
    const retired = status === "ready" ? batteries.filter((b) => b.retired) : [];

    const laneCards = [...inLane, ...retired].map((b) => `
      <button class="battery-card rotation-card ${b.retired ? "rotation-retired" : ""}" data-id="${b.id}">
        <div class="card-left">
          <div class="card-info">
            <span class="card-label">${b.label}</span>
            <span class="card-meta">${b.latest_ir ?? "-"}mΩ · ${b.latest_voltage ?? "-"}V</span>
            <span class="card-meta">${b.retired ? "RETIRED" : "Tap to move"}</span>
          </div>
        </div>
      </button>
    `).join("");

    return `
      <section class="chart-section rotation-lane">
        <h3 class="section-heading">${LABELS[status]}</h3>
        ${laneCards || `<div class="empty-msg" style="padding:12px">No batteries</div>`}
      </section>
    `;
  }

  function openSheet(batteryId) {
    selectedBattery = batteries.find((b) => b.id === batteryId);
    if (!selectedBattery || selectedBattery.retired) return;

    const overlay = document.getElementById("rotation-sheet");
    const actions = document.getElementById("rotation-sheet-actions");
    actions.innerHTML = STATUSES.map((status) => `
      <button class="btn-primary btn-full move-status-btn" data-status="${status}" style="margin-bottom:8px;">
        ${LABELS[status]}
      </button>
    `).join("");

    actions.querySelectorAll(".move-status-btn").forEach((btn) => {
      btn.onclick = async () => {
        const status = btn.dataset.status;
        await api.updateRotation(selectedBattery.id, status);
        selectedBattery.rotation_status = status;
        overlay.classList.add("hidden");
        await renderBoard();
      };
    });

    document.getElementById("close-rotation-sheet").onclick = () => overlay.classList.add("hidden");
    overlay.classList.remove("hidden");
  }
}
