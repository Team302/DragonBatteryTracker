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
    const status = ir == null ? "unknown" : ir >= 30 ? "retire" : ir >= 22 ? "warn" : "good";
    const statusLabel = { good: "Good", warn: "Watch", retire: "Retire", unknown: "No Data" }[status];

    document.getElementById("batt-body").innerHTML = `
      <div class="health-banner status-${status}">
        <span class="health-label">${statusLabel}</span>
        ${ir != null ? `<span class="health-ir">${ir} mΩ</span>` : ""}
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <span class="metric-val">${beak?.voltage ?? "—"}</span>
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
    `;

    document.getElementById("log-btn").onclick = () => navigate("log-event", { id });
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

function renderEvent(e) {
  const icons = {
    charge: "⚡", match: "🏆", practice: "🔧",
    beak_check: "📊", incident: "⚠️", retired: "🪦",
  };
  const icon = icons[e.event_type] || "•";
  const label = e.event_type.replace("_", " ");
  const date = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const robotInfo =
    e.robot && (e.event_type === "match" || e.event_type === "practice")
      ? `Robot ${e.robot.number} · ${e.robot.name}`
      : null;
  const detail = [
    e.voltage ? `${e.voltage}V` : null,
    e.internal_resistance ? `${e.internal_resistance}mΩ` : null,
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
