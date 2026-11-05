# LifeAdmin — Notification Database Schema (Proposed)

> **Status:** Design / proposal only. No schema or code changes are applied by this document.  
> **Database:** MongoDB via Mongoose (existing stack).  
> **Conventions:** follow existing model patterns (`server/src/models/*.ts`), `timestamps: true`, `userId` ownership, per-user compound indexes, string enums where currently used, and Express route ownership checks (`{ _id, userId: req.user._id }`).  
> **Currency display default:** ₹ (INR) in UI/notification copy; monetary values remain numeric + currency in source records (e.g., `Bill.amount`, `Bill.currency`).

---

## 1. Reuse Principles (No Duplication)

| Principle | Application |
|---|---|
| Source of truth stays in domain entities | Due dates/statuses/amounts come from `Task`, `Bill`, `Appointment`, `Reminder`, `Document`. Notifications store only minimal snapshot/copy needed for stable history rendering (e.g., title at send time, amount/currency, deep link). |
| Reuse user preference fields | `User.notificationsEnabled`, `defaultReminderTiming`, `quietHoursStart/End`, `categories`, `theme`, `aiPreferences` remain authoritative unless explicitly migrated. |
| Evolve, don't fork | Prefer extending `Notification` and `Reminder` with backward-compatible defaults over creating parallel "Alert" tables for the same purpose. |
| Per-user isolation | Every notification-related collection includes `userId` and is queried by it. |
| Idempotent creation | Logical alert occurrences use deterministic `dedupeKey` + unique index. |

---

## 2. Existing Collections (Relevant)

### 2.1 `Notification` — existing (`server/src/models/Notification.ts`)
```ts
// Existing fields
userId: ObjectId (ref User, required, indexed)
title: string (required)
message: string (required)
type: 'reminder'|'deadline'|'overdue'|'ai_suggestion'|'system' (required)
entityType: 'task'|'bill'|'appointment'|'document'|'reminder'|'subscription'|'system' (required)
entityId?: ObjectId
read: boolean (default false)
readAt?: Date
pushSent: boolean (default false)
pushSentAt?: Date
createdAt/updatedAt (timestamps)
// Existing index
{ userId: 1, read: 1, createdAt: -1 }
```
**Assessment:** sufficient for basic in-app history; insufficient for dedupe, scheduled occurrences, multi-channel delivery tracking, preference categories, quiet-hours suppression, and retry state.

### 2.2 `Reminder` — existing
Has `reminderDaysBefore`, `dueDate/dueTime`, `status`, `entityType/entityId`, `lastNotifiedAt`, `notificationCount`, priority/category/AI flags. **Reuse as custom/linked reminder source.**

### 2.3 `User` — existing preference fields
`notificationsEnabled`, `defaultReminderTiming`, `quietHoursStart/End`, `categories`, `aiPreferences.autoExtract/suggestionsEnabled`. **Gap:** settings route does not currently persist quiet hours; timezone not modeled.

### 2.4 Source entities
- `Task`: `title, description, dueDate, dueTime, priority, status, category, reminderDaysBefore, userId`
- `Bill`: `name, provider, amount, currency='₹', dueDate, paymentStatus, category, recurrence, reminderDaysBefore, userId`
- `Appointment`: `title, date, time, endTime, location, relatedPerson, relatedOrganization, notes, category, reminderDaysBefore, userId`

---

## 3. Proposed Schema: `notifications` (evolved)

### 3.1 Mongoose Shape (illustrative)
```ts
import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'reminder' | 'deadline' | 'overdue' | 'ai_suggestion' | 'system' // existing
  | 'due_soon' | 'due_today' | 'starting_soon' | 'expired' | 'renewal' | 'status_change'; // proposed

export type NotificationSourceType =
  | 'task' | 'bill' | 'appointment' | 'document' | 'reminder' | 'subscription' | 'system'; // existing

export type NotificationCategory =
  | 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'system' | 'ai';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationLifecycle = 'pending' | 'delivered' | 'partially_delivered' | 'failed' | 'cancelled' | 'suppressed';

export interface ChannelDeliveryState {
  channel: 'in_app' | 'web_push' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped' | 'suppressed';
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  lastErrorCode?: string;      // sanitized/provider code
  lastErrorMessage?: string;   // sanitized, truncated
  providerRef?: string;        // message id / receipt, if available
  sentAt?: Date;
  deliveredAt?: Date;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;                 // keep for compatibility/UI mapping
  category: NotificationCategory;         // proposed
  priority: NotificationPriority;         // proposed
  sourceType: NotificationSourceType;     // rename target; migrate from entityType
  sourceId?: mongoose.Types.ObjectId;     // migrate from entityId
  entityType?: NotificationSourceType;    // legacy compatibility
  entityId?: mongoose.Types.ObjectId;     // legacy compatibility
  trigger: string;                        // e.g. due_soon|overdue|custom
  dedupeKey: string;                      // deterministic logical occurrence key
  occurrenceAt: Date;                     // UTC logical event/alert bucket
  scheduledFor?: Date;                    // intended delivery/defer time (UTC)
  timezone?: string;                      // IANA tz used for evaluation snapshot
  status: NotificationLifecycle;          // proposed aggregate lifecycle
  channels: ChannelDeliveryState[];       // proposed per-channel tracking
  read: boolean;
  readAt?: Date;
  archivedAt?: Date;
  actionUrl?: string;                     // internal deep link, e.g. /bills/:id
  imageUrl?: string;                      // optional icon/illustration
  sourceSnapshot?: {                      // minimal stable display data
    title?: string;
    amount?: number;
    currency?: string;                    // default ₹
    dueAt?: Date;
    status?: string;
  };
  metadata?: Record<string, unknown>;     // small, non-sensitive extensibility
  pushSent?: boolean;                     // legacy compatibility
  pushSentAt?: Date;                      // legacy compatibility
  expiresAt?: Date;                       // optional TTL for stale actionable items
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Indexes
```ts
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // existing, keep
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true }); // idempotency guard
NotificationSchema.index({ status: 1, scheduledFor: 1 }); // delivery worker scan (if centralized worker)
NotificationSchema.index({ userId: 1, sourceType: 1, sourceId: 1, createdAt: -1 });
NotificationSchema.index({ 'channels.channel': 1, 'channels.status': 1, 'channels.nextAttemptAt': 1 }); // optional; evaluate selectivity before adding
// Optional TTL only for ephemeral classes (do NOT auto-delete important history by default)
// NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });
```

**Index notes:** avoid over-indexing write-heavy collections. Start with dedupe + user/read/date + source lookup; add worker indexes only when a queue/worker query needs them.

### 3.3 Migration / Compatibility
- New fields use defaults (`category` derived from `entityType/type`, `status` from `read/pushSent`, `priority='normal'`, `channels=[]`, `dedupeKey` backfilled for legacy rows as `legacy:{_id}` or computed where safe).
- Keep reading `entityType/entityId` until all callers migrate to `sourceType/sourceId`.
- Existing routes continue to work; response can include both legacy and new fields during transition.

---

## 4. Proposed Schema: `notificationPreferences`

Can be implemented as either (A) an embedded subdocument on `User` for simplicity, or (B) a separate collection for auditability/future growth. **Recommended:** start embedded in `User` (`notificationPreferences`) unless size/audit requirements demand a separate collection.

### 4.1 Embedded Shape (on `User`)
```ts
notificationPreferences: {
  enabled: boolean;                       // mirrors User.notificationsEnabled
  timezone: string;                       // IANA, e.g. 'Asia/Kolkata'; default app/user setting
  quietHours: {
    enabled: boolean;
    start: string;                        // 'HH:mm'
    end: string;                          // 'HH:mm'
  };
  channels: {
    inApp: { enabled: boolean };
    webPush: { enabled: boolean };
    email: { enabled: boolean; addressVerified?: boolean };
  };
  categories: {
    task:    { enabled: boolean; dueSoon: boolean; overdue: boolean; statusChange: boolean };
    bill:    { enabled: boolean; dueSoon: boolean; overdue: boolean; paymentStatus: boolean };
    appointment: { enabled: boolean; reminder: boolean; startingSoon: boolean; followUp: boolean };
    reminder:{ enabled: boolean; due: boolean };
    document:{ enabled: boolean; expiry: boolean; renewal: boolean };
    ai:      { enabled: boolean; suggestions: boolean };
    system:  { enabled: boolean };
  };
  automaticAlerts: {
    overdueScan: boolean;
    documentExpiryScan: boolean;
    rescheduleDetection: boolean;
    positiveNudges: boolean;              // off by default; never punitive
  };
  digest: {
    enabled: boolean;
    frequency: 'off'|'daily'|'weekly';
    sendAt?: string;                      // 'HH:mm'
  };
}
```

### 4.2 Separate Collection (alternative)
```ts
NotificationPreferences {
  userId: ObjectId (unique, ref User)
  ...same fields...
  timestamps
}
NotificationPreferencesSchema.index({ userId: 1 }, { unique: true });
```

### 4.3 Compatibility with Existing `User` Fields
- `User.notificationsEnabled` ↔ `notificationPreferences.enabled` (keep synchronized).
- `User.defaultReminderTiming` remains the default offset source for reminders/due-soon calculations unless per-category overrides are added later.
- `User.quietHoursStart/End` ↔ `notificationPreferences.quietHours.start/end`.
- `User.categories` remain domain organization categories; notification category toggles are delivery preferences and should not delete/replace domain categories.

---

## 5. Proposed Schema: `pushSubscriptions`

```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;                       // Push service endpoint (unique per browser/profile)
  endpointHash: string;                   // SHA-256 hash of endpoint for safe lookup/logging
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;         // from PushSubscription JSON
  userAgent?: string;                     // truncated/sanitized
  deviceLabel?: string;                   // optional user-friendly label
  permission: 'granted' | 'denied' | 'default';
  status: 'active' | 'expired' | 'revoked' | 'failed';
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true },
  endpointHash: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  expirationTime: { type: Number, default: null },
  userAgent: { type: String, maxlength: 300 },
  deviceLabel: { type: String, maxlength: 80 },
  permission: { type: String, enum: ['granted','denied','default'], default: 'granted' },
  status: { type: String, enum: ['active','expired','revoked','failed'], default: 'active' },
  lastSuccessAt: Date,
  lastFailureAt: Date,
  failureCount: { type: Number, default: 0 },
}, { timestamps: true });

PushSubscriptionSchema.index({ userId: 1, endpointHash: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
PushSubscriptionSchema.index({ status: 1, updatedAt: -1 }); // cleanup/admin ops
```

**Security:** treat subscription records as sensitive. Never return raw keys to other users. Consider encrypting `keys`/`endpoint` at rest if threat model requires (implementation decision).

---

## 6. Proposed Schema: `reminders` (evolved)

Keep existing `Reminder` model and extend minimally:
```ts
// Proposed additions (backward-compatible)
sourceSnapshot?: { title?: string; dueAt?: Date; amount?: number; currency?: string };
timezone?: string;                        // IANA
nextOccurrenceAt?: Date;                  // for recurring/custom scheduling
lastEvaluatedAt?: Date;                   // scheduler bookkeeping
snoozedUntil?: Date;                      // optional
dedupeLastKey?: string;                   // optional diagnostic
deliveryChannels?: ('in_app'|'web_push'|'email')[];
```
**Indexes (keep/add):**
```ts
ReminderSchema.index({ userId: 1, status: 1, dueDate: 1 }); // existing
ReminderSchema.index({ status: 1, dueDate: 1, nextOccurrenceAt: 1 }); // scheduler scan candidate
ReminderSchema.index({ userId: 1, entityType: 1, entityId: 1, status: 1 });
```

---

## 7. Optional Schema: `notificationDeliveryAttempts` (only if needed)

If embedding `channels[]` in `Notification` becomes unwieldy for retries/analytics, split attempts:
```ts
NotificationDeliveryAttempt {
  userId: ObjectId (indexed)
  notificationId: ObjectId (indexed, ref Notification)
  dedupeKey: string
  channel: 'in_app'|'web_push'|'email'
  attempt: number
  status: 'pending'|'sent'|'delivered'|'failed'|'skipped'|'suppressed'
  scheduledFor?: Date
  attemptedAt?: Date
  providerRef?: string
  errorCode?: string
  errorMessage?: string        // sanitized
  subscriptionId?: ObjectId    // push
  timestamps
}
indexes: { notificationId:1, channel:1, attempt:1 }, { userId:1, createdAt:-1 }, { status:1, scheduledFor:1 }
```
**Default recommendation:** do **not** add this collection in Phase 1; use embedded `channels[]` + server logs. Add only with measured need.

---

## 8. Data Ownership & Lifecycle

| Collection | Owner | Created by | Deleted/updated by | Account deletion |
|---|---|---|---|---|
| `notifications` | `userId` | Notification Service/engines; legacy routes may still create | User read/archive/delete endpoints; service updates delivery state | Must delete (already in `DELETE /api/users/account`; verify future fields/cascades). |
| `notificationPreferences` / embedded | `userId` | default on user creation/settings save | user settings API | deleted with user / subdocument removed. |
| `pushSubscriptions` | `userId` | push subscribe endpoint | unsubscribe, SW/browser change, 410 cleanup, user settings | Must delete. |
| `reminders` | `userId` | user/API + possible system helpers | user/API + scheduler bookkeeping | already deleted. |
| source entities | `userId` | existing domain routes | existing domain routes | already deleted. |

---

## 9. Query Patterns (Expected)

```ts
// Unread badge/count
Notification.countDocuments({ userId, read: false, archivedAt: { $exists: false } });

// Notification center page
Notification.find({ userId, archivedAt: { $exists: false } })
  .sort({ createdAt: -1 })
  .limit(20); // cursor pagination preferred for scale

// Idempotent create
Notification.updateOne(
  { userId, dedupeKey },
  { $setOnInsert: { ...intent, status: 'pending', read: false, channels: [...] } },
  { upsert: true }
);

// Active push subscriptions
PushSubscription.find({ userId, status: 'active', permission: 'granted' });

// Scheduled scan: bills due in next 3 days (example)
Bill.find({
  userId, // per-user scan jobs or user-partitioned scans
  paymentStatus: { $in: ['pending','upcoming','overdue'] },
  dueDate: { $gte: windowStart, $lte: windowEnd }
}).select('_id userId name amount currency dueDate paymentStatus reminderDaysBefore');
```

For large user bases, scheduler scans should be **partitioned** (by user cohort/time bucket/work queue) rather than loading all users/bills into one process.

---

## 10. Schema Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Breaking existing notification clients | Backward-compatible defaults; keep legacy fields/routes during transition. |
| Dedupe key collisions/instability | Versioned key format (`v1:`), stable occurrence buckets, tests for DST/reschedule cases. |
| Unbounded notification growth | Pagination/cursor APIs; optional archive; retention policy decision later (do not silently delete). |
| Sensitive data in push payload/history | Minimal payload/snapshot; no secrets/tokens/full document contents. |
| Index bloat | Add indexes based on real query patterns; review selectivity of channel-state index. |

---

## 11. Implementation Checklist (Schema Phase)
- [ ] Finalize field names (`sourceType/sourceId` vs legacy `entityType/entityId`) and compatibility window.
- [ ] Add/evolve Mongoose models with defaults and validators.
- [ ] Create indexes via migration/startup strategy consistent with project practice.
- [ ] Update shared types (`shared/types.ts`) only when implementing, preserving compatibility.
- [ ] Update account export/delete to include new notification-related collections.
- [ ] Add unit/integration tests for dedupe upsert, quiet-hours evaluation, and timezone bucketing.
