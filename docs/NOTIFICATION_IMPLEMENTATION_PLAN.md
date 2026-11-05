# LifeAdmin — Notification Implementation Plan (Phased)

> **Status:** Design / proposal only. No code, dependency, or infrastructure changes are applied by this document.  
> **Companion docs:** `docs/NOTIFICATION_ARCHITECTURE.md`, `docs/NOTIFICATION_DATABASE_SCHEMA.md`.  
> **Guardrails:** preserve existing stack (React 19/Vite/Tailwind 4/Axios/React Hot Toast/TanStack Query; Express 5/Mongoose/JWT); no Next.js/Supabase/Firebase/Prisma/foreign backend migrations; no paywalls; Calendar vs Appointments remain distinct; Ocean Teal light / Deep Ocean dark; smallest complete changes; no secrets in repo; dependency additions require explicit approval.

---

## 1. Delivery Strategy

Implement in **small, verifiable increments**. Each phase should leave the app working, keep existing `/api/notifications` and `/api/reminders` behavior compatible, and add tests/checks for non-trivial logic (dedupe, time windows, quiet hours, permission state handling).

**Recommended order:** preferences/data model foundation → in-app notification service + center → scheduled engine → automatic engine → web push/PWA → optional email → hardening/observability.

---

## 2. Phase 0 — Decisions & Prerequisites (before coding)

| Item | Decision needed | Output |
|---|---|---|
| Scheduler approach | `node-cron` vs timer vs durable queue; single vs multi-instance | Approved dependency/ops note |
| Push library | `web-push` (likely) + VAPID key management | Env var names documented; keys generated outside repo |
| PWA scope | Manifest + push-only SW vs full offline caching | SW caching strategy that won't break Vite auth/API flows |
| Preferences storage | Embedded `User.notificationPreferences` vs separate collection | Schema/migration choice |
| Timezone source | Add `User.timezone`/preference, default fallback (e.g., browser-sent or `Asia/Kolkata`/UTC — product decision) | Consistent evaluation/display rule |
| Quiet-hours API | Extend `PUT /api/users/settings` and/or add `/api/notifications/preferences` | Backward-compatible settings contract |
| Account data lifecycle | Include push subscriptions/preferences in export/delete | Compliance/data-portability checklist |

**Exit criteria:** approved dependency list, env var contract, schema naming decisions, and migration compatibility plan.

---

## 3. Phase 1 — Foundation: Schemas, Preferences, and Notification Service Core

### 3.1 Backend
- Evolve `Notification` model with backward-compatible fields (`category`, `priority`, `sourceType/sourceId`, `dedupeKey`, `occurrenceAt`, `status`, `channels`, `actionUrl`, `sourceSnapshot`) and defaults for legacy records.
- Add `notificationPreferences` (embedded or collection) and align with existing `User.notificationsEnabled/defaultReminderTiming/quietHours*`.
- Fix/extend settings persistence so quiet hours/timezone/preferences are actually saved (currently `PUT /api/users/settings` ignores quiet hours).
- Implement `NotificationService` (server module) with:
  - `createIntent`/`notify` entrypoint
  - validation and user scoping
  - preference resolution
  - deterministic dedupe upsert
  - in-app persistence
  - delivery-attempt state helpers (no external push yet)
- Keep existing notification routes functional; add unread count and richer list filters/pagination.

### 3.2 Shared/Types
- Extend `shared/types.ts` only where needed for client/server contract; preserve existing exported names where possible.

### 3.3 Data/Admin
- Update `DELETE /api/users/account` to remove future notification-related collections.
- Update `GET /api/users/export` to include notifications/preferences/subscriptions if product/data-portability requires.

### 3.4 Verification
- `npm run server:build`
- Unit tests/self-checks for dedupe key generation, duplicate upsert behavior, quiet-hours window logic (including midnight crossing), and preference fallback to existing `User` fields.

**Exit criteria:** can create/read in-app notifications through service with idempotent dedupe; existing notification/reminder UI still works.

---

## 4. Phase 2 — In-App Notification Center & Preferences UI

### 4.1 Frontend
- Add notification bell + unread badge to app header/shell (coordinate with `AppLayout`/`Sidebar`/mobile header; avoid AI assistant overlap patterns already addressed).
- Build Notification Center panel/drawer:
  - list notifications, unread styling, empty state, loading/error states
  - mark read / mark all read / delete or archive
  - deep links to source routes (`/tasks`, `/bills`, `/appointments`, `/reminders` or entity-specific routes if added)
  - responsive mobile drawer + desktop panel; Ocean Teal light / Deep Ocean dark tokens
- Extend `SettingsPage` (and/or Reminders preferences area) with notification preference controls:
  - global enable, quiet hours, category toggles, automatic-alert toggles
  - push controls shown but disabled/"coming soon" until Phase 5 if desired
- Use Axios + TanStack Query patterns; invalidate badge/count after mutations.

### 4.2 Accessibility
- Keyboard navigation, focus return on close, Escape handling, `aria-label` for bell/count, polite announcements for count changes where appropriate, WCAG 2.2 AA contrast.

### 4.3 Verification
- `npm run client:build`
- Manual checks: light/dark themes, mobile header + bottom nav, collapsed/expanded sidebar, badge updates on read/delete.

**Exit criteria:** users can view/manage in-app notifications and preferences; no regressions to existing routes/layout.

---

## 5. Phase 3 — Scheduled Alert Engine

### 5.1 Engine
- Add scheduler bootstrap (approved mechanism) behind env flag, e.g. `NOTIFICATION_SCHEDULER_ENABLED=true`.
- Implement idempotent scans:
  - Tasks due soon/due today/overdue (actionable statuses only)
  - Bills upcoming/due today/overdue (`paymentStatus` aware; currency ₹ in copy)
  - Appointments upcoming/starting soon (based on `Appointment.date/time`; not Calendar duplicates)
  - Reminders due/custom reminders
- Compute UTC occurrence buckets and deterministic dedupe keys.
- Use batched queries and windowed lookups; avoid full collection scans.

### 5.2 Source Integration
- On source create/update/reschedule/cancel, trigger targeted re-evaluation or rely on next scan (hybrid recommended): hooks for responsiveness + scan for safety.
- Update `Reminder.lastNotifiedAt/notificationCount` when a reminder notification is created.

### 5.3 Verification
- Tests for: due-soon windows, overdue daily bucket dedupe, reschedule creates new key/cancels obsolete pending, completed/paid items do not re-alert.
- `npm run server:build`; local runbook for enabling scheduler in dev.

**Exit criteria:** scheduled in-app alerts appear correctly and do not duplicate across restarts/repeated scans.

---

## 6. Phase 4 — Automatic Alert Engine

### 6.1 Rules
- Implement configurable automatic categories (default safe set first): overdue task/bill, document expiry when data exists.
- Add state-change intents for meaningful transitions (e.g., bill became overdue; appointment rescheduled) — positive/non-punitive messaging only.
- Gate AI suggestion alerts behind existing/explicit AI preferences.

### 6.2 Safety
- Daily/occurrence dedupe caps to prevent notification storms.
- Respect global/category/automatic toggles and quiet hours.
- Reconciliation job as safety net for missed hooks.

### 6.3 Verification
- Tests for toggle suppression, dedupe caps, and no alerts for deleted/inaccessible sources.

**Exit criteria:** automatic alerts are configurable, low-noise, and reliable.

---

## 7. Phase 5 — Web Push, Service Worker, and PWA Plumbing

### 7.1 Backend
- Add VAPID config (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) via env/config; never log private key.
- Create `PushSubscription` model/routes (subscribe/unsubscribe/list current device status as needed).
- Implement Web Push delivery adapter: send to active subscriptions, handle success/failure, mark invalid subscriptions on 410/404.
- Integrate push channel into Notification Service after in-app persistence.

### 7.2 Frontend/PWA
- Add `manifest.webmanifest` (name, icons, theme/background aligned with Ocean Teal, display mode) and link from `client/index.html`.
- Add service worker for push events and notification clicks; register from client entry in a controlled, non-breaking way.
- Push onboarding UI: explain → request permission → subscribe → confirm; handle unsupported/denied states.
- Ensure SW scope/caching does not interfere with `/api` calls or authenticated SPA routing.

### 7.3 iOS/Platform UX
- Detect/support messaging for iOS install-to-Home-Screen requirement where applicable.
- Clearly state best-effort delivery/no exact-time guarantee.

### 7.4 Verification
- `npm run client:build`, `npm run server:build`
- Manual: Chrome/Edge desktop push, Android PWA where available, permission denied/revoked flows, expired subscription cleanup.
- Do not claim iOS parity without device/version testing.

**Exit criteria:** opt-in users receive web push for enabled categories; in-app remains fallback.

---

## 8. Phase 6 — Optional Email Channel

- Implement only after provider/config decision and explicit approval.
- Add email adapter behind feature flag and user opt-in.
- Reuse Notification Service preferences, dedupe, quiet hours, and failure tracking.
- Verification: dev mailbox/provider sandbox; no production secrets in repo.

---

## 9. Phase 7 — Hardening, Observability, and Operations

- Structured logging/metrics for scan counts, intents created/deduped/suppressed, channel send/fail/retry outcomes.
- Admin/dev diagnostics only in safe environments (no secret exposure).
- Load/perf review: index effectiveness, scan duration, batch sizes.
- Runbook: env vars, scheduler/worker startup, key rotation (VAPID), subscription cleanup, incident checks.
- Documentation updates: `docs/DATABASE_SCHEMA.md` and `docs/EXISTING_ARCHITECTURE.md` **only when implementation lands** (or add clearly marked "implemented" sections) to avoid stale/conflicting docs.

---

## 10. Testing Checklist (Non-Trivial Logic)

- Dedupe: same logical occurrence never creates duplicate active notification.
- Time windows: due-soon/overdue/start-soon boundaries, UTC/local conversion, DST edge cases.
- Quiet hours: overnight intervals, timezone resolution, suppressed vs deferred behavior.
- Preferences: global off, category off, channel off, automatic-alert off.
- Ownership: user A cannot read/delete user B notifications/subscriptions.
- Reschedule/cancel: old pending occurrence suppressed/cancelled; new occurrence scheduled.
- Push failures: 410/404 removes subscription; transient errors retry with backoff; terminal failures recorded.
- Backward compatibility: legacy notifications render/read/delete correctly.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Duplicate notifications | Dedupe key + unique index + idempotent service. |
| Noisy alerts | Conservative defaults, per-category toggles, dedupe buckets, digest later. |
| Scheduler missed on restart | Windowed reconciliation scans from DB state. |
| Multi-instance double processing | Single scheduler leader/lease or queue claims before scaling out. |
| SW breaks app routing/caching | Minimal push-focused SW; careful scope; test SPA navigation and `/api`. |
| iOS push expectations | Explicit capability messaging and fallback to in-app. |
| Schema/API drift | Shared types, compatibility period, migration notes, build checks. |
| Sensitive data exposure | Minimal payloads, auth-scoped APIs, env-only secrets. |

---

## 12. Suggested First Implementation Slice (smallest complete, high value)

1. Extend `Notification` model compatibly + add unread-count/list improvements.
2. Implement Notification Service with in-app dedupe.
3. Add header bell + Notification Center UI.
4. Add one scheduled scan (e.g., bills/tasks due soon/overdue) behind env flag.
5. Verify builds + targeted tests + manual light/dark/mobile checks.

This slice delivers visible value without requiring PWA/push dependencies on day one.