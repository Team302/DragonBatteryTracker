import { api } from "../api.js";
import { navigate } from "../app.js";

export async function renderBattery(container, { id }) {
  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="view-title" id="batt-title">Battery</h1>
      <div></div>
    </div>
    <div id="batt-body"><div class="loading-ring"></div></div>
  `;
  document.getElementById("back-btn").onclick = () => navigate("dashboard");

  try {
    const [battery, events, trend] = await Promise.all([
      api.getBattery(id),
      api.getEvents(id),
      api.getIrTrend(id),
    ]);

    document.getElementById("batt-title").textContent = battery.label;
    const beak = events.find((e) => e.event_type === "beak_check");
    const ir = beak?.internal_resistance;
    const v0 = beak?.voltage_0a ?? beak?.voltage;
    const v18 = beak?.voltage_18a;
    const sag = v0 != null && v18 != null ? (v0 - v18) : null;
    const status = ir == null ? "unknown" : ir >= 30 ? "retire" : ir >= 22 ? "warn" : "good";
    const statusLabel = { good: "Good", warn: "Watch", retire: "Retire", unknown: "No Data" }[status];
    const purchasedDisplay = battery.purchased
      ? new Date(battery.purchased).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "-";
    const purchasedInput = battery.purchased ? new Date(battery.purchased).toISOString().slice(0, 10) : "";

    document.getElementById("batt-body").innerHTML = `
      <div class="health-banner status-${status}">
        <span class="health-label">${statusLabel}</span>
        ${ir != null ? `<span class="health-ir">${ir} mΩ</span>` : ""}
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <span class="metric-val">${v0 ?? "—"}</span>
          <span class="metric-key">Voltage (V)</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">${beak?.internal_resistance ?? "—"}</span>
          <span class="metric-key">IR (mΩ)</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">${events.filter(e => e.event_type === "match").length}</span>
          <span class="metric-key">Matches</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">${events.filter(e => e.event_type === "charge").length}</span>
          <span class="metric-key">Charges</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">${sag != null ? sag.toFixed(3) : "—"}</span>
          <span class="metric-key">Sag (V)</span>
        </div>
      </div>

      ${trend.length >= 2 ? `
        <div class="chart-section">
          <h3 class="section-heading">IR Trend</h3>
          <canvas id="ir-chart" height="140"></canvas>
        </div>
      ` : ""}

      <div class="action-row">
        <button class="btn-primary" id="log-btn">Log Event</button>
        ${battery.retired ? "" : `<button class="btn-danger" id="retire-btn">Retire</button>`}
      </div>

      <div class="history-section">
        <h3 class="section-heading">History</h3>
        <div class="event-list">
          ${events.slice(0, 30).map(renderEvent).join("")}
        </div>
      </div>

      <div class="history-section">
        <h3 class="section-heading">Battery Details</h3>
        <div class="event-list">
          <div class="event-row">
            <div class="event-info">
              <span class="event-type">Manufacturer</span>
              <span class="event-detail">${battery.manufacturer || "-"}</span>
            </div>
          </div>
          <div class="event-row">
            <div class="event-info">
              <span class="event-type">Model</span>
              <span class="event-detail">${battery.battery_model || "-"}</span>
            </div>
          </div>
          <div class="event-row">
            <div class="event-info">
              <span class="event-type">Purchase Date</span>
              <span class="event-detail">${purchasedDisplay}</span>
            </div>
          </div>
          <div class="event-row">
            <div class="event-info">
              <span class="event-type">Capacity</span>
              <span class="event-detail">${battery.capacity_ah != null ? `${battery.capacity_ah} Ah` : "-"}</span>
            </div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn-secondary" id="toggle-details-btn" type="button">Edit Battery Details</button>
        </div>

        <div id="edit-details-form" class="hidden">
          <div class="form-section">
            <label class="form-label" for="f-edit-mfr">Manufacturer</label>
            <input class="form-input" id="f-edit-mfr" type="text" value="${escapeHtml(battery.manufacturer || "")}" placeholder="MK Battery, Werker, etc.">
          </div>
          <div class="form-section">
            <label class="form-label" for="f-edit-model">Battery Model</label>
            <input class="form-input" id="f-edit-model" type="text" value="${escapeHtml(battery.battery_model || "")}" placeholder="ES17-12, NP18-12B, etc.">
          </div>
          <div class="form-section">
            <label class="form-label" for="f-edit-cap">Capacity (Ah)</label>
            <input class="form-input" id="f-edit-cap" type="number" step="0.1" min="0" value="${battery.capacity_ah != null ? battery.capacity_ah : ""}" placeholder="18.0">
          </div>
          <div class="form-section">
            <label class="form-label" for="f-edit-purchased">Purchase Date</label>
            <input class="form-input" id="f-edit-purchased" type="date" value="${purchasedInput}">
          </div>
          <div class="action-row">
            <button class="btn-primary" id="save-details-btn" type="button">Save Battery Details</button>
            <button class="btn-secondary" id="cancel-details-btn" type="button">Cancel</button>
          </div>
          <div id="details-error" class="form-error"></div>
        </div>
      </div>
    `;

    document.getElementById("log-btn").onclick = () => navigate("log-event", { id });
    document.getElementById("toggle-details-btn")?.addEventListener("click", () => {
      const form = document.getElementById("edit-details-form");
      const toggleBtn = document.getElementById("toggle-details-btn");
      form.classList.toggle("hidden");
      toggleBtn.textContent = form.classList.contains("hidden") ? "Edit Battery Details" : "Close Editor";
    });

    document.getElementById("cancel-details-btn")?.addEventListener("click", () => {
      const form = document.getElementById("edit-details-form");
      const toggleBtn = document.getElementById("toggle-details-btn");
      form.classList.add("hidden");
      toggleBtn.textContent = "Edit Battery Details";
    });

    document.getElementById("save-details-btn")?.addEventListener("click", async () => {
      const errEl = document.getElementById("details-error");
      const saveBtn = document.getElementById("save-details-btn");
      errEl.textContent = "";

      const mfr = document.getElementById("f-edit-mfr").value.trim();
      const model = document.getElementById("f-edit-model").value.trim();
      const cap = document.getElementById("f-edit-cap").value;
      const purchased = document.getElementById("f-edit-purchased").value;

      const payload = {
        manufacturer: mfr || null,
        battery_model: model || null,
        capacity_ah: cap === "" ? null : parseFloat(cap),
        purchased: purchased ? new Date(purchased).toISOString() : null,
      };

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        await api.updateBattery(id, payload);
        await renderBattery(container, { id });
      } catch (e) {
        errEl.textContent = e.message;
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Battery Details";
      }
    });

    document.getElementById("retire-btn")?.addEventListener("click", async () => {
      if (!confirm("Mark this battery as retired?")) return;
      await api.logEvent(id, { event_type: "retired" });
      navigate("dashboard");
    });

    if (trend.length >= 2) renderChart(trend);
  } catch (e) {
    document.getElementById("batt-body").innerHTML =
      `<div class="error-msg">⚠ ${e.message}</div>`;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEvent(e) {
  const icons = {
    charge: "⚡", match: "🏆", practice: "🔧",
    beak_check: "📊", incident: "⚠️", retired: "🪦",
  };
  const icon = icons[e.event_type] || "•";
  const label = e.event_type.replace("_", " ");
  const date = new Date(e.created_at).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const beakVoltages =
    e.event_type === "beak_check"
      ? [
          e.voltage_0a != null ? `0A: ${e.voltage_0a}V` : (e.voltage != null ? `${e.voltage}V` : null),
          e.voltage_1a != null ? `1A: ${e.voltage_1a}V` : null,
          e.voltage_18a != null ? `18A: ${e.voltage_18a}V` : null,
        ].filter(Boolean)
      : [];
  const robotInfo =
    e.robot && (e.event_type === "match" || e.event_type === "practice")
      ? `Robot ${e.robot.number} · ${e.robot.name}`
      : null;
  const detail = [
    ...beakVoltages,
    e.event_type !== "beak_check" && e.voltage ? `${e.voltage}V` : null,
    e.internal_resistance ? `${e.internal_resistance}mΩ` : null,
    e.beak_status ? `Status: ${e.beak_status[0].toUpperCase()}${e.beak_status.slice(1)}` : null,
    e.charge_percent != null ? `Charge: ${e.charge_percent}%` : null,
    e.match_number ? `Match ${e.match_number}` : null,
    robotInfo,
    e.logged_by ? `by ${e.logged_by}` : null,
  ].filter(Boolean).join(" · ");

  return `
    <div class="event-row">
      <span class="event-icon">${icon}</span>
      <div class="event-info">
        <span class="event-type">${label}</span>
        ${detail ? `<span class="event-detail">${detail}</span>` : ""}
      </div>
      <span class="event-date">${date}</span>
    </div>
  `;
}

function renderChart(trend) {
  const canvas = document.getElementById("ir-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.offsetWidth || 340;
  const H = 140;
  canvas.width = W;
  canvas.height = H;

  const irs = trend.map((p) => p.ir);
  const min = Math.max(0, Math.min(...irs) - 5);
  const max = Math.max(...irs) + 5;
  const pad = { t: 10, r: 10, b: 30, l: 40 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const xScale = (i) => pad.l + (i / (trend.length - 1)) * chartW;
  const yScale = (v) => pad.t + chartH - ((v - min) / (max - min)) * chartH;

  // Background zones
  const warnY = yScale(22);
  const retireY = yScale(30);
  ctx.fillStyle = "rgba(74,222,128,0.08)";
  ctx.fillRect(pad.l, warnY, chartW, chartH - (warnY - pad.t));
  ctx.fillStyle = "rgba(250,204,21,0.08)";
  ctx.fillRect(pad.l, retireY, chartW, warnY - retireY);
  ctx.fillStyle = "rgba(239,68,68,0.08)";
  ctx.fillRect(pad.l, pad.t, chartW, retireY - pad.t);

  // Threshold lines
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(250,204,21,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, warnY); ctx.lineTo(pad.l + chartW, warnY); ctx.stroke();
  ctx.strokeStyle = "rgba(239,68,68,0.5)";
  ctx.beginPath(); ctx.moveTo(pad.l, retireY); ctx.lineTo(pad.l + chartW, retireY); ctx.stroke();
  ctx.setLineDash([]);

  // Y axis labels
  ctx.fillStyle = "#6b7280";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  [min, 22, 30, max].forEach((v) => {
    ctx.fillText(v.toFixed(0), pad.l - 6, yScale(v) + 4);
  });

  // Line
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  trend.forEach((p, i) => {
    i === 0 ? ctx.moveTo(xScale(i), yScale(p.ir)) : ctx.lineTo(xScale(i), yScale(p.ir));
  });
  ctx.stroke();

  // Dots
  trend.forEach((p, i) => {
    const dotColor = p.ir >= 30 ? "#ef4444" : p.ir >= 22 ? "#facc15" : "#4ade80";
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(xScale(i), yScale(p.ir), 4, 0, Math.PI * 2);
    ctx.fill();
  });
}
