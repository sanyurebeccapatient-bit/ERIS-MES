# ERIS MES — Field Platform

A full-stack platform for caregivers, community health workers, and ERIS MES center managers to track attendance, home visits, health alerts, meals, and reports — mobile-first, offline-capable, with a desktop-first admin console.

This archive contains two projects:

```
ecd-platform/    Vue 3 frontend (PWA, mobile-first)
ecd-backend/     Node/Express + MongoDB API
```

Each has its own README with full setup instructions. Quick start below.

## Quick start (both projects)

### 1. Backend

```bash
cd ecd-backend
npm install
cp .env.example .env
# Edit .env — set MONGO_URI to a running MongoDB instance (local or Atlas),
# and change JWT_SECRET / JWT_REFRESH_SECRET to random strings.
npm run seed      # populates demo data + two test accounts
npm run dev         # starts on https://eris-mes.onrender.com
```

### 2. Frontend

```bash
cd ecd-platform
npm install
```

By default the frontend runs against **mock data** (no backend required) — good for UI work in isolation. To connect it to the real backend:

1. Open `src/constants/index.js` and set `USE_MOCK_API = false`
2. Create `ecd-platform/.env` with:
   ```
   VITE_API_BASE_URL=https://eris-mes.onrender.com/api
   ```
3. `npm run dev` — the app now talks to your running backend

### 3. Log in

With the seed script run, use either test account (buttons pre-fill these on the login screen too):

| Role | Phone | PIN |
|---|---|---|
| Caregiver | +250788123456 | 1234 |
| Admin | +250788999000 | 1234 |

Caregiver → mobile dashboard at `/app/dashboard`. Admin → desktop dashboard at `/admin/dashboard`.

## What's implemented

**Backend (full REST API, MongoDB-backed):**
- JWT auth (phone + PIN login, access + refresh tokens, revocable sessions)
- Children, Attendance, Visits, Health Alerts, Meals, Reports, Notifications, Emergency Contacts — full CRUD where applicable
- Admin: user management (with role-change audit logging), center management, audit log viewer
- Photo upload pipeline (resize, compress, strip EXIF/GPS, dedicated endpoint per context)
- Idempotent writes for offline-sync safety (`clientRecordId` dedup on Attendance/Visit/Report)
- Real-time updates to admin dashboards via Socket.IO (live attendance, new health alerts)
- Web Push notification support (optional — works without VAPID keys configured, just no-ops)
- Rate limiting, helmet, CORS, centralized error handling, request validation

**Frontend (Vue 3 PWA):**
- Caregiver: Dashboard, Children, Attendance, Visits, New Report wizard (GPS + photo capture, autosave), Notifications, Profile
- Admin: KPI dashboard, attendance trend chart, health alerts table, and full sub-modules — Caregivers (user management with search/filter/deactivate), Centers (enrollment/occupancy cards), Reports (approve/reject/under-review workflow), Health Alerts (severity triage, resolve), Audit Log (timeline view)
- Real login flow wired to the backend, with automatic token refresh on expiry and route guards
- Response normalization layer so the same components work unmodified against both the mock API (`id` fields, flat strings) and the real MongoDB-backed API (`_id` fields, populated refs) — see `src/services/api/client.js`
- Offline-first: IndexedDB write queue that syncs automatically on reconnect
- Installable PWA (manifest + service worker, offline asset caching)
- Full design system (Tailwind tokens, reusable components) — see `ecd-platform/README.md` for the design rationale

## What's not yet built

- QR/barcode scanning logic (UI entry point exists in Attendance view; no scanning library wired in)
- Signature capture, voice notes
- Push notification subscription UI on the frontend (backend endpoint exists: `POST /api/notifications/subscribe`)
- Conflict resolution UI for failed syncs (the sync engine tracks failures; no UI surfaces them yet)
- "Add user" / "Add center" create forms in the admin console (buttons are present; the list/filter/edit/deactivate flows are wired, creation modals are not)
- Automated tests (unit/integration/e2e)
- CI/CD, containerization, deployment configs

## Architecture notes

The frontend and backend were deliberately built to match exactly, contract-first: the frontend's mock API (`ecd-platform/src/services/api/mockData.js`) was written to mirror the same route shapes as the real Express routes, so connecting them required no frontend refactor — just a flag flip and an env var. See `ecd-platform/README.md` → "How the frontend is wired for an easy backend handoff" for details.
