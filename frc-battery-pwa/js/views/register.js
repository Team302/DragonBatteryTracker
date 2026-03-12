import { api } from "../api.js";
import { navigate } from "../app.js";

export async function renderRegister(container, params = {}) {
  // If we landed here from an NFC/QR scan with an unknown UID, pre-fill it
  const pendingUid = params.uid || "";

  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="view-title">Register Battery</h1>
      <div></div>
    </div>

    <div class="form-section">
      <label class="form-label" for="f-label">Battery Label <span class="required">*</span></label>
      <input class="form-input" id="f-label" type="text" placeholder="BAT-01" maxlength="50" autofocus>
    </div>

    <div class="form-section">
      <label class="form-label" for="f-nfc">NFC / QR Tag UID</label>
      <div class="input-row">
        <input class="form-input" id="f-nfc" type="text" placeholder="Scan or enter tag UID" value="${pendingUid}">
        <button class="btn-scan" id="scan-qr-btn" title="Scan QR code">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 14h3"/><path d="M14 17v3"/><path d="M17 17h3v3"/></svg>
        </button>
      </div>
      <span class="form-hint">Leave blank to assign the tag later</span>
    </div>

    <div class="form-section">
      <label class="form-label" for="f-mfr">Manufacturer</label>
      <input class="form-input" id="f-mfr" type="text" placeholder="MK Battery, Werker, etc.">
    </div>

    <div class="form-section">
      <label class="form-label" for="f-model">Battery Model</label>
      <input class="form-input" id="f-model" type="text" placeholder="ES17-12, NP18-12B, etc.">
    </div>

    <div class="form-section">
      <label class="form-label" for="f-cap">Capacity (Ah)</label>
      <input class="form-input" id="f-cap" type="number" step="0.1" placeholder="18.0">
    </div>

    <div class="form-section">
      <label class="form-label" for="f-purchased">Purchase Date</label>
      <input class="form-input" id="f-purchased" type="date">
    </div>

    <button class="btn-primary btn-full" id="submit-btn">Register Battery</button>
    <div id="form-error" class="form-error"></div>

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

  document.getElementById("back-btn").onclick = () => navigate("dashboard");

  document.getElementById("submit-btn").onclick = async () => {
    const label = document.getElementById("f-label").value.trim();
    if (!label) {
      document.getElementById("form-error").textContent = "Battery label is required";
      return;
    }

    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.textContent = "Registering...";

    const nfc = document.getElementById("f-nfc").value.trim();
    const mfr = document.getElementById("f-mfr").value.trim();
    const model = document.getElementById("f-model").value.trim();
    const cap = document.getElementById("f-cap").value;
    const purchased = document.getElementById("f-purchased").value;

    const payload = { label };
    if (nfc) payload.nfc_uid = nfc;
    if (mfr) payload.manufacturer = mfr;
    if (model) payload.battery_model = model;
    if (cap) payload.capacity_ah = parseFloat(cap);
    if (purchased) payload.purchased = new Date(purchased).toISOString();

    try {
      const battery = await api.createBattery(payload);
      navigate("battery", { id: battery.id });
    } catch (e) {
      document.getElementById("form-error").textContent = e.message;
      btn.disabled = false;
      btn.textContent = "Register Battery";
    }
  };

  setupQrScanner();
}

function setupQrScanner() {
  const overlay = document.getElementById("qr-overlay");
  const video = document.getElementById("qr-video");
  const canvas = document.getElementById("qr-canvas");
  const scanBtn = document.getElementById("scan-qr-btn");
  const closeBtn = document.getElementById("close-qr");
  let stream = null;
  let animFrame = null;

  scanBtn.onclick = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      overlay.classList.remove("hidden");
      scanFrame();
    } catch {
      alert("Camera access denied or unavailable.");
    }
  };

  closeBtn.onclick = stopScanner;

  function stopScanner() {
    stream?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(animFrame);
    overlay.classList.add("hidden");
  }

  function scanFrame() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);

      // Use the BarcodeDetector API if available (Chrome Android, modern browsers)
      if ("BarcodeDetector" in window) {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        detector.detect(canvas).then((codes) => {
          if (codes.length > 0) {
            document.getElementById("f-nfc").value = codes[0].rawValue;
            stopScanner();
          }
        });
      }
    }
    animFrame = requestAnimationFrame(scanFrame);
  }
}
