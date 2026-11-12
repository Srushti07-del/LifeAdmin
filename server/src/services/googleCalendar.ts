import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import config from '../config';
import {
  encrypt,
  decrypt,
  decryptString,
  isEncryptionConfigured,
  isLegacyToken,
} from '../utils/tokenEncryption';
import GoogleCalendarConnection, { IGoogleCalendarConnection, GoogleConnectionStatus } from '../models/GoogleCalendarConnection';
import GoogleOAuthState from '../models/GoogleOAuthState';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// Deduplicate concurrent token refreshes per user to prevent refresh races
const inFlightRefreshes = new Map<string, Promise<void>>();

export interface OAuthStatePayload {
  userId: string;
  ts: number;
  nonce: string;
  csrfHash?: string;
}

/**
 * Resolve the callback URL specifically for Google Calendar OAuth.
 * Avoids colliding with the legacy /api/auth/google/callback login URI when GOOGLE_CALLBACK_URL
 * is configured for sign-in.
 */
export function getGoogleCalendarCallbackUrl(): string {
  const explicit = (process.env.GOOGLE_CALENDAR_CALLBACK_URL || '').trim();
  if (explicit) return explicit;

  const configured = (config.googleCallbackUrl || '').trim();
  if (configured.includes('/google-calendar/callback')) {
    return configured;
  }
  if (configured.endsWith('/api/auth/google/callback')) {
    return `${configured.slice(0, -'/api/auth/google/callback'.length)}/api/google-calendar/callback`;
  }

  const base = (process.env.API_URL || config.appUrl || `http://localhost:${config.port}`).replace(/\/+$/, '');
  return `${base}/api/google-calendar/callback`;
}

/**
 * Derive a domain-separated HMAC secret for OAuth state signing.
 * Never falls back to hardcoded literals in production.
 */
function getOAuthStateKey(): Buffer {
  const rawSecret = (process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || '').trim();
  if (!rawSecret) {
    if (config.nodeEnv === 'production') {
      throw new Error('JWT_SECRET or GOOGLE_OAUTH_STATE_SECRET must be set in production');
    }
    return crypto.createHmac('sha256', config.jwtSecret).update('google-calendar-oauth-state-v1').digest();
  }
  return crypto.createHmac('sha256', rawSecret).update('google-calendar-oauth-state-v1').digest();
}

/**
 * Hash a webhook channel token for storage and constant-time comparison.
 */
export function hashChannelToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Verify an incoming X-Goog-Channel-Token against its stored SHA-256 hash.
 */
export function verifyChannelToken(incomingToken: string, storedHash: string): boolean {
  if (!incomingToken || !storedHash) return false;
  const incomingHash = hashChannelToken(incomingToken);
  const a = Buffer.from(incomingHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Extract a concise, credential-safe error message from Google/gaxios/runtime errors.
 * Never exposes request headers, Bearer tokens, client secrets, or refresh tokens.
 */
export function sanitizeGoogleErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  const e = err as any;
  const apiMessage = e?.response?.data?.error_description || e?.response?.data?.error?.message || e?.response?.data?.error;
  const raw = typeof apiMessage === 'string' && apiMessage.trim()
    ? apiMessage.trim()
    : (typeof e?.message === 'string' ? e.message : 'Google Calendar request failed');

  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(refresh_token|access_token|client_secret)=[^&\s]+/gi, '$1=[REDACTED]')
    .slice(0, 300);
}

/**
 * Detect whether an error from Google indicates the OAuth grant/token was revoked or expired.
 */
export function isRevokedOrInvalidTokenError(err: unknown): boolean {
  const e = err as any;
  const status = e?.code ?? e?.status ?? e?.response?.status;
  const errorCode = e?.response?.data?.error;
  const msg = String(e?.response?.data?.error_description || e?.message || '').toLowerCase();

  if (errorCode === 'invalid_grant' || errorCode === 'invalid_token') return true;
  if (status === 401) return true;
  if (msg.includes('invalid_grant') || msg.includes('token has been expired or revoked') || msg.includes('invalid credentials')) {
    return true;
  }
  return false;
}

/**
 * Mark a user's Google Calendar connection as expired if Google rejected credentials as revoked/expired.
 */
export async function handleGoogleAuthErrorIfRevoked(userId: string, err: unknown): Promise<boolean> {
  if (!isRevokedOrInvalidTokenError(err)) return false;
  await GoogleCalendarConnection.findOneAndUpdate(
    { userId, status: { $ne: 'disconnected' } },
    {
      $set: {
        status: 'expired',
        lastSyncError: 'Google Calendar authorization was revoked or expired. Please reconnect.',
      },
      $unset: { encryptedAccessToken: '' },
    }
  );
  return true;
}

// OAuth2 client for the server-side flow
function createOAuth2Client(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    redirectUri || getGoogleCalendarCallbackUrl()
  );
}

/**
 * Generate the Google OAuth authorization URL.
 * The frontend redirects the user to this URL.
 */
export function getGoogleAuthUrl(state: string): { authUrl: string; oauth2Client: OAuth2Client } {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh token
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent screen to ensure we get a refresh token
  });

  return { authUrl, oauth2Client };
}

/**
 * Best-effort helper to stop a Google watch channel using an already authorized OAuth2 client.
 */
export async function stopWatchChannel(
  oauth2Client: OAuth2Client,
  channelId?: string,
  resourceId?: string
): Promise<void> {
  if (!channelId || !resourceId) return;
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  } catch {
    // Channel may already be expired or invalid — safe to ignore
  }
}

/**
 * Exchange the authorization code for tokens and store them encrypted (AES-256-GCM).
 */
export async function handleGoogleCallback(
  code: string,
  _state: string,
  userId: string
): Promise<{ connection: IGoogleCalendarConnection; oauth2Client: OAuth2Client }> {
  if (!isEncryptionConfigured()) {
    const err = new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not configured. Google Calendar connection cannot proceed.');
    (err as any).code = 'ENCRYPTION_NOT_CONFIGURED';
    throw err;
  }

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user info from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const googleProfile = userInfo.data;

  if (!googleProfile.id || !googleProfile.email) {
    const err = new Error('Google did not return required account profile information.');
    (err as any).code = 'MISSING_PROFILE';
    throw err;
  }

  // Prevent linking the same Google account to multiple LifeAdmin users
  const conflictingConnection = await GoogleCalendarConnection.findOne({
    googleId: googleProfile.id,
    userId: { $ne: userId },
  });
  if (conflictingConnection) {
    const err = new Error('This Google account is already connected to another LifeAdmin account.');
    (err as any).code = 'GOOGLE_ACCOUNT_ALREADY_LINKED';
    throw err;
  }

  const existingConnection = await GoogleCalendarConnection.findOne({ userId });

  let refreshTokenToStore = tokens.refresh_token;
  if (!refreshTokenToStore) {
    // If reconnecting the exact same Google account and we still have a valid refresh token, preserve & migrate it
    if (
      existingConnection &&
      existingConnection.googleId === googleProfile.id &&
      existingConnection.encryptedRefreshToken
    ) {
      try {
        refreshTokenToStore = decryptString(existingConnection.encryptedRefreshToken);
      } catch {
        refreshTokenToStore = undefined;
      }
    }
  }

  if (!refreshTokenToStore) {
    const err = new Error('Google did not return a refresh token. Please revoke prior access in your Google Account and reconnect.');
    (err as any).code = 'MISSING_REFRESH_TOKEN';
    throw err;
  }

  // Stop any stale watch channel before replacing credentials
  if (existingConnection?.watchChannelId && existingConnection?.watchResourceId) {
    try {
      const oldClient = createOAuth2Client();
      const oldRefresh = decryptString(existingConnection.encryptedRefreshToken);
      oldClient.setCredentials({ refresh_token: oldRefresh });
      await stopWatchChannel(oldClient, existingConnection.watchChannelId, existingConnection.watchResourceId);
    } catch {
      // Best-effort cleanup
    }
  }

  // If the user switched to a different Google account, clear sync mappings for the old Google account
  // so old Google event IDs do not collide with the newly connected account.
  if (existingConnection && existingConnection.googleId !== googleProfile.id) {
    const CalendarSyncMappingModel = (await import('../models/CalendarSyncMapping')).default;
    await CalendarSyncMappingModel.deleteMany({ userId, googleConnectionId: existingConnection._id });
  }

  const encryptedRefreshToken = encrypt(refreshTokenToStore);
  const encryptedAccessToken = tokens.access_token ? encrypt(tokens.access_token) : undefined;

  const setFields: Record<string, unknown> = {
    googleId: googleProfile.id,
    googleEmail: googleProfile.email,
    googleName: googleProfile.name,
    googlePicture: googleProfile.picture,
    encryptedRefreshToken,
    accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    tokenType: tokens.token_type,
    scope: tokens.scope,
    status: 'connected',
    connectedAt: new Date(),
    selectedCalendarId: existingConnection && existingConnection.googleId === googleProfile.id
      ? existingConnection.selectedCalendarId
      : 'primary',
  };
  if (encryptedAccessToken) {
    setFields.encryptedAccessToken = encryptedAccessToken;
  }

  const unsetFields: Record<string, string> = {
    disconnectedAt: '',
    lastSyncError: '',
    lastSyncStatus: '',
    googleSyncToken: '',
    watchChannelId: '',
    watchResourceId: '',
    watchChannelTokenHash: '',
    watchExpiration: '',
    syncLockedUntil: '',
  };
  if (!encryptedAccessToken) {
    unsetFields.encryptedAccessToken = '';
  }
  if (!(existingConnection && existingConnection.googleId === googleProfile.id)) {
    unsetFields.selectedCalendarName = '';
    unsetFields.selectedCalendarTimezone = '';
  }

  let connection: IGoogleCalendarConnection | null;
  try {
    connection = await GoogleCalendarConnection.findOneAndUpdate(
      { userId },
      {
        $set: setFields,
        $unset: unsetFields,
        $setOnInsert: { createdAt: new Date() },
      },
      { new: true, upsert: true, runValidators: true }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      const dupErr = new Error('This Google account is already connected to another LifeAdmin account.');
      (dupErr as any).code = 'GOOGLE_ACCOUNT_ALREADY_LINKED';
      throw dupErr;
    }
    throw err;
  }

  if (!connection) {
    throw new Error('Failed to create Google Calendar connection');
  }

  return { connection, oauth2Client };
}

/**
 * Get an authorized OAuth2 client for a user's Google Calendar connection.
 * Automatically refreshes the access token if expired and migrates legacy v1 tokens to v2 (AES-256-GCM).
 */
export async function getAuthorizedClient(userId: string): Promise<{ oauth2Client: OAuth2Client; connection: IGoogleCalendarConnection }> {
  let connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
  if (!connection) {
    throw new Error('Google Calendar is not connected for this user');
  }

  const oauth2Client = createOAuth2Client();

  let needsAccessReEncrypt = false;
  let needsRefreshReEncrypt = false;
  let accessToken: string | undefined;
  let refreshToken: string;

  try {
    if (connection.encryptedAccessToken) {
      const decrypted = decrypt(connection.encryptedAccessToken);
      accessToken = decrypted.plaintext;
      if (decrypted.version === 1) needsAccessReEncrypt = true;
    }

    const refreshDecrypted = decrypt(connection.encryptedRefreshToken);
    refreshToken = refreshDecrypted.plaintext;
    if (refreshDecrypted.version === 1) needsRefreshReEncrypt = true;
  } catch (decryptErr) {
    await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
      $set: {
        status: 'error',
        lastSyncError: 'Stored Google Calendar credentials could not be decrypted. Please reconnect.',
      },
    });
    throw new Error('Google Calendar credentials could not be decrypted. Please reconnect.');
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.accessTokenExpiresAt ? connection.accessTokenExpiresAt.getTime() : undefined,
    token_type: connection.tokenType,
    scope: connection.scope,
  });

  // If the access token is expired or about to expire, refresh it (deduplicated per user)
  const needsRefresh =
    !accessToken ||
    !connection.accessTokenExpiresAt ||
    connection.accessTokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

  if (needsRefresh) {
    let refreshPromise = inFlightRefreshes.get(userId);
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          const setUpdate: Record<string, unknown> = {
            accessTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
            tokenType: credentials.token_type || connection!.tokenType,
            scope: credentials.scope || connection!.scope,
            status: 'connected',
          };
          if (credentials.access_token) {
            setUpdate.encryptedAccessToken = encrypt(credentials.access_token);
          }

          // Persist rotated refresh token OR migrate legacy v1 refresh token to AES-256-GCM
          if (credentials.refresh_token) {
            setUpdate.encryptedRefreshToken = encrypt(credentials.refresh_token);
          } else if (needsRefreshReEncrypt) {
            setUpdate.encryptedRefreshToken = encrypt(refreshToken);
          }

          await GoogleCalendarConnection.findByIdAndUpdate(connection!._id, {
            $set: setUpdate,
            $unset: { lastSyncError: '' },
          });
        } catch (refreshErr: any) {
          const sanitizedMsg = sanitizeGoogleErrorMessage(refreshErr);
          const isRevoked = isRevokedOrInvalidTokenError(refreshErr);
          if (isRevoked) {
            await GoogleCalendarConnection.findByIdAndUpdate(connection!._id, {
              $set: {
                status: 'expired',
                lastSyncError: 'Google Calendar authorization expired or was revoked. Please reconnect.',
              },
              $unset: { encryptedAccessToken: '' },
            });
            throw new Error('Google Calendar authentication expired. Please reconnect.');
          }
          // Transient error (network timeout / 5xx): keep connection active and surface sanitized error
          await GoogleCalendarConnection.findByIdAndUpdate(connection!._id, {
            $set: { lastSyncError: sanitizedMsg },
          });
          throw new Error(`Google Calendar token refresh temporarily failed: ${sanitizedMsg}`);
        }
      })().finally(() => {
        inFlightRefreshes.delete(userId);
      });
      inFlightRefreshes.set(userId, refreshPromise);
    }

    await refreshPromise;

    // Reload updated connection & credentials after refresh
    const refreshed = await GoogleCalendarConnection.findById(connection._id);
    if (refreshed) {
      connection = refreshed;
      const freshAccess = refreshed.encryptedAccessToken ? decryptString(refreshed.encryptedAccessToken) : accessToken;
      const freshRefresh = decryptString(refreshed.encryptedRefreshToken);
      oauth2Client.setCredentials({
        access_token: freshAccess,
        refresh_token: freshRefresh,
        expiry_date: refreshed.accessTokenExpiresAt ? refreshed.accessTokenExpiresAt.getTime() : undefined,
        token_type: refreshed.tokenType,
        scope: refreshed.scope,
      });
    }
  } else if (needsAccessReEncrypt || needsRefreshReEncrypt) {
    // Migrate any legacy v1-encrypted tokens to authenticated v2 AES-256-GCM format
    const updateSet: Record<string, string> = {};
    if (accessToken && connection.encryptedAccessToken && isLegacyToken(connection.encryptedAccessToken)) {
      updateSet.encryptedAccessToken = encrypt(accessToken);
    }
    if (isLegacyToken(connection.encryptedRefreshToken)) {
      updateSet.encryptedRefreshToken = encrypt(refreshToken);
    }
    if (Object.keys(updateSet).length > 0) {
      await GoogleCalendarConnection.findByIdAndUpdate(connection._id, { $set: updateSet });
    }
  }

  return { oauth2Client, connection };
}

/**
 * Safely migrate any existing legacy v1 (AES-256-CBC) encrypted tokens in the database
 * to authenticated v2 (AES-256-GCM) without breaking existing user connections.
 */
export async function migrateLegacyTokens(): Promise<{ migrated: number; failed: number }> {
  if (!isEncryptionConfigured()) {
    return { migrated: 0, failed: 0 };
  }

  const connections = await GoogleCalendarConnection.find({
    $or: [
      { encryptedRefreshToken: { $not: /^v2:/ } },
      { encryptedAccessToken: { $exists: true, $ne: null, $not: /^v2:/ } },
    ],
  });

  let migrated = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      const updateSet: Record<string, string> = {};
      if (conn.encryptedRefreshToken && isLegacyToken(conn.encryptedRefreshToken)) {
        const plainRefresh = decryptString(conn.encryptedRefreshToken);
        updateSet.encryptedRefreshToken = encrypt(plainRefresh);
      }
      if (conn.encryptedAccessToken && isLegacyToken(conn.encryptedAccessToken)) {
        const plainAccess = decryptString(conn.encryptedAccessToken);
        updateSet.encryptedAccessToken = encrypt(plainAccess);
      }
      if (Object.keys(updateSet).length > 0) {
        await GoogleCalendarConnection.findByIdAndUpdate(conn._id, { $set: updateSet });
        migrated++;
      }
    } catch {
      failed++;
    }
  }

  return { migrated, failed };
}

/**
 * Disconnect Google Calendar: stop watch channel, revoke tokens, and clear stored credentials.
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const connection = await GoogleCalendarConnection.findOne({ userId });
  if (!connection) {
    await GoogleOAuthState.deleteMany({ userId });
    return;
  }

  const oauth2Client = createOAuth2Client();
  let refreshToken: string | undefined;
  let accessToken: string | undefined;

  try {
    refreshToken = decryptString(connection.encryptedRefreshToken);
    if (connection.encryptedAccessToken) {
      accessToken = decryptString(connection.encryptedAccessToken);
    }
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch {
    // Token could not be decrypted; proceed with local cleanup
  }

  // Stop the Google watch channel BEFORE revoking the token so the API call is still authorized
  if (refreshToken || accessToken) {
    await stopWatchChannel(oauth2Client, connection.watchChannelId, connection.watchResourceId);
  }

  // Revoke the refresh token with Google
  if (refreshToken) {
    try {
      await oauth2Client.revokeToken(refreshToken);
    } catch {
      // Ignore revocation errors; we still clear locally
    }
  }

  // Mark sync mappings as disconnected so they can be re-linked on reconnect.
  // We preserve LifeAdmin records and do NOT delete Google Calendar events.
  const CalendarSyncMappingModel = (await import('../models/CalendarSyncMapping')).default;
  await CalendarSyncMappingModel.updateMany(
    { userId, googleConnectionId: connection._id },
    {
      $set: {
        syncState: 'error',
        syncError: 'Google Calendar disconnected',
      },
    }
  );

  await Promise.all([
    GoogleOAuthState.deleteMany({ userId }),
    GoogleCalendarConnection.findByIdAndDelete(connection._id),
  ]);
}

/**
 * Get connection status without exposing tokens.
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  status?: GoogleConnectionStatus;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  lastSyncError?: string;
  selectedCalendarId?: string;
  selectedCalendarName?: string;
} | null> {
  const connection = await GoogleCalendarConnection.findOne({ userId });
  if (!connection) return null;

  return {
    connected: connection.status === 'connected',
    status: connection.status,
    googleEmail: connection.googleEmail,
    googleName: connection.googleName,
    googlePicture: connection.googlePicture,
    connectedAt: connection.connectedAt,
    lastSyncAt: connection.lastSyncAt,
    lastSyncStatus: connection.lastSyncStatus,
    lastSyncError: connection.lastSyncError,
    selectedCalendarId: connection.selectedCalendarId,
    selectedCalendarName: connection.selectedCalendarName,
  };
}

/**
 * Update the selected calendar for the user.
 * Resets incremental sync token and watch channel when switching calendars.
 */
export async function updateSelectedCalendar(
  userId: string,
  calendarId: string,
  calendarName?: string,
  calendarTimezone?: string
): Promise<{ found: boolean; changed: boolean }> {
  const connection = await GoogleCalendarConnection.findOne({ userId, status: 'connected' });
  if (!connection) {
    return { found: false, changed: false };
  }

  const changed = connection.selectedCalendarId !== calendarId;
  if (changed && connection.watchChannelId && connection.watchResourceId) {
    try {
      const { oauth2Client } = await getAuthorizedClient(userId);
      await stopWatchChannel(oauth2Client, connection.watchChannelId, connection.watchResourceId);
    } catch {
      // Best-effort channel stop
    }
  }

  const updateOp: Record<string, unknown> = {
    $set: {
      selectedCalendarId: calendarId,
      selectedCalendarName: calendarName,
      selectedCalendarTimezone: calendarTimezone,
    },
  };

  if (changed) {
    updateOp.$unset = {
      googleSyncToken: '',
      watchChannelId: '',
      watchResourceId: '',
      watchChannelTokenHash: '',
      watchExpiration: '',
      lastSyncError: '',
    };
  }

  await GoogleCalendarConnection.findByIdAndUpdate(connection._id, updateOp);
  return { found: true, changed };
}

/**
 * List available Google calendars for the user.
 */
export async function listGoogleCalendars(userId: string): Promise<Array<{ id: string; name: string; timezone?: string | null; primary: boolean; accessRole: string }>> {
  const { oauth2Client } = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  try {
    const res = await calendar.calendarList.list();
    return (res.data.items || []).map((item: calendar_v3.Schema$CalendarListEntry) => ({
      id: item.id || 'primary',
      name: item.summary || 'Untitled Calendar',
      timezone: item.timeZone,
      primary: item.accessRole ? item.primary === true : item.id === 'primary',
      accessRole: item.accessRole || 'reader',
    }));
  } catch (err) {
    await handleGoogleAuthErrorIfRevoked(userId, err);
    throw err;
  }
}

/**
 * Build a Google Calendar API client with proper auth for a user.
 */
export async function getCalendarApi(userId: string): Promise<calendar_v3.Calendar> {
  const { oauth2Client } = await getAuthorizedClient(userId);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export { SCOPES };

/**
 * Sign the OAuth state token to prevent CSRF / userId substitution attacks.
 * Format: base64url(payload).base64url(hmacSignature)
 */
export function signState(payload: OAuthStatePayload): string {
  const key = getOAuthStateKey();
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', key).update(payloadB64).digest('base64url');
  return `${payloadB64}.${hmac}`;
}

/**
 * Verify and decode a signed OAuth state token.
 * Returns the payload if valid, or null if the signature is invalid or the token is malformed.
 */
export function verifyState(signedState: string): OAuthStatePayload | null {
  try {
    if (!signedState || typeof signedState !== 'string') return null;
    const dotIndex = signedState.lastIndexOf('.');
    if (dotIndex <= 0) return null;

    const payloadB64 = signedState.slice(0, dotIndex);
    const sigB64 = signedState.slice(dotIndex + 1);

    const key = getOAuthStateKey();
    const expectedSig = crypto.createHmac('sha256', key).update(payloadB64).digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length === 0 || sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.ts !== 'number' ||
      typeof payload.nonce !== 'string' ||
      !payload.nonce
    ) {
      return null;
    }

    return payload as OAuthStatePayload;
  } catch {
    return null;
  }
}
