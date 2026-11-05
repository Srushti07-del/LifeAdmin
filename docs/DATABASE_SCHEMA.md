# LifeAdmin — Database Schema Documentation

This document describes the existing MongoDB schemas defined in `server/src/models/`.

> **Note**: As per project specifications, do not alter or invent a replacement database schema during visual and frontend redesign.

---

## 1. User (`User.ts`)
Stores account credentials, user preferences, and profile configuration.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Primary key |
| `name` | `String` | Yes | User display name |
| `email` | `String` | Yes (Unique) | User email (lowercased) |
| `password` | `String` | No | Bcrpyt hashed password (hidden by default) |
| `profilePicture`| `String` | No | URL / path to user profile image |
| `googleId` | `String` | No | OAuth identifier |
| `authProvider` | `String` | Yes | `'local'` or `'google'` (default `'local'`) |
| `theme` | `String` | Yes | `'light'`, `'dark'`, `'system'` (default `'system'`) |
| `notificationsEnabled` | `Boolean` | Yes | System notification preference |
| `defaultReminderTiming` | `[Number]`| Yes | Days prior to due date (default `[7, 3, 1, 0]`) |
| `quietHoursStart` | `String` | No | e.g. `"22:00"` |
| `quietHoursEnd` | `String` | No | e.g. `"07:00"` |
| `categories` | `[String]` | Yes | Active categories (default: Personal, Work, Finance, Health, Education, Home) |
| `aiPreferences` | `Object` | Yes | `{ autoExtract: Boolean, suggestionsEnabled: Boolean }` |
| `subscriptionTier` | `String` | Yes | Legacy tier field (`'free'`, `'premium'`, `'premium_ai'`) |
| `householdId` | `ObjectId` | No | Reserved for future household functionality |
| `createdAt` / `updatedAt` | `Date` | Yes | Timestamps |

---

## 2. Task (`Task.ts`)
Tracks personal actionable tasks with deadlines and priorities.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference (indexed) |
| `title` | `String` | Task title |
| `description` | `String` | Optional notes |
| `dueDate` | `Date` | Due date timestamp (indexed) |
| `dueTime` | `String` | e.g. `"14:30"` |
| `priority` | `String` | `'low'`, `'medium'`, `'high'`, `'urgent'` |
| `status` | `String` | `'todo'`, `'in_progress'`, `'completed'` |
| `category` | `String` | e.g. `'Personal'`, `'Work'` |
| `reminderDaysBefore`| `[Number]` | Days before due date to alert |
| `attachments` | `[String]` | Attached document paths |
| `completedAt` | `Date` | Timestamp of completion |
| `aiGenerated` | `Boolean` | Flag indicating AI generation |
| `aiConfirmed` | `Boolean` | Flag indicating user confirmation |

*Compound Index*: `{ userId: 1, status: 1, dueDate: 1 }`

---

## 3. Bill (`Bill.ts`)
Tracks financial obligations, recurring subscriptions, and utility bills.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference |
| `name` | `String` | Bill name / description |
| `provider` | `String` | Provider or merchant name |
| `amount` | `Number` | Payment amount |
| `currency` | `String` | Default `'₹'` |
| `dueDate` | `Date` | Next payment due date |
| `paymentStatus` | `String` | `'pending'`, `'paid'`, `'overdue'`, `'upcoming'` |
| `category` | `String` | e.g. `'Finance'` |
| `startDate` | `Date` | Subscription initiation |
| `endDate` | `Date` | Subscription expiry |
| `recurrence` | `Object` | `{ type, interval, unit, endDate, durationMonths }` |
| `reminderDaysBefore` | `[Number]` | Alert intervals |
| `attachments` | `[String]` | Receipts or invoices |

*Compound Index*: `{ userId: 1, paymentStatus: 1, dueDate: 1 }`

---

## 4. Appointment (`Appointment.ts`)
Manages medical, professional, and personal meetings.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference |
| `title` | `String` | Appointment title |
| `date` | `Date` | Appointment date |
| `time` | `String` | Start time (e.g. `"10:30"`) |
| `endTime` | `String` | End time |
| `location` | `String` | Physical address or video URL |
| `relatedPerson` | `String` | Doctor, specialist, client name |
| `relatedOrganization` | `String` | Hospital, clinic, company |
| `notes` | `String` | Preparation notes |
| `category` | `String` | Category classification |

*Index*: `{ userId: 1, date: 1 }`

---

## 5. Document (`Document.ts`)
Stores uploaded metadata and AI-extracted details for personal files.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference |
| `fileName` | `String` | Stored file name on server |
| `originalName` | `String` | User uploaded filename |
| `mimeType` | `String` | File MIME type |
| `fileSize` | `Number` | Size in bytes |
| `filePath` | `String` | Server path |
| `documentType` | `String` | e.g. `'Insurance'`, `'ID'`, `'Certificate'` |
| `category` | `String` | Organization category |
| `tags` | `[String]` | User search tags |
| `aiExtracted` | `Object` | Extracted `{ provider, expiryDate, renewalDate, importantDates, amounts, identifiers, summary }` |
| `aiProcessed` | `Boolean` | Extraction completion flag |
| `linkedTasks` | `[ObjectId]` | Tasks connected to this document |
| `linkedBills` | `[ObjectId]` | Bills connected to this document |

---

## 6. Reminder (`Reminder.ts`)
Autonomous reminders and smart alert triggers.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference |
| `title` | `String` | Reminder title |
| `dueDate` | `Date` | Target trigger date |
| `dueTime` | `String` | Target trigger time |
| `entityType` | `String` | `'task'`, `'bill'`, `'appointment'`, `'document'`, `'custom'` |
| `entityId` | `ObjectId` | Linked entity ID |
| `status` | `String` | `'active'`, `'acknowledged'`, `'dismissed'`, `'completed'` |
| `priority` | `String` | Urgency rating |

*Index*: `{ userId: 1, status: 1, dueDate: 1 }`

---

## 7. CalendarEvent (`CalendarEvent.ts`)
Calendar schedule items connecting manual events and module records.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` (Ref: User) | Owner reference |
| `title` | `String` | Event title |
| `startDate` | `Date` | Event start date |
| `endDate` | `Date` | Event end date |
| `allDay` | `Boolean` | Full day toggle |
| `sourceType` | `String` | `'task'`, `'bill'`, `'appointment'`, `'reminder'`, `'manual'` |
| `sourceId` | `ObjectId` | Reference to parent entity |
| `color` | `String` | Category color token |

---

## 8. AIInteraction & Notification (`AIInteraction.ts`, `Notification.ts`)
- `AIInteraction`: Retains chat conversation history, queries, and auto-generated items.
- `Notification`: Retains in-app notifications, read receipts, and alert triggers.

