// Default to same-origin API path; can be overridden via window.API_BASE.
const BASE = (window.API_BASE || "/api").replace(/\/$/, "");

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let message = "Request failed";
    
    if (err.detail) {
      // Handle validation errors (array of error objects)
      if (Array.isArray(err.detail)) {
        message = err.detail
          .map((e) => `${e.loc?.join(" → ") || "field"}: ${e.msg}`)
          .join("; ");
      } else {
        // Handle simple error messages
        message = err.detail;
      }
    }
    
    throw new Error(message);
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

  // Robots
  listRobots: (active = null) => {
    const q = active !== null ? `?active=${active}` : "";
    return request("GET", `/robots/${q}`);
  },
  getRobot: (id) => request("GET", `/robots/${id}`),
  createRobot: (data) => request("POST", "/robots/", data),
  updateRobot: (id, data) => request("PATCH", `/robots/${id}`, data),
  deleteRobot: (id) => request("DELETE", `/robots/${id}`),

  // Competitions
  listCompetitions: () => request("GET", "/competitions/"),
  getActiveCompetition: () => request("GET", "/competitions/active"),
  getCompetition: (id) => request("GET", `/competitions/${id}`),
  createCompetition: (data) => request("POST", "/competitions/", data),
  updateCompetition: (id, data) => request("PATCH", `/competitions/${id}`, data),
  activateCompetition: (id) => request("POST", `/competitions/${id}/activate`),
  deactivateCompetition: (id) => request("POST", `/competitions/${id}/deactivate`),
  getCompetitionSummary: (id) => request("GET", `/competitions/${id}/summary`),

  // Rotation
  updateRotation: (batteryId, status) =>
    request("PATCH", `/batteries/${batteryId}/rotation`, { rotation_status: status }),

  // Dashboard
  getDashboard: () => request("GET", "/dashboard/"),
  getIrTrend: (batteryId) => request("GET", `/dashboard/battery/${batteryId}/ir-trend`),
  getStats: () => request("GET", "/dashboard/stats"),
};
