import { renderDashboard } from "./views/dashboard.js";
import { renderBattery } from "./views/battery.js";
import { renderLogEvent } from "./views/log-event.js";
import { renderRegister } from "./views/register.js";

const container = document.getElementById("app");

// ── Router ────────────────────────────────────────────────────────

const ROUTES = {
  dashboard: renderDashboard,
  battery: renderBattery,
  "log-event": renderLogEvent,
  register: renderRegister,
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
  return { view: view || "dashboard", params };
}

async function route() {
  const { view, params } = parseHash();

  // NFC tap arrives as /scan/{uid} — handle via URL path
  if (window.location.pathname.startsWith("/scan/")) {
    const uid = window.location.pathname.split("/scan/")[1];
    await handleNfcScan(uid);
    return;
  }

  // QR code may encode a full URL like https://host/scan/UID
  // handled server-side redirect, but also handle hash-based
  if (view === "scan" && params.uid) {
    await handleNfcScan(params.uid);
    return;
  }

  const renderer = ROUTES[view] || renderDashboard;
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
  container.innerHTML = `<div class="scan-splash"><div class="loading-ring"></div><p>Looking up battery…</p></div>`;
  try {
    const { api } = await import("./api.js");
    const battery = await api.getBatteryByNfc(uid);
    navigate("battery", { id: battery.id });
  } catch (e) {
    if (e.message.includes("not registered")) {
      navigate("register", { uid });
    } else {
      container.innerHTML = `<div class="error-msg">⚠ ${e.message}</div>`;
    }
  }
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
