import { renderDashboard } from "./views/dashboard.js";
import { renderBattery } from "./views/battery.js";
import { renderEditBattery } from "./views/edit-battery.js";
import { renderLogEvent } from "./views/log-event.js";
import { renderRegister } from "./views/register.js";
import { renderRobots } from "./views/robots.js";
import { renderRotation } from "./views/rotation.js";
import { renderCompetitions } from "./views/competitions.js";

const container = document.getElementById("app");

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

  // NFC tap arrives as /scan/{uid} — only handle when no hash view is set yet.
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
