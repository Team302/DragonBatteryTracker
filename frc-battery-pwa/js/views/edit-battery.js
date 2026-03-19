import { api } from "../api.js";
import { navigate } from "../app.js";
import { setupQrScanner } from "../utils/qr-scanner.js";

export async function renderEditBattery(container, { id }) {
  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="view-title">Edit Battery</h1>
      <div></div>
    </div>

    <div id="edit-body"><div class="loading-ring"></div></div>

    <!-- QR Scanner overlay -->
    <div id="qr-overlay" class="qr-overlay hidden">
      <div class="qr-modal">
        <div class="qr-header">
          <span>Scan QR Code</span>
          <button id="close-qr">✕</button>
        </div>
        <video id="qr-video" playsinline autoplay></video>
        <canvas id="qr-canvas" hidden></canvas>
        <p class="qr-hint">Point camera at the QR code on the battery</p>
      </div>
    </div>
  `;

  document.getElementById("back-btn").onclick = () => navigate("battery", { id });

  try {
    const battery = await api.getBattery(id);

    document.getElementById("edit-body").innerHTML = `
      <div class="form-section">
        <label class="form-label" for="f-label">Battery Label <span class="required">*</span></label>
        <input class="form-input" id="f-label" type="text" placeholder="BAT-01" maxlength="50" value="${battery.label}" autofocus>
      </div>

      <div class="form-section">
        <label class="form-label" for="f-nfc">NFC / QR Tag UID</label>
        <div class="input-row">
          <input class="form-input" id="f-nfc" type="text" placeholder="Scan or enter tag UID" value="${battery.nfc_uid || ""}">
          <button class="btn-scan" id="scan-qr-btn" title="Scan QR code">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 14h3"/><path d="M14 17v3"/><path d="M17 17h3v3"/></svg>
          </button>
        </div>
        <span class="form-hint">Leave blank to remove the tag assignment</span>
      </div>

      <button class="btn-primary btn-full" id="submit-btn">Save Changes</button>
      <div id="form-error" class="form-error"></div>
    `;

    document.getElementById("submit-btn").onclick = async () => {
      const label = document.getElementById("f-label").value.trim();
      if (!label) {
        document.getElementById("form-error").textContent = "Battery label is required";
        return;
      }

      const btn = document.getElementById("submit-btn");
      btn.disabled = true;
      btn.textContent = "Saving...";

      const nfc = document.getElementById("f-nfc").value.trim();

      const payload = { label };
      if (nfc) {
        payload.nfc_uid = nfc;
      } else {
        payload.nfc_uid = null;
      }

      try {
        await api.updateBattery(id, payload);
        navigate("battery", { id });
      } catch (e) {
        document.getElementById("form-error").textContent = e.message;
        btn.disabled = false;
        btn.textContent = "Save Changes";
      }
    };

    setupQrScanner("f-nfc", "scan-qr-btn", "qr-overlay", "qr-video", "qr-canvas", "close-qr");
  } catch (e) {
    container.innerHTML = `<div class="error-msg">⚠ Failed to load battery: ${e.message}</div>`;
  }
}
