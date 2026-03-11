// Base URL — in production this points to your FastAPI container
const BASE = window.API_BASE || "http://localhost:8000";

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Batteries
  listBatteries: (retired = null) => {
    const q = retired !== null ? `?retired=${retired}` : "";
    return request("GET", `/batteries/${q}`);
  },
  getBattery: (id) => request("GET", `/batteries/${id}`),
  getBatteryByNfc: (uid) => request("GET", `/batteries/nfc/${encodeURIComponent(uid)}`),
  createBattery: (data) => request("POST", "/batteries/", data),
  updateBattery: (id, data) => request("PATCH", `/batteries/${id}`, data),

  // Events
  logEvent: (batteryId, data) => request("POST", `/batteries/${batteryId}/events/`, data),
  getEvents: (batteryId, type = null) => {
    const q = type ? `?event_type=${type}` : "";
    return request("GET", `/batteries/${batteryId}/events/${q}`);
  },

  // Dashboard
  getDashboard: () => request("GET", "/dashboard/"),
  getIrTrend: (batteryId) => request("GET", `/dashboard/battery/${batteryId}/ir-trend`),
  getStats: () => request("GET", "/dashboard/stats"),
};
