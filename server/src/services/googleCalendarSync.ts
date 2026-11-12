import mongoose from 'mongoose';
import { calendar_v3 } from 'googleapis';
import CalendarEvent from '../models/CalendarEvent';
import Task from '../models/Task';
import Appointment from '../models/Appointment';
import Bill from '../models/Bill';
import Reminder from '../models/Reminder';
import GoogleCalendarConnection from '../models/GoogleCalendarConnection';
import CalendarSyncMapping, { SyncSourceType } from '../models/CalendarSyncMapping';
import {
  getCalendarApi,
  handleGoogleAuthErrorIfRevoked,
  sanitizeGoogleErrorMessage,
} from './googleCalendar';

const ALLOWED_SOURCE_TYPES = new Set<SyncSourceType>([
  'calendar_event',
  'task',
  'appointment',
  'bill',
  'reminder',
]);

// Per-user serialization mutex so rapid CRUD syncs & pull/initial sync do not fail or race
const userSyncQueues = new Map<string, Promise<unknown>>();
const activePullUsers = new Set<string>();

/**
 * Serialize async sync operations per userId cleanly.
 */
async function withUserSyncLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userSyncQueues.get(userId) || Promise.resolve();
  let resolveNext!: () => void;
  const next = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });
  const chained = prev.then(() => next, () => next);
  userSyncQueues.set(userId, chained);

  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    resolveNext();
    if (userSyncQueues.get(userId) === chained) {
      userSyncQueues.delete(userId);
    }
  }
}

export function isUserSyncActive(userId: string): boolean {
  return activePullUsers.has(userId) || userSyncQueues.has(userId);
}

function normalizeTimezone(tz?: string): string {
  if (!tz || typeof tz !== 'string') return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function extractDateYMD(dateInput: Date | string, timezone: string): { year: number; month: number; day: number } {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
  }

  // Date-only strings in LifeAdmin are saved as UTC midnight (00:00:00.000Z); preserve calendar date directly
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

function getTimezoneOffsetMinutes(utcInstantMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcInstantMs));

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const tzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((tzAsUtc - utcInstantMs) / 60000);
}

function formatRfc3339InTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): string {
  const approxUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset1 = getTimezoneOffsetMinutes(approxUtc, timezone);
  const offset2 = getTimezoneOffsetMinutes(approxUtc - offset1 * 60000, timezone);
  const offsetMinutes = offset2;

  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offH = pad2(Math.floor(abs / 60));
  const offM = pad2(abs % 60);
  const offsetStr = offsetMinutes === 0 ? 'Z' : `${sign}${offH}:${offM}`;

  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00${offsetStr}`;
}

/**
 * Convert a LifeAdmin date/time to Google Calendar date-time format.
 * Preserves the user's wall-clock time in their timezone.
 */
function toGoogleDateTime(
  date: Date,
  time?: string,
  timezone: string = 'UTC'
): { dateTime: string; timeZone: string } | { date: string } {
  const tz = normalizeTimezone(timezone);
  const { year, month, day } = extractDateYMD(date, tz);

  if (time && /^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    const [h, m] = time.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        dateTime: formatRfc3339InTimezone(year, month, day, h, m, tz),
        timeZone: tz,
      };
    }
  }

  return { date: `${year}-${pad2(month)}-${pad2(day)}` };
}

function addMinutesToGoogleDateTime(
  dtObj: { dateTime: string; timeZone: string },
  minutes: number
): { dateTime: string; timeZone: string } {
  const ms = new Date(dtObj.dateTime).getTime() + minutes * 60000;
  const tz = normalizeTimezone(dtObj.timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return {
    dateTime: formatRfc3339InTimezone(get('year'), get('month'), get('day'), get('hour'), get('minute'), tz),
    timeZone: tz,
  };
}

function extractTimeHHMMInTimezone(isoDateTime: string, timezone: string): string | undefined {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value;
  const m = parts.find((p) => p.type === 'minute')?.value;
  return h && m ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}` : undefined;
}

/**
 * Convert a Google Calendar date-time back to LifeAdmin format in the user's timezone.
 */
function fromGoogleDateTime(
  googleEvent: calendar_v3.Schema$Event,
  timezone: string = 'UTC'
): { startDate: Date; startTime?: string; endDate?: Date; endTime?: string; allDay: boolean } {
  const tz = normalizeTimezone(timezone);
  const start = googleEvent.start;
  const end = googleEvent.end;

  if (start?.dateTime) {
    const startDt = new Date(start.dateTime);
    const startTime = extractTimeHHMMInTimezone(start.dateTime, start.timeZone || tz);
    const endDt = end?.dateTime ? new Date(end.dateTime) : undefined;
    const endTime = end?.dateTime ? extractTimeHHMMInTimezone(end.dateTime, end.timeZone || tz) : undefined;
    return {
      startDate: startDt,
      startTime,
      endDate: endDt,
      endTime,
      allDay: false,
    };
  }

  // All-day event (Google uses exclusive end.date)
  if (start?.date) {
    const [y, m, d] = start.date.split('-').map(Number);
    const startDt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    let endDt: Date | undefined;
    if (end?.date) {
      const [ey, em, ed] = end.date.split('-').map(Number);
      const inclusiveEnd = new Date(Date.UTC(ey || y, (em || m) - 1, (ed || d) - 1));
      if (inclusiveEnd.getTime() > startDt.getTime()) {
        endDt = inclusiveEnd;
      }
    }
    return {
      startDate: startDt,
      endDate: endDt,
      allDay: true,
    };
  }

  return {
    startDate: new Date(),
    allDay: true,
  };
}

/**
 * Map a LifeAdmin CalendarEvent to a Google Calendar event resource.
 */
function mapCalendarEventToGoogle(
  event: any,
  timezone: string
): calendar_v3.Schema$Event {
  const start = toGoogleDateTime(event.startDate, event.startTime, timezone);
  let end: { dateTime: string; timeZone: string } | { date: string };

  if ('dateTime' in start) {
    if (event.endDate || event.endTime) {
      const candidate = toGoogleDateTime(event.endDate || event.startDate, event.endTime || event.startTime, timezone);
      end = 'dateTime' in candidate && new Date(candidate.dateTime) > new Date(start.dateTime)
        ? candidate
        : addMinutesToGoogleDateTime(start, 60);
    } else {
      end = addMinutesToGoogleDateTime(start, 60);
    }
  } else {
    if (event.endDate) {
      const candidate = toGoogleDateTime(event.endDate, undefined, timezone);
      end = 'date' in candidate ? candidate : { date: start.date };
    } else {
      end = { date: start.date };
    }
  }

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: 'dateTime' in start ? { dateTime: start.dateTime, timeZone: start.timeZone } : { date: start.date },
    end: 'dateTime' in end ? { dateTime: end.dateTime, timeZone: end.timeZone } : { date: end.date },
    colorId: undefined,
    extendedProperties: {
      private: {
        lifeadmin_source: 'calendar_event',
        lifeadmin_record_id: event._id.toString(),
      },
    },
  } as calendar_v3.Schema$Event;
}

/**
 * Map a LifeAdmin Task to a Google Calendar event resource.
 */
function mapTaskToGoogle(task: any, timezone: string): calendar_v3.Schema$Event {
  const start = toGoogleDateTime(task.dueDate, task.dueTime, timezone);
  const end = 'dateTime' in start ? addMinutesToGoogleDateTime(start, 30) : { date: start.date };
  return {
    summary: `Task deadline: ${task.title}`,
    description: task.description || undefined,
    location: undefined,
    start: 'dateTime' in start ? { dateTime: start.dateTime, timeZone: start.timeZone } : { date: start.date },
    end: 'dateTime' in end ? { dateTime: end.dateTime, timeZone: end.timeZone } : { date: end.date },
    extendedProperties: {
      private: {
        lifeadmin_source: 'task',
        lifeadmin_record_id: task._id.toString(),
      },
    },
  } as calendar_v3.Schema$Event;
}

/**
 * Map a LifeAdmin Appointment to a Google Calendar event resource.
 */
function mapAppointmentToGoogle(appt: any, timezone: string): calendar_v3.Schema$Event {
  const start = toGoogleDateTime(appt.date, appt.time, timezone);
  let end: { dateTime: string; timeZone: string } | { date: string };

  if ('dateTime' in start) {
    if (appt.endTime) {
      const candidate = toGoogleDateTime(appt.date, appt.endTime, timezone);
      end = 'dateTime' in candidate && new Date(candidate.dateTime) > new Date(start.dateTime)
        ? candidate
        : addMinutesToGoogleDateTime(start, 60);
    } else {
      end = addMinutesToGoogleDateTime(start, 60);
    }
  } else {
    end = { date: start.date };
  }

  return {
    summary: appt.title,
    description: appt.notes || undefined,
    location: appt.location || undefined,
    start: 'dateTime' in start ? { dateTime: start.dateTime, timeZone: start.timeZone } : { date: start.date },
    end: 'dateTime' in end ? { dateTime: end.dateTime, timeZone: end.timeZone } : { date: end.date },
    extendedProperties: {
      private: {
        lifeadmin_source: 'appointment',
        lifeadmin_record_id: appt._id.toString(),
      },
    },
  } as calendar_v3.Schema$Event;
}

/**
 * Map a LifeAdmin Bill to a Google Calendar event resource.
 */
function mapBillToGoogle(bill: any, timezone: string): calendar_v3.Schema$Event {
  const start = toGoogleDateTime(bill.dueDate, undefined, timezone);
  return {
    summary: `Bill payment: ${bill.name}`,
    description: [
      bill.provider ? `Provider: ${bill.provider}` : null,
      `Amount: ${bill.currency || '₹'}${bill.amount}`,
      bill.description || null,
    ]
      .filter(Boolean)
      .join(' | ') || undefined,
    start: 'dateTime' in start ? { dateTime: start.dateTime, timeZone: start.timeZone } : { date: start.date },
    end: 'dateTime' in start
      ? addMinutesToGoogleDateTime(start, 30)
      : { date: start.date },
    extendedProperties: {
      private: {
        lifeadmin_source: 'bill',
        lifeadmin_record_id: bill._id.toString(),
      },
    },
  } as calendar_v3.Schema$Event;
}

/**
 * Map a LifeAdmin Reminder to a Google Calendar event resource.
 */
function mapReminderToGoogle(reminder: any, timezone: string): calendar_v3.Schema$Event {
  const start = toGoogleDateTime(reminder.dueDate, reminder.dueTime, timezone);
  return {
    summary: `Reminder: ${reminder.title}`,
    description: reminder.description || undefined,
    start: 'dateTime' in start ? { dateTime: start.dateTime, timeZone: start.timeZone } : { date: start.date },
    end: 'dateTime' in start
      ? addMinutesToGoogleDateTime(start, 30)
      : { date: start.date },
    extendedProperties: {
      private: {
        lifeadmin_source: 'reminder',
        lifeadmin_record_id: reminder._id.toString(),
      },
    },
  } as calendar_v3.Schema$Event;
}

function getSourceMapper(sourceType: SyncSourceType) {
  switch (sourceType) {
    case 'calendar_event': return mapCalendarEventToGoogle;
    case 'task': return mapTaskToGoogle;
    case 'appointment': return mapAppointmentToGoogle;
    case 'bill': return mapBillToGoogle;
    case 'reminder': return mapReminderToGoogle;
  }
}

export function getSourceModel(sourceType: SyncSourceType): any {
  switch (sourceType) {
    case 'calendar_event': return CalendarEvent;
    case 'task': return Task;
    case 'appointment': return Appointment;
    case 'bill': return Bill;
    case 'reminder': return Reminder;
  }
}

function normalizeRemoteSourceType(raw?: string): SyncSourceType | null {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw === 'manual' ? 'calendar_event' : raw;
  return ALLOWED_SOURCE_TYPES.has(normalized as SyncSourceType)
    ? (normalized as SyncSourceType)
    : null;
}

function isGoogleNotFoundError(err: unknown): boolean {
  const e = err as any;
  const status = e?.code ?? e?.status ?? e?.response?.status;
  return status === 404 || status === 410;
}

/**
 * Push a LifeAdmin record to Google Calendar (create or update).
 */
export async function pushToGoogle(
  userId: string,
  sourceType: SyncSourceType,
  sourceId: mongoose.Types.ObjectId
): Promise<{ created: boolean; googleEventId: string }> {
  return withUserSyncLock(userId, async () => {
    const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
    if (!connection) {
      throw new Error('Google Calendar not connected');
    }

    const Model = getSourceModel(sourceType) as any;
    const record = await Model.findOne({ _id: sourceId, userId });

    if (!record) {
      throw new Error(`${sourceType} record not found`);
    }

    // Skip completed tasks (never throw noise if completed)
    if (sourceType === 'task' && (record as any).status === 'completed') {
      throw new Error('Completed tasks are not synced to Google Calendar');
    }

    // Skip records without a due/start date (e.g., undated tasks)
    const effectiveDate = record.startDate || record.dueDate || record.date;
    if (!effectiveDate) {
      throw new Error(`${sourceType} has no date to sync`);
    }

    const calendar = await getCalendarApi(userId);
    const existingMapping = await CalendarSyncMapping.findOne({
      userId,
      sourceType,
      sourceId,
    });

    // Respect tombstone: if user explicitly deleted the event on Google Calendar, do not silently recreate it
    if (existingMapping && existingMapping.googleEventDeleted) {
      return { created: false, googleEventId: existingMapping.googleEventId || '' };
    }

    // Respect unresolved manual conflict: never overwrite until conflict is resolved
    if (existingMapping && existingMapping.syncState === 'conflict') {
      throw new Error(
        'Sync conflict: Google Calendar event has conflicting changes. Please resolve before pushing.'
      );
    }

    const timezone = connection.selectedCalendarTimezone || 'UTC';
    const mapper = getSourceMapper(sourceType);
    const eventResource = mapper(record, timezone);

    let googleEventId: string;
    let created: boolean;

    const sameCalendar = existingMapping?.googleCalendarId === connection.selectedCalendarId;

    if (existingMapping && existingMapping.googleEventId && sameCalendar) {
      const lastSyncedMs = existingMapping.lastSyncedAt ? new Date(existingMapping.lastSyncedAt).getTime() : 0;
      const lastGoogleMs = existingMapping.lastGoogleChangeAt ? new Date(existingMapping.lastGoogleChangeAt).getTime() : 0;

      // Conflict/loop prevention: only conflict if Google changed remotely AFTER our last successful sync
      if (lastGoogleMs > lastSyncedMs) {
        await CalendarSyncMapping.findByIdAndUpdate(existingMapping._id, {
          $set: {
            syncState: 'conflict',
            syncError: 'Google event was modified more recently than local record. Resolve manually.',
          },
        });
        throw new Error(
          'Sync conflict: Google Calendar event was modified more recently than the local record. Please resolve in Settings.'
        );
      }

      try {
        const updateParams: calendar_v3.Params$Resource$Events$Update = {
          calendarId: connection.selectedCalendarId,
          eventId: existingMapping.googleEventId,
          requestBody: eventResource,
        };
        const updated = await calendar.events.update(
          updateParams,
          existingMapping.googleEventEtag
            ? { headers: { 'If-Match': existingMapping.googleEventEtag } }
            : undefined
        );

        googleEventId = updated.data.id || existingMapping.googleEventId;
        const googleUpdatedAt = updated.data.updated ? new Date(updated.data.updated) : new Date();
        const syncTimestamp = new Date(Math.max(Date.now(), googleUpdatedAt.getTime()));

        await CalendarSyncMapping.findByIdAndUpdate(existingMapping._id, {
          $set: {
            syncState: 'synced',
            lastSyncedAt: syncTimestamp,
            lastLocalChangeAt: record.updatedAt ? new Date(record.updatedAt) : syncTimestamp,
            lastGoogleChangeAt: googleUpdatedAt,
            googleEventEtag: updated.data.etag ?? existingMapping.googleEventEtag,
            retryCount: 0,
          },
          $unset: { syncError: '' },
        });
        created = false;
      } catch (err: any) {
        await handleGoogleAuthErrorIfRevoked(userId, err);

        // Precondition failed (412) means Google event was edited concurrently remotely -> conflict
        const status = err?.code ?? err?.status ?? err?.response?.status;
        if (status === 412) {
          await CalendarSyncMapping.findByIdAndUpdate(existingMapping._id, {
            $set: {
              syncState: 'conflict',
              syncError: 'Google Calendar event changed remotely before local update was pushed.',
            },
          });
          throw new Error('Sync conflict: Google Calendar event changed remotely. Please resolve.');
        }

        // Event was deleted on Google Calendar -> mark tombstone safely instead of crashing
        if (status === 404 || status === 410) {
          await CalendarSyncMapping.findByIdAndUpdate(existingMapping._id, {
            $set: {
              googleEventDeleted: true,
              googleEventDeletedAt: new Date(),
              syncState: 'synced',
            },
            $unset: { syncError: '' },
          });
          return { created: false, googleEventId: existingMapping.googleEventId };
        }

        throw err;
      }
    } else {
      // Create new Google event (no existing mapping or switched calendar)
      try {
        const createdEvent = await calendar.events.insert({
          calendarId: connection.selectedCalendarId,
          requestBody: eventResource,
        });
        googleEventId = createdEvent.data.id!;
        const googleUpdatedAt = createdEvent.data.updated ? new Date(createdEvent.data.updated) : new Date();
        const syncTimestamp = new Date(Math.max(Date.now(), googleUpdatedAt.getTime()));

        await CalendarSyncMapping.findOneAndUpdate(
          { userId, sourceType, sourceId },
          {
            $set: {
              googleConnectionId: connection._id,
              googleCalendarId: connection.selectedCalendarId,
              googleEventId,
              googleEventEtag: createdEvent.data.etag ?? undefined,
              syncState: 'synced',
              lastSyncedAt: syncTimestamp,
              lastLocalChangeAt: record.updatedAt ? new Date(record.updatedAt) : syncTimestamp,
              lastGoogleChangeAt: googleUpdatedAt,
              retryCount: 0,
              googleEventDeleted: false,
            },
            $unset: { syncError: '', googleEventDeletedAt: '' },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, runValidators: true }
        );
        created = true;
      } catch (err: any) {
        await handleGoogleAuthErrorIfRevoked(userId, err);
        throw err;
      }
    }

    return { created, googleEventId };
  });
}

/**
 * Delete a Google Calendar event linked to a LifeAdmin record.
 */
export async function deleteFromGoogle(
  userId: string,
  sourceType: SyncSourceType,
  sourceId: mongoose.Types.ObjectId
): Promise<void> {
  return withUserSyncLock(userId, async () => {
    const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
    if (!connection) return;

    const mapping = await CalendarSyncMapping.findOne({ userId, sourceType, sourceId });
    if (!mapping || !mapping.googleEventId || mapping.googleEventDeleted) return;

    try {
      const calendar = await getCalendarApi(userId);
      await calendar.events.delete({
        calendarId: mapping.googleCalendarId || connection.selectedCalendarId,
        eventId: mapping.googleEventId,
      });
    } catch (err: any) {
      await handleGoogleAuthErrorIfRevoked(userId, err);
      // Event may already be deleted in Google
      if (!isGoogleNotFoundError(err)) throw err;
    }

    await CalendarSyncMapping.findByIdAndUpdate(mapping._id, {
      $set: {
        googleEventDeleted: true,
        googleEventDeletedAt: new Date(),
        syncState: 'synced',
      },
      $unset: { syncError: '' },
    });
  });
}

/**
 * Safely trigger sync from CRUD routes without failing the user's request.
 * On transient failures, records pending_push/error state so the background scheduler can retry.
 */
export async function enqueueRecordSync(
  userId: string | mongoose.Types.ObjectId,
  sourceType: SyncSourceType,
  sourceId: mongoose.Types.ObjectId,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  const uid = userId.toString();
  try {
    const connected = await GoogleCalendarConnection.exists({ userId: uid, status: 'connected' });
    if (!connected) return;

    if (operation === 'delete') {
      await deleteFromGoogle(uid, sourceType, sourceId);
    } else {
      await pushToGoogle(uid, sourceType, sourceId);
    }
  } catch (err: any) {
    const msg = sanitizeGoogleErrorMessage(err);
    // Intentional non-error skips (e.g. completed task, undated task, explicit conflict)
    if (
      msg.includes('Completed tasks are not synced') ||
      msg.includes('has no date to sync') ||
      msg.includes('Sync conflict')
    ) {
      return;
    }

    console.warn(`Google Calendar ${operation} sync deferred for ${sourceType}:${sourceId}:`, msg);
    try {
      const existing = await CalendarSyncMapping.findOne({ userId: uid, sourceType, sourceId });
      if (existing) {
        const setFields: Record<string, unknown> = {
          syncState: operation === 'delete' ? 'error' : 'pending_push',
          syncError: msg,
        };
        if (operation !== 'delete') {
          setFields.lastLocalChangeAt = new Date();
        }
        await CalendarSyncMapping.findByIdAndUpdate(existing._id, {
          $set: setFields,
          $inc: { retryCount: 1 },
        });
      } else if (operation !== 'delete') {
        const conn = await GoogleCalendarConnection.findOne({ userId: uid, status: 'connected' });
        if (conn) {
          await CalendarSyncMapping.findOneAndUpdate(
            { userId: uid, sourceType, sourceId },
            {
              $set: {
                googleConnectionId: conn._id,
                googleCalendarId: conn.selectedCalendarId || 'primary',
                syncState: 'pending_push',
                syncError: msg,
                lastLocalChangeAt: new Date(),
              },
              $inc: { retryCount: 1 },
            },
            { upsert: true }
          );
        }
      }
    } catch {
      // Never throw out of fire-and-forget wrapper
    }
  }
}

/**
 * Pull changes from Google Calendar and apply to LifeAdmin.
 * Uses sync tokens for incremental sync, handles HTTP 410 invalid syncToken resets,
 * prevents push/pull echo loops via ETag + timestamp verification, and enforces userId ownership.
 */
export async function pullFromGoogle(
  userId: string,
  syncToken?: string
): Promise<{ imported: number; updated: number; deleted: number; newSyncToken?: string }> {
  return withUserSyncLock(userId, async () => {
    activePullUsers.add(userId);
    try {
      const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
      if (!connection) {
        throw new Error('Google Calendar not connected');
      }

      const calendar = await getCalendarApi(userId);
      const timezone = connection.selectedCalendarTimezone || 'UTC';

      let imported = 0;
      let updated = 0;
      let deleted = 0;

      const listWithRecovery = async (activeSyncToken?: string) => {
        let pageToken: string | undefined;
        let nextSyncToken: string | undefined;
        const collected: calendar_v3.Schema$Event[] = [];

        do {
          const res = await calendar.events.list({
            calendarId: connection.selectedCalendarId,
            syncToken: activeSyncToken || undefined,
            pageToken,
            maxResults: 2500,
            showDeleted: true,
            singleEvents: true,
          });
          nextSyncToken = res.data.nextSyncToken ?? undefined;
          pageToken = res.data.nextPageToken ?? undefined;
          if (res.data.items?.length) {
            collected.push(...res.data.items);
          }
        } while (pageToken);

        return { events: collected, nextSyncToken };
      };

      let events: calendar_v3.Schema$Event[] = [];
      let nextSyncToken: string | undefined;

      try {
        const result = await listWithRecovery(syncToken);
        events = result.events;
        nextSyncToken = result.nextSyncToken;
      } catch (err: any) {
        await handleGoogleAuthErrorIfRevoked(userId, err);

        // HTTP 410 Gone means syncToken expired/invalidated -> clear and perform full incremental reset
        const status = err?.code ?? err?.status ?? err?.response?.status;
        if (syncToken && status === 410) {
          await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
            $unset: { googleSyncToken: '' },
          });
          const recovery = await listWithRecovery(undefined);
          events = recovery.events;
          nextSyncToken = recovery.nextSyncToken;
        } else {
          throw err;
        }
      }

      for (const gEvent of events) {
        const privateProps = gEvent.extendedProperties?.private;
        const sourceIdStr = privateProps?.lifeadmin_record_id;
        const normalizedType = normalizeRemoteSourceType(privateProps?.lifeadmin_source);

        // Handle deleted/cancelled events (Google often omits extendedProperties on cancelled events!)
        if (gEvent.status === 'cancelled') {
          let mapping = null;
          if (gEvent.id) {
            mapping = await CalendarSyncMapping.findOne({
              userId,
              googleCalendarId: connection.selectedCalendarId,
              googleEventId: gEvent.id,
            });
          }
          if (!mapping && normalizedType && sourceIdStr && mongoose.Types.ObjectId.isValid(sourceIdStr)) {
            mapping = await CalendarSyncMapping.findOne({
              userId,
              sourceType: normalizedType,
              sourceId: new mongoose.Types.ObjectId(sourceIdStr),
            });
          }
          if (mapping && !mapping.googleEventDeleted) {
            // Preserve the LifeAdmin record; mark mapping tombstone safely
            await CalendarSyncMapping.findByIdAndUpdate(mapping._id, {
              $set: {
                googleEventDeleted: true,
                googleEventDeletedAt: new Date(),
                syncState: 'synced',
              },
              $unset: { syncError: '' },
            });
            deleted++;
          }
          continue;
        }

        if (!sourceIdStr || !normalizedType || !mongoose.Types.ObjectId.isValid(sourceIdStr)) {
          continue;
        }

        const sourceType = normalizedType;
        const sourceId = new mongoose.Types.ObjectId(sourceIdStr);

        // Fetch existing mapping and enforce strict userId ownership on source record
        const existingMapping = await CalendarSyncMapping.findOne({
          userId,
          sourceType,
          sourceId,
        });

        // Echo suppression: if Google ETag matches what we already synced/pushed, skip immediately
        if (
          existingMapping &&
          existingMapping.googleEventEtag &&
          gEvent.etag &&
          existingMapping.googleEventEtag === gEvent.etag &&
          !existingMapping.googleEventDeleted
        ) {
          continue;
        }

        // Respect unresolved conflict state until manually resolved
        if (existingMapping && existingMapping.syncState === 'conflict') {
          continue;
        }

        const Model = getSourceModel(sourceType) as any;
        const record = await Model.findOne({ _id: sourceId, userId });
        if (!record) continue;

        // Skip completed tasks
        if (sourceType === 'task' && (record as any).status === 'completed') continue;

        const { startDate, startTime, endDate, endTime, allDay } = fromGoogleDateTime(gEvent, timezone);

        const googleUpdated = gEvent.updated ? new Date(gEvent.updated) : new Date();
        const localUpdated = record.updatedAt ? new Date(record.updatedAt) : new Date(0);
        const lastSyncedMs = existingMapping?.lastSyncedAt ? new Date(existingMapping.lastSyncedAt).getTime() : 0;

        const googleChangedSinceSync = googleUpdated.getTime() > lastSyncedMs;
        // Include 1s skew buffer against Mongoose updatedAt from our own previous writes
        const localChangedSinceSync = localUpdated.getTime() > lastSyncedMs + 1000;

        let shouldUpdateLocal = false;
        let conflictDetected = false;

        if (existingMapping) {
          if (googleChangedSinceSync && (localChangedSinceSync || existingMapping.syncState === 'pending_push')) {
            conflictDetected = true;
          } else if (googleChangedSinceSync) {
            shouldUpdateLocal = true;
          }
        } else {
          shouldUpdateLocal = true;
        }

        if (conflictDetected) {
          await CalendarSyncMapping.findOneAndUpdate(
            { userId, sourceType, sourceId },
            {
              $set: {
                syncState: 'conflict',
                syncError: 'Both Google Calendar and LifeAdmin have unsynced changes. Resolve manually.',
                lastGoogleChangeAt: googleUpdated,
              },
            },
            { upsert: true }
          );
          continue;
        }

        let newLastSyncedAt = new Date(Math.max(Date.now(), googleUpdated.getTime()));

        if (shouldUpdateLocal) {
          const updateData: Record<string, unknown> = {};

          if (sourceType === 'calendar_event') {
            updateData.title = gEvent.summary || record.title;
            updateData.description = gEvent.description;
            updateData.location = gEvent.location;
            updateData.startDate = startDate;
            updateData.startTime = startTime;
            updateData.endDate = endDate;
            updateData.endTime = endTime;
            updateData.allDay = allDay;
          } else if (sourceType === 'task') {
            updateData.dueDate = startDate;
            updateData.dueTime = startTime;
            updateData.title = gEvent.summary?.replace(/^Task deadline: /, '') || record.title;
            updateData.description = gEvent.description;
          } else if (sourceType === 'appointment') {
            updateData.title = gEvent.summary || record.title;
            updateData.date = startDate;
            updateData.time = startTime;
            updateData.endTime = endTime;
            updateData.location = gEvent.location;
            updateData.notes = gEvent.description;
          } else if (sourceType === 'bill') {
            // Only sync dueDate back to avoid corrupting bill.description with formatted Provider/Amount summary
            updateData.dueDate = startDate;
          } else if (sourceType === 'reminder') {
            updateData.dueDate = startDate;
            updateData.dueTime = startTime;
            updateData.title = gEvent.summary?.replace(/^Reminder: /, '') || record.title;
            updateData.description = gEvent.description;
          }

          const updatedRecord = await Model.findOneAndUpdate(
            { _id: sourceId, userId },
            { $set: updateData },
            { new: true }
          );
          if (!updatedRecord) continue;

          if (updatedRecord.updatedAt) {
            newLastSyncedAt = new Date(Math.max(newLastSyncedAt.getTime(), new Date(updatedRecord.updatedAt).getTime()));
          }
          updated++;
        }

        // Update/create mapping cleanly (only set lastLocalChangeAt when no unpulled change existed)
        await CalendarSyncMapping.findOneAndUpdate(
          { userId, sourceType, sourceId },
          {
            $set: {
              googleConnectionId: connection._id,
              googleCalendarId: connection.selectedCalendarId,
              googleEventId: gEvent.id!,
              googleEventEtag: gEvent.etag ?? undefined,
              syncState: 'synced',
              lastSyncedAt: newLastSyncedAt,
              lastLocalChangeAt: newLastSyncedAt,
              lastGoogleChangeAt: googleUpdated,
              retryCount: 0,
              googleEventDeleted: false,
            },
            $unset: { syncError: '', googleEventDeletedAt: '' },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, runValidators: true }
        );

        if (!existingMapping) imported++;
      }

      // Update connection sync token & status
      if (nextSyncToken) {
        await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
          $set: {
            googleSyncToken: nextSyncToken,
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
          },
          $unset: { lastSyncError: '' },
        });
      }

      return { imported, updated, deleted, newSyncToken: nextSyncToken };
    } finally {
      activePullUsers.delete(userId);
    }
  });
}

/**
 * Perform initial synchronization when a user connects Google Calendar.
 */
export async function initialSync(userId: string): Promise<{
  pushed: number;
  imported: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}> {
  const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
  if (!connection) {
    return { pushed: 0, imported: 0, status: 'failed', error: 'Google Calendar not connected' };
  }

  let pushed = 0;
  let imported = 0;
  let status: 'success' | 'partial' | 'failed' = 'success';

  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const sixMonthsLater = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);

    const existingMappings = await CalendarSyncMapping.find({ userId });
    const syncedSet = new Set(
      existingMappings
        .filter((m) => m.googleCalendarId === connection.selectedCalendarId && (m.syncState === 'synced' || m.googleEventDeleted))
        .map((m) => `${m.sourceType}:${m.sourceId.toString()}`)
    );

    const pushIfNeeded = async (sourceType: SyncSourceType, id: mongoose.Types.ObjectId) => {
      if (syncedSet.has(`${sourceType}:${id.toString()}`)) return;
      try {
        await pushToGoogle(userId, sourceType, id);
        pushed++;
      } catch (err) {
        console.error(`Failed to push ${sourceType} ${id}:`, sanitizeGoogleErrorMessage(err));
        status = 'partial';
      }
    };

    const [events, tasks, appointments, bills, reminders] = await Promise.all([
      CalendarEvent.find({ userId, startDate: { $gte: sixMonthsAgo, $lte: sixMonthsLater } }),
      Task.find({ userId, dueDate: { $gte: sixMonthsAgo, $lte: sixMonthsLater }, status: { $ne: 'completed' } }),
      Appointment.find({ userId, date: { $gte: sixMonthsAgo, $lte: sixMonthsLater } }),
      Bill.find({ userId, dueDate: { $gte: sixMonthsAgo, $lte: sixMonthsLater }, paymentStatus: { $ne: 'paid' } }),
      Reminder.find({ userId, dueDate: { $gte: sixMonthsAgo, $lte: sixMonthsLater }, status: { $nin: ['completed', 'dismissed'] } }),
    ]);

    for (const evt of events) await pushIfNeeded('calendar_event', evt._id);
    for (const task of tasks) await pushIfNeeded('task', task._id);
    for (const appt of appointments) await pushIfNeeded('appointment', appt._id);
    for (const bill of bills) await pushIfNeeded('bill', bill._id);
    for (const reminder of reminders) await pushIfNeeded('reminder', reminder._id);

    const pullResult = await pullFromGoogle(userId, connection.googleSyncToken || undefined);
    imported = pullResult.imported;

    await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
      $set: { lastSyncAt: new Date(), lastSyncStatus: status },
    });

    return { pushed, imported, status };
  } catch (err: any) {
    const safeErr = sanitizeGoogleErrorMessage(err);
    await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
      $set: { lastSyncStatus: 'failed', lastSyncError: safeErr },
    });
    return {
      pushed,
      imported,
      status: 'failed',
      error: safeErr,
    };
  }
}

/**
 * Process a Google webhook change notification.
 * Fetches changes incrementally using the stored sync token (never clears syncToken on 'sync' handshake).
 */
export async function processGoogleWebhookChange(
  userId: string,
  resourceState: string
): Promise<void> {
  // 'sync' is Google's channel-created handshake; do not wipe googleSyncToken
  if (resourceState === 'sync') {
    return;
  }

  // Coalesce if a pull is already active for this user
  if (activePullUsers.has(userId)) return;

  try {
    const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
    if (!connection) return;

    await pullFromGoogle(userId, connection.googleSyncToken || undefined);
  } catch (err: any) {
    const safeMsg = sanitizeGoogleErrorMessage(err);
    console.error(`Webhook sync failed for user ${userId}:`, safeMsg);
    const revoked = await handleGoogleAuthErrorIfRevoked(userId, err);
    if (!revoked) {
      await GoogleCalendarConnection.findOneAndUpdate(
        { userId, status: 'connected' },
        { $set: { lastSyncError: safeMsg } }
      );
    }
  }
}
