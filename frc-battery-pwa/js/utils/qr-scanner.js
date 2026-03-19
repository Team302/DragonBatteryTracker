/**
 * Set up a reusable QR code scanner.
 * @param {string} nfcInputId - ID of the input field to populate with scanned UID
 * @param {string} scanBtnId - ID of the scan button
 * @param {string} overlayId - ID of the overlay container
 * @param {string} videoId - ID of the video element
 * @param {string} canvasId - ID of the hidden canvas
 * @param {string} closeId - ID of the close button
 */
export function setupQrScanner(nfcInputId, scanBtnId, overlayId, videoId, canvasId, closeId) {
  const overlay = document.getElementById(overlayId);
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  const scanBtn = document.getElementById(scanBtnId);
  const closeBtn = document.getElementById(closeId);
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
            document.getElementById(nfcInputId).value = codes[0].rawValue;
            stopScanner();
          }
        });
      }
    }
    animFrame = requestAnimationFrame(scanFrame);
  }
}
