import { google } from 'googleapis';
import crypto from 'crypto';
import config from '../config';
import GoogleCalendarConnection, { IGoogleCalendarConnection } from '../models/GoogleCalendarConnection';
import CalendarSyncMapping, { SyncSourceType } from '../models/CalendarSyncMapping';
import CalendarEvent from '../models/CalendarEvent';
import Task from '../models/Task';
import Appointment from '../models/Appointment';
import Bill from '../models/Bill';
import Reminder from '../models/Reminder';
import {
  getAuthorizedClient,
  handleGoogleAuthErrorIfRevoked,
  hashChannelToken,
  migrateLegacyTokens,
  sanitizeGoogleErrorMessage,
  stopWatchChannel,
} from './googleCalendar';
import { deleteFromGoogle, pullFromGoogle, pushToGoogle } from './googleCalendarSync';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // Poll every 15 minutes
const WATCH_RENEWAL_BUFFER_MS = 24 * 60 * 60 * 1000; // Renew 24h before expiration
const SYNC_LEASE_MS = 5 * 60 * 1000; // Atomic lease duration for multi-worker safety
const MAX_PUSH_RETRIES = 5;

let startupTimer: NodeJS.Timeout | null = null;
let timer: NodeJS.Timeout | null = null;
let started = false;
let running = false;

export function startGoogleCalendarScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_GOOGLE_CALENDAR_SYNC === '1') {
    console.log('📅 Google Calendar scheduler disabled (test mode or env flag)');
    return;
  }

  // Migrate any legacy v1 CBC tokens safely and run initial reconciliation shortly after startup
  startupTimer = setTimeout(() => {
    void (async () => {
      try {
        const migration = await migrateLegacyTokens();
        if (migration.migrated > 0) {
          console.log(`🔐 Migrated ${migration.migrated} legacy Google Calendar token(s) to AES-256-GCM.`);
        }
      } catch (err) {
        console.warn('Google Calendar token migration check skipped:', sanitizeGoogleErrorMessage(err));
      }
      await reconcileAllUsers();
    })();
  }, 10000);
  startupTimer.unref?.();

  // Then poll periodically
  timer = setInterval(() => {
    void reconcileAllUsers();
  }, POLL_INTERVAL_MS);
  timer.unref?.();
  started = true;
  console.log('📅 Google Calendar scheduler started (server-running only)');
}

export function stopGoogleCalendarScheduler(): void {
  if (startupTimer) clearTimeout(startupTimer);
  if (timer) clearInterval(timer);
  startupTimer = null;
  timer = null;
  started = false;
}

export function isGoogleCalendarSchedulerRunning(): boolean {
  return started;
}

export async function isGoogleCalendarSyncRunning(): Promise<boolean> {
  return running;
}

function getSourceModel(sourceType: SyncSourceType): any {
  switch (sourceType) {
    case 'calendar_event': return CalendarEvent;
    case 'task': return Task;
    case 'appointment': return Appointment;
    case 'bill': return Bill;
    case 'reminder': return Reminder;
  }
}

/**
 * Reconcile all connected users: retry pending pushes, pull changes from Google, handle watch channels.
 */
async function reconcileAllUsers(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const connections = await GoogleCalendarConnection.find({ status: 'connected' });

    for (const connection of connections) {
      try {
        await reconcileUser(connection.userId.toString(), connection);
      } catch (err) {
        console.error(
          `Google Calendar reconciliation failed for user ${connection.userId}:`,
          sanitizeGoogleErrorMessage(err)
        );
      }
    }
  } finally {
    running = false;
  }
}

/**
 * Retry any pending_push or transient error mappings for a user.
 */
async function retryPendingMappings(userId: string): Promise<void> {
  const pending = await CalendarSyncMapping.find({
    userId,
    syncState: { $in: ['pending_push', 'error'] },
    retryCount: { $lt: MAX_PUSH_RETRIES },
    syncError: { $ne: 'Google Calendar disconnected' },
  }).limit(50);

  for (const mapping of pending) {
    try {
      const Model = getSourceModel(mapping.sourceType);
      const exists = await Model.exists({ _id: mapping.sourceId, userId });
      if (!exists) {
        await deleteFromGoogle(userId, mapping.sourceType, mapping.sourceId);
      } else {
        await pushToGoogle(userId, mapping.sourceType, mapping.sourceId);
      }
    } catch (err) {
      const msg = sanitizeGoogleErrorMessage(err);
      if (msg.includes('Completed tasks are not synced') || msg.includes('Sync conflict')) {
        continue;
      }
      await CalendarSyncMapping.findByIdAndUpdate(mapping._id, {
        $set: { syncError: msg },
        $inc: { retryCount: 1 },
      });
    }
  }
}

/**
 * Reconcile a single user: acquire short lease, retry pending pushes, pull changes, renew watch channel.
 */
async function reconcileUser(userId: string, connection: IGoogleCalendarConnection): Promise<void> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + SYNC_LEASE_MS);

  // Acquire atomic DB lease so multiple instances don't run parallel reconciliation for the same user
  const leased = await GoogleCalendarConnection.findOneAndUpdate(
    {
      _id: connection._id,
      status: 'connected',
      $or: [{ syncLockedUntil: null }, { syncLockedUntil: { $exists: false } }, { syncLockedUntil: { $lt: now } }],
    },
    { $set: { syncLockedUntil: leaseUntil } },
    { new: true }
  );

  if (!leased) return;

  try {
    // 1. Retry any deferred pushes/deletes
    await retryPendingMappings(userId);

    // 2. Pull incremental changes from Google
    try {
      const result = await pullFromGoogle(userId, leased.googleSyncToken || undefined);
      if (result.newSyncToken) {
        await GoogleCalendarConnection.findByIdAndUpdate(leased._id, {
          $set: { googleSyncToken: result.newSyncToken, lastSyncAt: new Date(), lastSyncStatus: 'success' },
          $unset: { lastSyncError: '' },
        });
      }
    } catch (err: any) {
      const safeErr = sanitizeGoogleErrorMessage(err);
      console.error(`Google Calendar pull failed for user ${userId}:`, safeErr);
      const revoked = await handleGoogleAuthErrorIfRevoked(userId, err);
      if (!revoked) {
        await GoogleCalendarConnection.findByIdAndUpdate(leased._id, {
          $set: { lastSyncError: safeErr },
        });
      }
      return; // Skip watch renewal if pull failed due to auth/connectivity
    }

    // 3. Renew watch channel if expiring soon or lacking a channel token
    try {
      const refreshed = await GoogleCalendarConnection.findById(leased._id);
      if (refreshed && refreshed.status === 'connected') {
        await renewWatchChannelIfNeeded(userId, refreshed);
      }
    } catch (err: any) {
      console.error(`Watch channel renewal failed for user ${userId}:`, sanitizeGoogleErrorMessage(err));
    }
  } finally {
    await GoogleCalendarConnection.findByIdAndUpdate(leased._id, {
      $unset: { syncLockedUntil: '' },
    }).catch(() => {});
  }
}

/**
 * Renew the Google watch channel if it expires within 24 hours or lacks channel token authentication.
 */
async function renewWatchChannelIfNeeded(userId: string, connection: IGoogleCalendarConnection): Promise<void> {
  const needsTokenUpgrade = Boolean(connection.watchChannelId && !connection.watchChannelTokenHash);
  const expiringSoon = Boolean(
    connection.watchExpiration &&
      connection.watchExpiration.getTime() - Date.now() <= WATCH_RENEWAL_BUFFER_MS
  );

  if (!needsTokenUpgrade && !expiringSoon) return;

  const baseWebhookHost = (process.env.GOOGLE_WEBHOOK_URL || '').trim() ||
    `${(process.env.API_URL || config.appUrl || '').replace(/\/+$/, '')}/api/google-calendar/webhook`;

  // Google Calendar push webhooks require HTTPS
  if (!baseWebhookHost.startsWith('https://')) {
    return;
  }

  try {
    const { oauth2Client } = await getAuthorizedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Stop the old channel cleanly before registering the replacement
    await stopWatchChannel(oauth2Client, connection.watchChannelId, connection.watchResourceId);

    const newChannelId = crypto.randomUUID();
    const channelToken = crypto.randomBytes(32).toString('hex');
    const channelTokenHash = hashChannelToken(channelToken);

    const res = await calendar.events.watch({
      calendarId: connection.selectedCalendarId,
      requestBody: {
        id: newChannelId,
        type: 'webhook',
        address: baseWebhookHost,
        token: channelToken,
      },
    });

    const channel = res.data;
    await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
      $set: {
        watchChannelId: channel.id || newChannelId,
        watchResourceId: channel.resourceId,
        watchChannelTokenHash: channelTokenHash,
        watchExpiration: channel.expiration ? new Date(parseInt(channel.expiration, 10)) : undefined,
      },
    });
  } catch (err: any) {
    await handleGoogleAuthErrorIfRevoked(userId, err);
    console.error(`Watch channel renewal failed for user ${userId}:`, sanitizeGoogleErrorMessage(err));
  }
}
