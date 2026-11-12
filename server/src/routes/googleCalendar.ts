import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import config from '../config';
import {
  getGoogleAuthUrl,
  getGoogleCalendarCallbackUrl,
  handleGoogleCallback,
  disconnectGoogleCalendar,
  getConnectionStatus,
  listGoogleCalendars,
  updateSelectedCalendar,
  signState,
  verifyState,
  hashChannelToken,
  verifyChannelToken,
  sanitizeGoogleErrorMessage,
  handleGoogleAuthErrorIfRevoked,
} from '../services/googleCalendar';
import User from '../models/User';
import GoogleOAuthState from '../models/GoogleOAuthState';
import GoogleCalendarConnection from '../models/GoogleCalendarConnection';
import CalendarSyncMapping from '../models/CalendarSyncMapping';
import { authenticate } from '../middleware/auth';
import {
  pushToGoogle,
  pullFromGoogle,
  deleteFromGoogle,
  getSourceModel,
  isUserSyncActive,
} from '../services/googleCalendarSync';
const router = Router();
const CSRF_COOKIE_NAME = 'gcal_oauth_csrf';
const ALLOWED_RESOURCE_STATES = new Set(['sync', 'exists', 'not_exists']);
const STATE_TTL_MS = 10 * 60 * 1000;

function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader || typeof cookieHeader !== 'string') return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

function shouldEnforceCsrfCookie(req: Request): boolean {
  try {
    const clientHost = new URL(config.clientUrl || 'http://localhost:5173').hostname;
    const callbackHost = new URL(getGoogleCalendarCallbackUrl()).hostname;
    if (clientHost === callbackHost) return true;
  } catch {
    // Fallback to checking whether cookie header arrived
  }
  return Boolean(parseCookie(req.headers.cookie, CSRF_COOKIE_NAME));
}

function getSafeCallbackErrorReason(error: any): string {
  const code = error?.code;
  if (code === 'ENCRYPTION_NOT_CONFIGURED') return 'encryption_not_configured';
  if (code === 'GOOGLE_ACCOUNT_ALREADY_LINKED') return 'google_account_already_linked';
  if (code === 'MISSING_REFRESH_TOKEN') return 'missing_refresh_token';
  if (code === 'MISSING_PROFILE') return 'missing_profile';
  return 'callback_failed';
}

// GET /api/google-calendar/auth-url — Get OAuth authorization URL
router.get('/auth-url', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const nonce = crypto.randomBytes(24).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const csrfHash = hashChannelToken(csrfToken);
    const expiresAt = new Date(Date.now() + STATE_TTL_MS);

    await GoogleOAuthState.create({
      nonce,
      userId: req.user!._id,
      csrfTokenHash: csrfHash,
      expiresAt,
    });

    const signedState = signState({
      userId,
      ts: Date.now(),
      nonce,
      csrfHash,
    });
    const { authUrl } = getGoogleAuthUrl(signedState);

    const isSecure = config.nodeEnv === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/api/google-calendar/callback',
      maxAge: STATE_TTL_MS,
    });

    res.json({ authUrl });
  } catch (error: any) {
    console.error('Google auth URL error:', sanitizeGoogleErrorMessage(error));
    res.status(500).json({ message: 'Failed to generate authorization URL' });
  }
});

// GET /api/google-calendar/callback — OAuth callback (called by Google redirect)
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const redirectBase = `${config.clientUrl || 'http://localhost:5173'}/settings`;
  const isSecure = config.nodeEnv === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const clearCsrfCookie = () => {
    res.clearCookie(CSRF_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/api/google-calendar/callback',
    });
  };

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      clearCsrfCookie();
      res.redirect(`${redirectBase}?google_calendar=error&reason=oauth_denied`);
      return;
    }

    if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) {
      clearCsrfCookie();
      res.redirect(`${redirectBase}?google_calendar=error&reason=missing_code_or_state`);
      return;
    }

    // 1. Validate HMAC signature and structure
    const statePayload = verifyState(state);
    if (!statePayload) {
      clearCsrfCookie();
      res.redirect(`${redirectBase}?google_calendar=error&reason=invalid_state`);
      return;
    }

    // 2. Validate timestamp bounds (reject expired >10m or far-future timestamps)
    const now = Date.now();
    if (statePayload.ts > now + 60 * 1000 || now - statePayload.ts > STATE_TTL_MS) {
      clearCsrfCookie();
      res.redirect(`${redirectBase}?google_calendar=error&reason=expired_state`);
      return;
    }

    // 3. Atomically consume single-use state nonce (prevents replay & forged state attacks)
    const consumedState = await GoogleOAuthState.findOneAndDelete({
      nonce: statePayload.nonce,
      userId: statePayload.userId,
      expiresAt: { $gt: new Date() },
    });

    if (!consumedState) {
      clearCsrfCookie();
      res.redirect(`${redirectBase}?google_calendar=error&reason=invalid_state`);
      return;
    }

    // 4. Validate browser CSRF cookie binding when same-host callback or cookie is present
    const incomingCsrfCookie = parseCookie(req.headers.cookie, CSRF_COOKIE_NAME);
    clearCsrfCookie();

    if (shouldEnforceCsrfCookie(req)) {
      if (
        !incomingCsrfCookie ||
        !consumedState.csrfTokenHash ||
        !verifyChannelToken(incomingCsrfCookie, consumedState.csrfTokenHash)
      ) {
        res.redirect(`${redirectBase}?google_calendar=error&reason=csrf_mismatch`);
        return;
      }
    }

    // 5. Ensure the target user exists
    const user = await User.findById(statePayload.userId);
    if (!user) {
      res.redirect(`${redirectBase}?google_calendar=error&reason=user_not_found`);
      return;
    }

    await handleGoogleCallback(code, state, statePayload.userId);

    res.redirect(`${redirectBase}?google_calendar=connected`);
  } catch (error: any) {
    clearCsrfCookie();
    console.error('Google OAuth callback error:', sanitizeGoogleErrorMessage(error));
    const reason = getSafeCallbackErrorReason(error);
    res.redirect(`${redirectBase}?google_calendar=error&reason=${reason}`);
  }
});

// GET /api/google-calendar/status — Connection status
router.get('/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getConnectionStatus(req.user!._id.toString());
    res.json(status || { connected: false });
  } catch (error) {
    console.error('Google calendar status error:', sanitizeGoogleErrorMessage(error));
    res.status(500).json({ message: 'Failed to fetch connection status' });
  }
});

// GET /api/google-calendar/calendars — List available Google calendars
router.get('/calendars', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const calendars = await listGoogleCalendars(req.user!._id.toString());
    res.json({ calendars });
  } catch (error: any) {
    const msg = sanitizeGoogleErrorMessage(error);
    console.error('List Google calendars error:', msg);
    const statusCode = msg.toLowerCase().includes('not connected') || msg.toLowerCase().includes('expired') ? 401 : 500;
    res.status(statusCode).json({
      message: statusCode === 401 ? 'Google Calendar authorization expired or not connected.' : 'Failed to list Google calendars',
    });
  }
});

// POST /api/google-calendar/select-calendar — Select the calendar to sync
router.post(
  '/select-calendar',
  authenticate,
  [
    body('calendarId').isString().trim().notEmpty().withMessage('Calendar ID is required'),
    body('calendarName').optional().isString().trim(),
    body('calendarTimezone').optional().isString().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const result = await updateSelectedCalendar(
        req.user!._id.toString(),
        req.body.calendarId,
        req.body.calendarName,
        req.body.calendarTimezone
      );

      if (!result.found) {
        res.status(404).json({ message: 'Google Calendar is not connected' });
        return;
      }

      res.json({ message: 'Calendar selected successfully' });
    } catch (error: any) {
      console.error('Select calendar error:', sanitizeGoogleErrorMessage(error));
      res.status(500).json({ message: 'Failed to select calendar' });
    }
  }
);

// POST /api/google-calendar/disconnect — Disconnect Google Calendar
router.post('/disconnect', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await disconnectGoogleCalendar(req.user!._id.toString());
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error: any) {
    console.error('Google calendar disconnect error:', sanitizeGoogleErrorMessage(error));
    res.status(500).json({ message: 'Failed to disconnect Google Calendar' });
  }
});

// POST /api/google-calendar/sync — Manual two-way sync (on demand)
router.post('/sync', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id.toString();

  // Prevent overlapping manual sync operations for the same user.
  // isUserSyncActive covers both an in-flight manual sync (per-user queue) and
  // an active background pull (activePullUsers), so background reconciliation
  // and a manual sync never run concurrently for one user.
  if (isUserSyncActive(userId)) {
    res.status(409).json({
      message: 'A Google Calendar sync is already in progress. Please try again shortly.',
    });
    return;
  }

  const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
  if (!connection) {
    res.status(409).json({
      message: 'Google Calendar is not connected. Connect your Google account to sync.',
    });
    return;
  }

  // Pull Google → LifeAdmin first (imports/updates/deletes, advances the sync token).
  // Doing the pull before the push avoids false conflicts on recently pulled changes.
  let pullResult: { imported: number; updated: number; deleted: number } | undefined;
  try {
    pullResult = await pullFromGoogle(userId, connection.googleSyncToken || undefined);
  } catch (err: any) {
    const safeMsg = sanitizeGoogleErrorMessage(err);
    console.error('Manual sync pull error:', safeMsg);
    const revoked = await handleGoogleAuthErrorIfRevoked(userId, err);
    if (!revoked) {
      await GoogleCalendarConnection.findOneAndUpdate(
        { userId, status: 'connected' },
        { $set: { lastSyncError: safeMsg } }
      ).catch(() => {});
    }
    res.status(500).json({ message: 'Google Calendar sync failed', error: safeMsg });
    return;
  }

  // Flush deferred LifeAdmin → Google pushes (retry pending mappings). Reuses the
  // existing push/delete logic with its own locking, duplicate prevention, ETag
  // conflict handling, tombstones, and retry bookkeeping.
  const refreshed = await GoogleCalendarConnection.findById(connection._id);
  const pending = await CalendarSyncMapping.find({
    userId,
    syncState: 'pending_push',
  }).limit(50);

  let pushed = 0;
  let pushErrors = 0;
  for (const mapping of pending) {
    const Model = getSourceModel(mapping.sourceType);
    const recordExists = await Model.exists({ _id: mapping.sourceId, userId });
    if (!recordExists) {
      // Local record was removed: delete the Google event if it still exists.
      await deleteFromGoogle(userId, mapping.sourceType, mapping.sourceId);
    } else {
      try {
        await pushToGoogle(userId, mapping.sourceType, mapping.sourceId);
        pushed += 1;
      } catch (err: any) {
        pushErrors += 1;
        console.error(
          `Manual sync push failed for ${mapping.sourceType}:${mapping.sourceId}:`,
          sanitizeGoogleErrorMessage(err)
        );
      }
    }
  }

  await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
    $set: { lastSyncAt: new Date(), lastSyncStatus: 'success' },
    $unset: { lastSyncError: '' },
  }).catch(() => {});

  res.json({
    message: 'Google Calendar synchronized successfully',
    synced: true,
    lastSyncAt: new Date().toISOString(),
    imported: pullResult?.imported ?? 0,
    updated: pullResult?.updated ?? 0,
    deleted: pullResult?.deleted ?? 0,
    pushed,
    pushErrors,
  });
});

// POST /api/google-calendar/webhook — Google push notification webhook
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const channelToken = req.headers['x-goog-channel-token'];

    if (
      typeof channelId !== 'string' ||
      !channelId ||
      typeof resourceId !== 'string' ||
      !resourceId ||
      typeof resourceState !== 'string' ||
      !ALLOWED_RESOURCE_STATES.has(resourceState)
    ) {
      res.status(400).json({ message: 'Invalid or missing webhook headers' });
      return;
    }

    const connection = await GoogleCalendarConnection.findOne({ watchChannelId: channelId });
    if (!connection || connection.status !== 'connected') {
      res.status(404).json({ message: 'Unknown or inactive watch channel' });
      return;
    }

    // Require strict resource ID match
    if (!connection.watchResourceId || connection.watchResourceId !== resourceId) {
      res.status(403).json({ message: 'Resource ID mismatch' });
      return;
    }

    // Reject expired watch channels
    if (connection.watchExpiration && connection.watchExpiration.getTime() <= Date.now()) {
      res.status(410).json({ message: 'Watch channel expired' });
      return;
    }

    // Authenticate Google webhook delivery using per-channel X-Goog-Channel-Token secret
    if (
      typeof channelToken !== 'string' ||
      !channelToken ||
      !connection.watchChannelTokenHash ||
      !verifyChannelToken(channelToken, connection.watchChannelTokenHash)
    ) {
      res.status(401).json({ message: 'Invalid webhook channel token' });
      return;
    }

    // 'sync' is Google's channel-created handshake — no pull needed
    if (resourceState === 'sync') {
      res.status(200).send('');
      return;
    }

    // 'not_exists' means the watched resource was removed; clear stale watch metadata
    if (resourceState === 'not_exists') {
      await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
        $unset: {
          watchChannelId: '',
          watchResourceId: '',
          watchChannelTokenHash: '',
          watchExpiration: '',
        },
      });
      res.status(200).send('');
      return;
    }

    // Acknowledge immediately to Google before running potentially slow incremental pull
    res.status(200).send('');

    // Trigger incremental sync asynchronously
    const { processGoogleWebhookChange } = await import('../services/googleCalendarSync');
    void processGoogleWebhookChange(connection.userId.toString(), resourceState).catch((err) => {
      console.error('Unhandled webhook sync error:', sanitizeGoogleErrorMessage(err));
    });
  } catch (error) {
    console.error('Google webhook error:', sanitizeGoogleErrorMessage(error));
    if (!res.headersSent) {
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
});

export default router;
