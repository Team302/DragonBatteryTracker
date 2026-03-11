# FRC Battery Tracker

A FastAPI + PostgreSQL app for tracking FRC robot battery health, charge cycles, and match usage via NFC tags.

---

## Project Structure

```
frc-battery-tracker/
├── app/
│   ├── main.py           # FastAPI app, lifespan, middleware
│   ├── config.py         # Settings (IR thresholds, DB URL)
│   ├── database.py       # Async SQLAlchemy engine + session
│   ├── models/
│   │   ├── models.py     # Battery + Event ORM models
│   │   └── schemas.py    # Pydantic request/response schemas
│   └── routers/
│       ├── batteries.py  # Battery CRUD + NFC lookup
│       ├── events.py     # Event logging per battery
│       └── dashboard.py  # Summary, IR trend, fleet stats
├── alembic/              # DB migrations
├── requirements.txt
└── .env.example
```

---

## Setup

### 1. Install dependencies

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Postgres URL and settings
```

### 3. Create the database

Using Supabase, Railway, or a local Postgres instance. Then run migrations:

```bash
alembic upgrade head
```

Or let the app auto-create tables on first run (development only).

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for the interactive API docs.

---

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/batteries/` | Register a new battery |
| GET | `/batteries/` | List all batteries |
| GET | `/batteries/nfc/{uid}` | Look up battery by NFC tag UID |
| PATCH | `/batteries/{id}` | Update battery (assign NFC UID, retire, etc.) |
| POST | `/batteries/{id}/events/` | Log an event (charge, match, beak_check, etc.) |
| GET | `/batteries/{id}/events/` | Get event history for a battery |
| GET | `/dashboard/` | All batteries with health summary |
| GET | `/dashboard/battery/{id}/ir-trend` | IR readings over time for charting |
| GET | `/dashboard/stats` | Fleet-wide totals |

---

## NFC Flow

1. Program NFC tags with URL: `https://yourapp.com/scan/{nfc_uid}`
2. On tap, your frontend calls `GET /batteries/nfc/{nfc_uid}` to find the battery
3. If not found, redirect to registration page and call `PATCH /batteries/{id}` to assign the UID
4. Show the battery's health page and quick-log form

---

## Event Types

- `charge` — battery plugged into charger
- `match` — used in a competition match (include `match_number`)
- `practice` — used in practice/drive time
- `beak_check` — Battery Beak reading (include `voltage` and `internal_resistance`)
- `incident` — dropped, over-discharged, or other notable event
- `retired` — marks battery as retired (also sets `battery.retired = true`)

---

## IR Health Thresholds

Configured in `.env`:

```
IR_WARN_THRESHOLD=22.0    # mΩ — flag for monitoring
IR_RETIRE_THRESHOLD=30.0  # mΩ — recommend retirement
```

---

## Deployment

**Recommended free tier stack:**
- Database: [Supabase](https://supabase.com) (Postgres, generous free tier)
- Backend: [Railway](https://railway.app) or [Render](https://render.com)
- Frontend: Any static host (Vercel, Netlify, GitHub Pages)

For Railway, set your `DATABASE_URL` environment variable in the dashboard and deploy directly from GitHub.
