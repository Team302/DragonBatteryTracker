# FRC Battery PWA

Mobile-first Progressive Web App for the FRC Battery Tracker. Installable on Android and iOS directly from the browser.

---

## Structure

```
frc-battery-pwa/
├── index.html          # App shell, nav bar, QR scan modal
├── manifest.json       # PWA manifest (install, icons, theme)
├── sw.js               # Service worker (offline support, caching)
├── nginx.conf          # Nginx config for Docker
├── Dockerfile
├── css/
│   └── app.css         # All styles — dark industrial theme
├── js/
│   ├── app.js          # Router, NFC listener, SW registration
│   ├── api.js          # API client (all fetch calls)
│   └── views/
│       ├── dashboard.js    # Fleet overview with stats
│       ├── battery.js      # Battery detail + IR trend chart
│       ├── log-event.js    # Event logging form
│       └── register.js     # Register new battery + QR scanner
└── icons/
    ├── icon-192.png    # ← you need to add these
    └── icon-512.png
```

---

## Setup

### 1. Set host/API in `.env`

Set these in the repository root `.env` file:

```dotenv
PUBLIC_HOST=https://your-hostname.example.com
API_BASE=/api
```

- `PUBLIC_HOST` is your externally reachable hostname and is exposed to the PWA as `window.PUBLIC_HOST`.
- `API_BASE` defaults to `/api`, which works with the included nginx reverse proxy to the FastAPI container.
- If your frontend and API are on different domains, set `API_BASE` to a full origin (for example `https://api.example.com`).

### 2. Add icons

Add `icons/icon-192.png` and `icons/icon-512.png` for the install icon. Any FRC team logo works — use a square image.

### 3. Run with Docker

From the repo root (where the top-level `docker-compose.yml` lives):
```bash
docker compose up --build
```

- PWA: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

---

## NFC Tags

### Android (Chrome)
NFC scanning works automatically in the background via the Web NFC API (`NDEFReader`). When a tag is tapped, the app looks up the UID and navigates to the battery page. No interaction needed.

### iOS
Web NFC is not supported on iOS. Use QR codes instead — tap the **Scan** button in the nav bar.

### Programming tags
Each tag should encode a URL:
```
https://YOUR_HOST/scan/YOUR_TAG_UID
```
Or just encode the UID as plain text — the app handles both.

### On-metal mounting
NFC tags don't work directly on metal surfaces. Use:
- A small foam spacer (3–5mm) between the tag and the battery casing
- On-metal NFC tags (slightly thicker, designed for this)
- Mount on the label area or a plastic housing

---

## QR Codes

Generate a QR code per battery encoding the scan URL:
```
https://YOUR_HOST/scan/BAT-01
```
Or use the battery's NFC UID as the QR content so both methods resolve the same battery.

Free QR generators: [qr-code-generator.com](https://www.qr-code-generator.com), or generate in bulk with a Python script using the `qrcode` library.

---

## Installing as PWA

**Android Chrome:** Tap the "Add to Home Screen" banner or use the browser menu → Install App.

**iOS Safari:** Tap Share → Add to Home Screen.

Once installed, the app opens full-screen with no browser chrome, exactly like a native app.
