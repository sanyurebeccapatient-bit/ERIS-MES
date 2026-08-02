# ERIS MES — Backend API

Node.js/Express + MongoDB backend for the ERIS MES field platform. Built to match the contracts documented in the frontend's `src/services/api/*.service.js` files exactly — connecting the frontend is a two-line change (see the frontend README).

## Stack

- **Express 5** — HTTP framework
- **Mongoose 9** — MongoDB ODM
- **JWT** (access + refresh tokens) — auth
- **bcryptjs** — PIN hashing
- **Multer + Sharp** — photo upload, compression, EXIF/GPS stripping
- **web-push** — push notifications (optional, works without VAPID keys configured — just no-ops)
- **Socket.IO** — real-time admin dashboard updates (live attendance, new health alerts)
- **express-validator** — request validation
- **helmet, cors, express-rate-limit, compression, morgan** — security & ops essentials

## Getting started

```bash
npm install
cp .env.example .env     # then edit values, especially JWT secrets and MONGO_URI
npm run seed              # populates the database with demo data
npm run dev                # starts on https://www.eris-mes.onrender.com with auto-reload
```

Health check: `GET https://www.eris-mes.onrender.com/api/health`

### Seed accounts

After `npm run seed`:

| Role | Phone | PIN |
|---|---|---|
| Caregiver | +250788123456 | 1234 |
| Admin | +250788999000 | 1234 |

## Project structure

```
src/
  config/        env loader, MongoDB connection
  models/        Mongoose schemas (User, Center, Child, Attendance, Visit,
                 HealthAlert, Meal, Report, Notification, EmergencyContact, AuditLog)
  controllers/    Route handlers, grouped by domain
  routes/         Express routers, mounted under /api in routes/index.js
  middleware/     auth (JWT), error handling, validation, upload, rate limiting
  services/       image processing, push notifications, Socket.IO
  utils/          AppError, asyncHandler, token helpers, audit logging, seed script
  app.js          Express app assembly (middleware stack + routes)
  server.js       Entry point — HTTP server, DB connection, graceful shutdown
```

## Authentication

Phone + PIN login (matches the frontend's login screen). Returns a short-lived access token (15 min default) and a longer-lived refresh token (30 days default, stored server-side per device so it can be revoked).

```
POST /api/auth/login    { phone, pin }        -> { user, accessToken, refreshToken }
POST /api/auth/refresh  { refreshToken }      -> { accessToken }
POST /api/auth/logout   { refreshToken }      (requires Authorization header)
GET  /api/auth/me                              (requires Authorization header)
```

Send the access token as `Authorization: Bearer <token>` on all other requests.

## API reference

All routes below are prefixed with `/api` and require authentication unless noted.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | No auth. Liveness check. |
| GET | `/children` | Scoped to caller's center unless admin/supervisor |
| GET | `/children/:id` | |
| POST | `/children` | center_manager/supervisor/admin only |
| PUT | `/children/:id` | center_manager/supervisor/admin only |
| DELETE | `/children/:id` | Soft delete. supervisor/admin only |
| GET | `/attendance/today?date=` | |
| POST | `/attendance` | Idempotent via `clientRecordId` — safe for offline sync retries |
| GET | `/visits?status=` | |
| GET | `/visits/upcoming` | |
| POST | `/visits` | |
| PATCH | `/visits/:id` | |
| GET | `/health-alerts?status=&severity=` | |
| POST | `/health-alerts` | Notifies supervisors + emits socket event for high/critical |
| PATCH | `/health-alerts/:id` | |
| GET | `/meals/today?date=` | |
| POST | `/meals` | |
| POST | `/reports` | Idempotent via `clientRecordId`. Attempts to match child by name. |
| GET | `/reports?status=` | Own reports for caregivers; all for admin |
| PATCH | `/reports/:id/review` | admin/supervisor only |
| GET | `/notifications` | |
| PATCH | `/notifications/:id/read` | |
| POST | `/notifications/subscribe` | Registers a Web Push subscription |
| GET | `/emergency-contacts` | Global + caller's center |
| GET | `/dashboard/caregiver` | |
| GET | `/dashboard/admin` | admin/supervisor only |
| GET | `/centers` | |
| POST | `/upload/photo` | multipart/form-data, field `photo`, optional `context` |
| POST | `/upload/avatar` | multipart/form-data, field `photo` |
| GET/POST/PATCH/DELETE | `/admin/users` | admin/supervisor only |
| GET/POST/PATCH | `/admin/centers` | admin/supervisor only |
| GET | `/admin/audit-log?action=` | admin/supervisor only |

## Offline-sync idempotency

The frontend's `syncEngine.js` queues writes locally and retries them on reconnect. If a retry happens after a write that actually succeeded (e.g. the response was lost but not the write), a naive API would create a duplicate record. To prevent this:

- `Attendance`, `Visit`, `Report` all accept an optional `clientRecordId` generated on the device.
- On `POST`, the controller checks for an existing record with that ID first and returns it unchanged (200) instead of creating a duplicate (201).
- `Attendance` and `Meal` additionally have compound unique indexes (`child + date`, `child + date + type`) as a second line of defense.

## Real-time updates

Socket.IO is initialized in `services/socket.js`. Admin/supervisor clients that connect with a valid JWT in `socket.handshake.auth.token` are placed in an `admin` room and receive:

- `attendance:recorded` — whenever any caregiver logs attendance
- `health-alert:created` — whenever a new health alert is raised

Caregiver clients don't need a socket connection — they're offline-first by design and sync on their own schedule.

## File uploads

`POST /api/upload/photo` accepts a single `photo` file (JPEG/PNG/WebP/HEIC, max 8MB by default) plus an optional `context` field (`reports`, `visits`, `health`, `children`). Images are:

1. Auto-rotated based on EXIF orientation
2. Resized to fit within 1200×1200 (preserves aspect ratio, never upscales)
3. Re-encoded as JPEG (quality 78, mozjpeg) — this also strips EXIF/GPS metadata, which matters for guardian/child privacy
4. Saved under `/uploads/<context>/` and served statically at that path

This is a dedicated endpoint per upload purpose, mirroring the fix applied in CardNova Studio where record photos were leaking into an unrelated background-image picker — keeping upload contexts separate at the API level prevents that class of bug here too.

## Security notes for production

- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env` — the defaults are placeholders and will log a warning if left unset.
- Set `NODE_ENV=production` so error responses stop including stack traces.
- Put this behind HTTPS; set `CORS_ORIGIN` to your real frontend domain(s), comma-separated for multiple.
- Consider adding request logging shipping (e.g. to a log aggregator) beyond the current `morgan` console output.
- The `uploads/` directory is served from local disk by default — for a horizontally-scaled deployment, swap `imageService.js` to write to S3/Cloudflare R2/Backblaze B2 instead (the function signatures are already isolated to make this a contained change).
