import { api } from "../api.js";
import { navigate } from "../app.js";

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="view-header">
        <h1 class="view-title">Batteries</h1>
      <div>
        <button class="btn-icon" id="export-csv-btn" title="Export battery CSV">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>
        </button>
        <button class="btn-icon" id="export-events-csv-btn" title="Export battery events CSV">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M7 6V4h10v2"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>
        </button>
        <button class="btn-icon" id="add-battery-btn" title="Add battery">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
    <div class="stats-row" id="stats-row">
      <div class="stat-pill skeleton"></div>
      <div class="stat-pill skeleton"></div>
      <div class="stat-pill skeleton"></div>
    </div>
    <div id="battery-list" class="battery-list">
      ${[0,1,2,3].map(() => `<div class="battery-card skeleton" style="height:88px"></div>`).join("")}
    </div>
  `;

  document.getElementById("add-battery-btn").onclick = () => navigate("register");
  document.getElementById("export-csv-btn").onclick = async () => {
    try {
      const { blob, contentDisposition } = await api.exportBatteriesCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
      a.href = url;
      a.download = match?.[1] || "battery_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };
  document.getElementById("export-events-csv-btn").onclick = async () => {
    try {
      const { blob, contentDisposition } = await api.exportEventsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
      a.href = url;
      a.download = match?.[1] || "battery_events_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  try {
    const [summaries, stats] = await Promise.all([api.getDashboard(), api.getStats()]);
    renderStats(stats);
    renderList(summaries);
  } catch (e) {
    document.getElementById("battery-list").innerHTML =
      `<div class="error-msg">⚠ Could not load batteries: ${e.message}</div>`;
  }
}

function renderStats(stats) {
  document.getElementById("stats-row").innerHTML = `
    <div class="stat-pill">
      <span class="stat-num">${stats.active_batteries}</span>
      <span class="stat-label">Active</span>
    </div>
    <div class="stat-pill">
      <span class="stat-num">${stats.retired_batteries}</span>
      <span class="stat-label">Retired</span>
    </div>
    <div class="stat-pill">
      <span class="stat-num">${stats.total_events_logged}</span>
      <span class="stat-label">Events</span>
    </div>
  `;
}

function renderList(summaries) {
  if (!summaries.length) {
    document.getElementById("battery-list").innerHTML =
      `<div class="empty-msg">No batteries registered yet.<br>Tap + to add one.</div>`;
    return;
  }

  document.getElementById("battery-list").innerHTML = summaries.map((s) => {
    const statusClass = { good: "good", fair: "warn", bad: "retire", unknown: "unknown" }[s.status] || "unknown";
    const irDisplay = s.latest_ir != null ? `${s.latest_ir.toFixed(3)} Ω` : "—";
    const vDisplay = s.latest_voltage != null ? `${s.latest_voltage}V` : "—";
    const dot = { good: "🟢", fair: "🟡", bad: "🔴", unknown: "⚪" }[s.status] || "⚪";

    return `
      <button class="battery-card status-${statusClass}" data-id="${s.battery.id}">
        <div class="card-left">
          <span class="status-dot">${dot}</span>
          <div class="card-info">
            <span class="card-label">${s.battery.label}</span>
            <span class="card-meta">${s.match_uses} matches · ${s.charge_cycles} charges</span>
          </div>
        </div>
        <div class="card-right">
          <span class="card-ir">${irDisplay}</span>
          <span class="card-voltage">${vDisplay}</span>
        </div>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".battery-card[data-id]").forEach((el) => {
    el.onclick = () => navigate("battery", { id: el.dataset.id });
  });
}
