import { renderDashboard } from "./views/dashboard.js";
import { renderBattery } from "./views/battery.js";
import { renderEditBattery } from "./views/edit-battery.js";
import { renderLogEvent } from "./views/log-event.js";
import { renderRegister } from "./views/register.js";
import { renderRobots } from "./views/robots.js";
import { renderRotation } from "./views/rotation.js";
import { renderCompetitions } from "./views/competitions.js";

const container = document.getElementById("app");
let activeScanToken = 0;

// ── Router ────────────────────────────────────────────────────────

const ROUTES = {
  rotation: renderRotation,
  dashboard: renderDashboard,
  battery: renderBattery,
  "edit-battery": renderEditBattery,
  "log-event": renderLogEvent,
  register: renderRegister,
  robots: renderRobots,
  competitions: renderCompetitions,
};

export function navigate(view, params = {}) {
  const hash = params && Object.keys(params).length
    ? `#${view}?${new URLSearchParams(params).toString()}`
    : `#${view}`;
  window.location.hash = hash;
}

function parseHash() {
  const raw = window.location.hash.slice(1); // remove #
  const [view, qs] = raw.split("?");
  const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  return { view: view || "rotation", params };
}

async function route() {
  const { view, params } = parseHash();
  const hasExplicitHashView = window.location.hash.length > 1;

  // NFC tap arrives as /scan/{uid} — only handle when no hash route is set yet.
  if (window.location.pathname.startsWith("/scan/") && !hasExplicitHashView) {
    const uid = decodeURIComponent(window.location.pathname.replace(/^\/scan\//, ""));
    await handleNfcScan(uid);
    return;
  }

  // QR code may encode a full URL like https://host/scan/UID
  // handled server-side redirect, but also handle hash-based
  if (view === "scan" && params.uid) {
    await handleNfcScan(params.uid);
    return;
  }

  const renderer = ROUTES[view] || renderRotation;
  container.innerHTML = "";
  window.scrollTo(0, 0);

  try {
    await renderer(container, params);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">⚠ Page error: ${e.message}</div>`;
    console.error(e);
  }
}

async function handleNfcScan(uid) {
  const scanToken = ++activeScanToken;
  const normalizedUid = String(uid || "").trim();
  const encodedUid = encodeURIComponent(normalizedUid);
  const apiBase = (window.API_BASE || "/api").replace(/\/$/, "");
  const lookupUrl = `${apiBase}/batteries/nfc/${encodedUid}`;

  container.innerHTML = `
    <div class="scan-splash">
      <div class="loading-ring"></div>
      <p>Looking up battery…</p>
      <div class="scan-debug">
        <span class="debug-label">Tag UID</span>
        <span class="debug-value">${escapeHtml(normalizedUid)}</span>
        <span class="debug-label">API URL</span>
        <span class="debug-value">${escapeHtml(lookupUrl)}</span>
        <span class="debug-label">Status</span>
        <span class="debug-value">Waiting for response...</span>
      </div>
    </div>
  `;

  const { api } = await import("./api.js");
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out after 10 seconds")), 10000);
  });

  try {
    const battery = await Promise.race([api.getBatteryByNfc(normalizedUid), timeout]);
    if (scanToken !== activeScanToken) return;
    clearTimeout(timeoutId);
    navigate("battery", { id: battery.id });
  } catch (e) {
    if (scanToken !== activeScanToken) return;
    clearTimeout(timeoutId);
    const message = e?.message || "Request failed";
    const isNotFound = message.includes("not registered") || message.includes("404");
    if (isNotFound) {
      navigate("register", { uid: normalizedUid });
    } else {
      container.innerHTML = `
        <div class="scan-splash">
          <div class="scan-error">
            <p class="error-heading">⚠ Scan failed</p>
            <p class="error-msg">${escapeHtml(message)}</p>
            <div class="scan-debug">
              <span class="debug-label">Tag UID read</span>
              <span class="debug-value">${escapeHtml(normalizedUid)}</span>
              <span class="debug-label">API URL tried</span>
              <span class="debug-value">${escapeHtml(lookupUrl)}</span>
            </div>
            <button class="btn-primary" id="scan-back-btn">Back to Batteries</button>
          </div>
        </div>
      `;
      document.getElementById("scan-back-btn").onclick = () => {
        window.location.hash = "#dashboard";
      };
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Web NFC (Android Chrome only) ────────────────────────────────

export async function startNfcListener() {
  if (!("NDEFReader" in window)) return;
  try {
    const reader = new NDEFReader();
    await reader.scan();
    reader.addEventListener("reading", ({ serialNumber }) => {
      if (serialNumber) handleNfcScan(serialNumber);
    });
    console.log("NFC listener active");
  } catch (e) {
    console.warn("NFC scan not available:", e.message);
  }
}

// ── Boot ──────────────────────────────────────────────────────────

window.addEventListener("hashchange", route);
window.addEventListener("load", () => {
  route();
  startNfcListener();
});

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(console.error);
}
