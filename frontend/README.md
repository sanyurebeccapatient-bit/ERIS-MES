# ERIS MES — Field Platform (Frontend)

A mobile-first Progressive Web App for caregivers, community health workers, and ERIS MES center managers. This is the **frontend only** — built so a Node/Express + MongoDB backend can be dropped in later without any refactor.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — build tool, dev server
- **Vue Router 4** — lazy-loaded, code-split routes
- **Pinia** — state management
- **Tailwind CSS 3** — utility-first styling with a custom design token system
- **Dexie.js** — IndexedDB wrapper for offline storage and sync queue
- **Chart.js / vue-chartjs** — admin analytics charts
- **vite-plugin-pwa** — installable, offline-capable PWA with service worker

## Getting started

```bash
npm install
npm run dev       # start dev server at https://eris-mes.vercel.app
npm run build      # production build to /dist
npm run preview    # preview the production build locally
```

## Project structure

```
src/
  components/
    ui/            Base components: Button, Card, Badge, SyncIndicator, Skeletons, EmptyState
    layout/         Shells: CaregiverShell (mobile), AdminShell (desktop), nav bars
    dashboard/      Stat tiles, KPI cards, visit list items
    forms/          Step wizard progress, form fields, photo capture
    charts/         Chart.js wrapper components
  views/
    caregiver/      Mobile-first screens: Dashboard, Children, Attendance, Visits, New Report, Notifications, Profile
    admin/          Desktop-first screens: Admin Dashboard + placeholders for future modules
    auth/           Login
  stores/           Pinia stores: auth, dashboard, sync
  services/
    api/            API abstraction layer (see below — THIS IS THE IMPORTANT PART)
    offline/        Dexie database + sync queue engine
  composables/       useGeolocation, useCameraCapture
  router/            Route definitions
  constants/          Shared enums (roles, statuses) — mirror these in backend schemas later
```

## How the frontend is wired for an easy backend handoff

**Everything goes through one file: `src/services/api/client.js`.**

No component or Pinia store ever imports axios or touches mock data directly. They call functions like `getCaregiverDashboard()` from a service module (e.g. `src/services/api/dashboard.service.js`), and that service calls `apiClient.get(...)`.

Right now, `USE_MOCK_API` (in `src/constants/index.js`) is `true`, so `apiClient` routes every call through `src/services/api/mockAdapter.js`, which simulates a REST API against in-memory data in `mockData.js` — including realistic network latency.

### To connect a real backend later:

1. Build the Express API. Each service file has JSDoc comments documenting the exact request/response shape expected, for example:
   ```js
   /**
    * GET /api/dashboard/caregiver
    * @returns {{ childrenAssigned: number, attendanceToday: {...}, ... }}
    */
   ```
   Match these shapes and the frontend needs zero changes.
2. Set `USE_MOCK_API = false` in `src/constants/index.js`.
3. Create a `.env` file: `VITE_API_BASE_URL=https://your-api.example.com/api`
4. Done. Auth token attachment, error normalization, and offline queueing (see below) all already work against the real client.

The mock route table in `mockData.js` (`routeTable`) is deliberately laid out like Express routes (`GET /children/:id` etc.) so it doubles as a spec you can hand directly to backend implementation.

## Offline-first architecture

- `src/services/offline/db.js` — Dexie/IndexedDB schema: cached reads (children, visits, attendance...) plus two write-oriented tables: `drafts` (in-progress forms, autosaved) and `syncQueue` (writes waiting to reach the server).
- `src/services/offline/syncEngine.js` — `queueWrite()` is called by views instead of writing directly; it queues to IndexedDB immediately (optimistic UI) and `flushQueue()` replays the queue through `apiClient` when back online. This already works end-to-end against the mock API and requires no changes when the real backend arrives.
- `src/stores/sync.js` — Pinia store tracking sync status (`offline` / `pending` / `syncing` / `synced` / `failed`), consumed by the `SyncIndicator` component shown throughout the app.

## Design system

Color palette, type scale, spacing, and shadows are defined centrally in `tailwind.config.js`. Rationale:

- **Primary teal** (`#0F6B5C`) — trust and health, calmer than clinical blue.
- **Accent amber** (`#F2A93B`) — high visibility outdoors/in sunlight, used for primary actions (the report FAB, attendance CTAs).
- **Warm off-white surfaces** instead of pure white — easier on the eyes for long field use.
- **Sora + Inter** typography — a slightly rounded, humanist display face paired with a highly legible UI/body face, tuned for small-screen readability.
- **Signature element**: the sync pulse indicator (`SyncIndicator.vue`) appears in every top bar. Since this product's core promise is "it works without internet," a persistent, honest sync-status signal is the one visual thread that ties every screen together.

## Mobile-first implementation notes

- Bottom navigation + centered FAB for primary mobile nav (`BottomNav.vue`), replaced by a full sidebar at `md:` breakpoint and above (`AdminSidebar.vue` for the admin console).
- All interactive elements meet the 48px minimum touch target (`touch-target` / `h-touch` utilities in Tailwind config).
- Forms use large inputs, a step wizard with autosave-to-IndexedDB (`NewReportView.vue`), GPS capture (`useGeolocation`), and client-side photo compression before queueing for upload (`useCameraCapture`).
- Sticky bottom action bars keep primary actions in the thumb zone.
- Skeleton loaders and empty states are implemented as reusable components, used consistently rather than ad hoc spinners.

## What's built vs. what's next

**Built:** Caregiver dashboard, Children list, Attendance (with offline quick-mark), Visits, New Report wizard (4-step, autosave, GPS, photo), Notifications, Profile (dark mode, emergency contacts), Login, 404, Admin dashboard (KPIs, attendance trend chart, alerts table), full offline sync queue foundation, PWA manifest + service worker.

**Not yet built (placeholders in place):** Admin sub-modules (Caregivers, Centers, Reports, Health alerts, Audit log — currently show a "coming soon" empty state so routing/nav is fully wired), push notifications, QR/barcode scanning (UI entry point exists, scanning logic not implemented), signature capture, voice notes, command palette, conflict resolution UI for sync failures.

**No backend exists yet.** All data is served from `mockData.js`. See "How the frontend is wired for an easy backend handoff" above.
