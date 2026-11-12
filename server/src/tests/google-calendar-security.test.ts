import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

import app from '../app';
import config from '../config';
import User from '../models/User';
import CalendarEvent from '../models/CalendarEvent';
import Task from '../models/Task';
import GoogleCalendarConnection from '../models/GoogleCalendarConnection';
import CalendarSyncMapping from '../models/CalendarSyncMapping';
import GoogleOAuthState from '../models/GoogleOAuthState';
import { generateToken } from '../middleware/auth';
import {
  encrypt,
  decrypt,
  decryptString,
  isEncryptionConfigured,
  isLegacyToken,
} from '../utils/tokenEncryption';
import {
  getGoogleCalendarCallbackUrl,
  signState,
  verifyState,
  hashChannelToken,
  verifyChannelToken,
  sanitizeGoogleErrorMessage,
  getAuthorizedClient,
  migrateLegacyTokens,
  disconnectGoogleCalendar,
  updateSelectedCalendar,
} from '../services/googleCalendar';
import {
  pushToGoogle,
  pullFromGoogle,
  enqueueRecordSync,
} from '../services/googleCalendarSync';

function encryptLegacyV1(plaintext: string, keyHex: string, includePrefix = true): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const payload = `${iv.toString('hex')}:${encrypted}`;
  return includePrefix ? `v1:${payload}` : payload;
}

describe('Google Calendar Security & Reliability Audit Tests', () => {
  const TEST_KEY = crypto.randomBytes(32).toString('hex');
  const ALT_KEY = crypto.randomBytes(32).toString('hex');

  let mongoServer: MongoMemoryServer;
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  const originalEnv: Record<string, string | undefined> = {};
  const originalConfigValues: Record<string, unknown> = {};

  const originalGoogleCalendar = google.calendar;
  const originalGoogleOauth2 = google.oauth2;
  const originalRefreshAccessToken = OAuth2Client.prototype.refreshAccessToken;
  const originalGetToken = OAuth2Client.prototype.getToken;
  const originalRevokeToken = OAuth2Client.prototype.revokeToken;

  before(async () => {
    for (const k of [
      'NODE_ENV',
      'GOOGLE_TOKEN_ENCRYPTION_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CALLBACK_URL',
      'GOOGLE_CALENDAR_CALLBACK_URL',
      'JWT_SECRET',
    ]) {
      originalEnv[k] = process.env[k];
    }

    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-audit';

    const cfg = config as unknown as Record<string, unknown>;
    for (const k of ['jwtSecret', 'googleClientId', 'googleClientSecret']) {
      originalConfigValues[k] = cfg[k];
    }
    if (!cfg.jwtSecret) cfg.jwtSecret = process.env.JWT_SECRET;
    if (!cfg.googleClientId) cfg.googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!cfg.googleClientSecret) cfg.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();

    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    const cfg = config as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(originalConfigValues)) {
      cfg[k] = v;
    }
  });

  beforeEach(async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    await Promise.all([
      User.deleteMany({}),
      CalendarEvent.deleteMany({}),
      Task.deleteMany({}),
      GoogleCalendarConnection.deleteMany({}),
      CalendarSyncMapping.deleteMany({}),
      GoogleOAuthState.deleteMany({}),
    ]);
  });

  afterEach(() => {
    (google as unknown as { calendar: typeof originalGoogleCalendar }).calendar =
      originalGoogleCalendar;
    (google as unknown as { oauth2: typeof originalGoogleOauth2 }).oauth2 =
      originalGoogleOauth2;
    OAuth2Client.prototype.refreshAccessToken = originalRefreshAccessToken;
    OAuth2Client.prototype.getToken = originalGetToken;
    OAuth2Client.prototype.revokeToken = originalRevokeToken;
  });

  describe('1. Refresh-token encryption (AES-256-GCM) & legacy v1 migration', () => {
    it('encrypts with v2 AES-256-GCM, authenticates ciphertext/IV/tag, and rejects truncated tags', () => {
      assert.equal(isEncryptionConfigured(), true);

      const secret = '1//0gFakeRefreshTokenSecretValue';
      const cipher = encrypt(secret);
      // Format: v2:<12B iv base64url>:<16B tag base64url>:<ciphertext base64url>
      assert.match(cipher, /^v2:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]+$/);
      assert.equal(isLegacyToken(cipher), false);

      const decrypted = decrypt(cipher);
      assert.equal(decrypted.plaintext, secret);
      assert.equal(decrypted.version, 2);
      assert.equal(decryptString(cipher), secret);

      const flipFirstByte = (b64: string): string => {
        const buf = Buffer.from(b64, 'base64url');
        buf[0] ^= 0xff;
        return buf.toString('base64url');
      };

      const parts = cipher.split(':');
      // Tamper ciphertext (parts[3])
      assert.throws(() => decrypt([parts[0], parts[1], parts[2], flipFirstByte(parts[3])].join(':')));

      // Tamper auth tag (parts[2])
      assert.throws(() => decrypt([parts[0], parts[1], flipFirstByte(parts[2]), parts[3]].join(':')));

      // Reject truncated auth tag (tag truncation protection, authTagLength=16)
      assert.throws(() =>
        decrypt([parts[0], parts[1], parts[2].slice(0, 8), parts[3]].join(':'))
      );

      // Reject tampered IV (parts[1])
      assert.throws(() => decrypt([parts[0], flipFirstByte(parts[1]), parts[2], parts[3]].join(':')));
    });

    it('reads GOOGLE_TOKEN_ENCRYPTION_KEY dynamically and rejects invalid keys', () => {
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'short-invalid-key';
      assert.equal(isEncryptionConfigured(), false);
      assert.throws(() => encrypt('test'));

      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = ALT_KEY;
      assert.equal(isEncryptionConfigured(), true);
      const cipher = encrypt('alt-key-token');
      assert.equal(decryptString(cipher), 'alt-key-token');

      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = TEST_KEY;
      assert.throws(() => decrypt(cipher));
    });

    it('decrypts prefixed v1 and unversioned legacy AES-256-CBC tokens and migrates via migrateLegacyTokens()', async () => {
      const user = await User.create({
        name: 'Legacy User',
        email: 'legacy@example.com',
        password: 'password123',
      });

      const rawAccess = 'ya29.legacy-access';
      const rawRefresh = '1//0gLegacyRefresh';
      const v1Access = encryptLegacyV1(rawAccess, TEST_KEY, true);
      const unversionedRefresh = encryptLegacyV1(rawRefresh, TEST_KEY, false);

      assert.equal(isLegacyToken(v1Access), true);
      assert.equal(isLegacyToken(unversionedRefresh), true);
      assert.deepEqual(decrypt(v1Access), { plaintext: rawAccess, version: 1 });
      assert.deepEqual(decrypt(unversionedRefresh), { plaintext: rawRefresh, version: 1 });

      const freshConn = await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-legacy-1',
        googleEmail: 'legacy@gmail.com',
        encryptedAccessToken: v1Access,
        encryptedRefreshToken: unversionedRefresh,
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });
      assert.ok(freshConn);

      const stats = await migrateLegacyTokens();
      assert.equal(stats.migrated, 1);
      assert.equal(stats.failed, 0);

      const updated = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.ok(updated);
      assert.ok(updated.encryptedAccessToken?.startsWith('v2:'));
      assert.ok(updated.encryptedRefreshToken.startsWith('v2:'));
      assert.equal(decryptString(updated.encryptedAccessToken!), rawAccess);
      assert.equal(decryptString(updated.encryptedRefreshToken), rawRefresh);
    });

    it('migrates legacy v1 refresh token to v2 during access-token refresh in getAuthorizedClient()', async () => {
      const user = await User.create({
        name: 'Refresh Migrate User',
        email: 'refreshmigrate@example.com',
        password: 'password123',
      });

      const oldRefresh = '1//0gOldRefreshToken';
      const v1Access = encryptLegacyV1('ya29.expired', TEST_KEY, true);
      const v1Refresh = encryptLegacyV1(oldRefresh, TEST_KEY, true);

      await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-refresh-migrate-1',
        googleEmail: 'migrate@gmail.com',
        encryptedAccessToken: v1Access,
        encryptedRefreshToken: v1Refresh,
        accessTokenExpiresAt: new Date(Date.now() - 60_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });

      // Google normal refresh often returns only a new access_token without rotating refresh_token
      OAuth2Client.prototype.refreshAccessToken = async function () {
        return {
          credentials: {
            access_token: 'ya29.fresh-access',
            expiry_date: Date.now() + 3600_000,
          },
          res: null,
        } as unknown as Awaited<ReturnType<OAuth2Client['refreshAccessToken']>>;
      };

      const { connection } = await getAuthorizedClient(user._id.toString());
      assert.equal(connection.status, 'connected');

      const fresh = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.ok(fresh);
      assert.ok(fresh.encryptedAccessToken?.startsWith('v2:'));
      assert.ok(fresh.encryptedRefreshToken.startsWith('v2:'));
      assert.equal(decryptString(fresh.encryptedAccessToken!), 'ya29.fresh-access');
      assert.equal(decryptString(fresh.encryptedRefreshToken), oldRefresh);
    });
  });

  describe('2. OAuth state validation, callback URL & CSRF protection', () => {
    it('rejects tampered OAuth state signatures and malformed payloads, and rejects expired timestamps on callback', async () => {
      const user = await User.create({
        name: 'State User',
        email: 'state@example.com',
        password: 'password123',
      });
      const nonce = crypto.randomBytes(16).toString('hex');
      const state = signState({
        userId: user._id.toString(),
        ts: Date.now(),
        nonce,
      });
      const verified = verifyState(state);
      assert.ok(verified);
      assert.equal(verified.userId, user._id.toString());

      // Tamper signature
      const [b64, sig] = state.split('.');
      const badSig = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
      assert.equal(verifyState(`${b64}.${badSig}`), null);

      // Tamper payload
      const forgedPayload = Buffer.from(
        JSON.stringify({ userId: new mongoose.Types.ObjectId().toString(), ts: Date.now(), nonce }),
        'utf8'
      ).toString('base64url');
      assert.equal(verifyState(`${forgedPayload}.${sig}`), null);

      // Expired state (>10 minutes) rejected by GET /api/google-calendar/callback
      const expiredState = signState({
        userId: user._id.toString(),
        ts: Date.now() - 15 * 60 * 1000,
        nonce,
      });
      const expRes = await fetch(
        `${baseUrl}/google-calendar/callback?code=c&state=${encodeURIComponent(expiredState)}`,
        { redirect: 'manual' }
      );
      assert.equal(expRes.status, 302);
      assert.match(expRes.headers.get('location') || '', /google_calendar=error&reason=expired_state/);
    });

    it('resolves Google Calendar callback URL without reusing Passport auth callback path', () => {
      delete process.env.GOOGLE_CALENDAR_CALLBACK_URL;
      process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';
      const resolved = getGoogleCalendarCallbackUrl();
      assert.equal(resolved, 'http://localhost:5000/api/google-calendar/callback');
    });

    it('enforces CSRF cookie binding and atomic single-use nonce consumption on OAuth callback', async () => {
      const user = await User.create({
        name: 'OAuth User',
        email: 'oauth@example.com',
        password: 'password123',
      });
      const token = generateToken(user._id.toString());

      process.env.GOOGLE_CALENDAR_CALLBACK_URL = `${baseUrl}/google-calendar/callback`;

      const authRes = await fetch(`${baseUrl}/google-calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(authRes.status, 200);
      const authData = (await authRes.json()) as { authUrl: string };
      assert.ok(authData.authUrl);

      const cookieHeader = authRes.headers.get('set-cookie') || '';
      const cookieMatch = cookieHeader.match(/gcal_oauth_csrf=([^;]+)/);
      assert.ok(cookieMatch, 'Expected gcal_oauth_csrf cookie on auth-url response');

      const stateParam = new URL(authData.authUrl).searchParams.get('state');
      assert.ok(stateParam);

      // 1) Wrong CSRF cookie must be rejected
      const badCsrfRes = await fetch(
        `${baseUrl}/google-calendar/callback?code=valid-code&state=${encodeURIComponent(stateParam)}`,
        {
          redirect: 'manual',
          headers: { Cookie: 'gcal_oauth_csrf=wrong-csrf-token' },
        }
      );
      assert.equal(badCsrfRes.status, 302);
      const badLocation = badCsrfRes.headers.get('location') || '';
      assert.match(badLocation, /google_calendar=error&reason=csrf_mismatch/);

      // Stub Google token exchange, userinfo & calendar client for happy callback
      OAuth2Client.prototype.getToken = async function () {
        return {
          tokens: {
            access_token: 'ya29.oauth-access',
            refresh_token: '1//0gOAuthRefresh',
            expiry_date: Date.now() + 3600_000,
          },
          res: null,
        } as unknown as Awaited<ReturnType<OAuth2Client['getToken']>>;
      };

      (google as unknown as Record<string, unknown>).oauth2 = () => ({
        userinfo: {
          get: async () => ({
            data: { id: 'gid-oauth-user', email: 'oauth@gmail.com' },
          }),
        },
      });

      (google as unknown as Record<string, unknown>).calendar = () => ({
        calendarList: {
          list: async () => ({
            data: {
              items: [{ id: 'primary', summary: 'Primary', primary: true }],
            },
          }),
        },
        events: {
          list: async () => ({
            data: { items: [], nextSyncToken: 'sync-tok-1' },
          }),
          watch: async () => ({
            data: { resourceId: 'res-1', expiration: String(Date.now() + 86400_000) },
          }),
        },
      });

      // Fresh auth-url for happy flow + replay test
      const authRes2 = await fetch(`${baseUrl}/google-calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(authRes2.status, 200);
      const authData2 = (await authRes2.json()) as { authUrl: string };
      const cookieMatch2 = (authRes2.headers.get('set-cookie') || '').match(
        /gcal_oauth_csrf=([^;]+)/
      );
      assert.ok(cookieMatch2);
      const csrfCookie2 = `gcal_oauth_csrf=${cookieMatch2[1]}`;
      const stateParam2 = new URL(authData2.authUrl).searchParams.get('state')!;

      const okRes = await fetch(
        `${baseUrl}/google-calendar/callback?code=valid-code&state=${encodeURIComponent(stateParam2)}`,
        {
          redirect: 'manual',
          headers: { Cookie: csrfCookie2 },
        }
      );
      assert.equal(okRes.status, 302);
      assert.match(okRes.headers.get('location') || '', /google_calendar=connected/);

      // 2) Replaying the exact same state & cookie must fail (nonce consumed atomically)
      const replayRes = await fetch(
        `${baseUrl}/google-calendar/callback?code=valid-code&state=${encodeURIComponent(stateParam2)}`,
        {
          redirect: 'manual',
          headers: { Cookie: csrfCookie2 },
        }
      );
      assert.equal(replayRes.status, 302);
      assert.match(replayRes.headers.get('location') || '', /google_calendar=error&reason=invalid_state/);
    });
  });

  describe('3. Token refresh concurrency, revocation & disconnect ordering', () => {
    it('deduplicates concurrent refreshes and keeps status connected on transient errors', async () => {
      const user = await User.create({
        name: 'Refresh Race User',
        email: 'race@example.com',
        password: 'password123',
      });

      await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-race-1',
        googleEmail: 'race@gmail.com',
        encryptedAccessToken: encrypt('ya29.old'),
        encryptedRefreshToken: encrypt('1//0gRefresh'),
        accessTokenExpiresAt: new Date(Date.now() - 60_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });

      let refreshCalls = 0;
      OAuth2Client.prototype.refreshAccessToken = async function () {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 40));
        return {
          credentials: {
            access_token: 'ya29.concurrent-new',
            expiry_date: Date.now() + 3600_000,
          },
          res: null,
        } as unknown as Awaited<ReturnType<OAuth2Client['refreshAccessToken']>>;
      };

      const [r1, r2, r3] = await Promise.all([
        getAuthorizedClient(user._id.toString()),
        getAuthorizedClient(user._id.toString()),
        getAuthorizedClient(user._id.toString()),
      ]);
      assert.equal(refreshCalls, 1);
      assert.ok(r1 && r2 && r3);

      // Force transient error -> status must NOT turn 'expired'
      await GoogleCalendarConnection.updateOne(
        { userId: user._id },
        { accessTokenExpiresAt: new Date(Date.now() - 60_000) }
      );
      OAuth2Client.prototype.refreshAccessToken = async function () {
        throw new Error('ETIMEDOUT upstream');
      };

      await assert.rejects(() => getAuthorizedClient(user._id.toString()));
      let conn = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.equal(conn?.status, 'connected');

      // Permanent invalid_grant -> status MUST become 'expired'
      OAuth2Client.prototype.refreshAccessToken = async function () {
        throw new Error('invalid_grant: Token has been expired or revoked.');
      };
      await assert.rejects(() => getAuthorizedClient(user._id.toString()));
      conn = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.equal(conn?.status, 'expired');
    });

    it('stops watch channel BEFORE revoking tokens during disconnectGoogleCalendar()', async () => {
      const user = await User.create({
        name: 'Disconnect User',
        email: 'disconnect@example.com',
        password: 'password123',
      });

      await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-disconnect-1',
        googleEmail: 'disconnect@gmail.com',
        encryptedAccessToken: encrypt('ya29.access'),
        encryptedRefreshToken: encrypt('1//0gRefresh'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
        watchChannelId: crypto.randomUUID(),
        watchResourceId: 'watch-res-123',
      });

      const order: string[] = [];
      (google as unknown as Record<string, unknown>).calendar = () => ({
        channels: {
          stop: async () => {
            order.push('channels.stop');
            return { data: {} };
          },
        },
      });
      OAuth2Client.prototype.revokeToken = async function () {
        order.push('revokeToken');
        return {} as Awaited<ReturnType<OAuth2Client['revokeToken']>>;
      };

      await disconnectGoogleCalendar(user._id.toString());
      assert.deepEqual(order, ['channels.stop', 'revokeToken']);

      const remaining = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.equal(remaining, null);
    });

    it('sanitizes credential leakage from error messages and returns 404 on select-calendar when disconnected', async () => {
      const leaked = sanitizeGoogleErrorMessage({
        message:
          'Request failed with Authorization: Bearer ya29.secret_tok and refresh_token=1//secret',
      });
      assert.doesNotMatch(leaked, /ya29\.secret_tok/);
      assert.doesNotMatch(leaked, /1\/\/secret/);

      const user = await User.create({
        name: 'No Conn User',
        email: 'noconn@example.com',
        password: 'password123',
      });
      const token = generateToken(user._id.toString());

      const res = await fetch(`${baseUrl}/google-calendar/select-calendar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId: 'primary' }),
      });
      assert.equal(res.status, 404);
      const body = (await res.json()) as { message: string };
      assert.equal(body.message, 'Google Calendar is not connected');

      const direct = await updateSelectedCalendar(user._id.toString(), 'primary');
      assert.equal(direct.found, false);
    });
  });

  describe('4. Webhook channel, resource, token & syncToken protection', () => {
    it('validates webhook headers, resourceId, channel token, expiration, sync handshake & not_exists', async () => {
      const user = await User.create({
        name: 'Webhook User',
        email: 'webhook@example.com',
        password: 'password123',
      });

      const channelId = crypto.randomUUID();
      const channelSecret = crypto.randomBytes(24).toString('hex');
      const tokenHash = hashChannelToken(channelSecret);
      assert.equal(verifyChannelToken(channelSecret, tokenHash), true);
      assert.equal(verifyChannelToken('wrong-secret', tokenHash), false);

      await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-webhook-1',
        googleEmail: 'webhook@gmail.com',
        encryptedAccessToken: encrypt('ya29.access'),
        encryptedRefreshToken: encrypt('1//0gRefresh'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
        watchChannelId: channelId,
        watchResourceId: 'res-abc',
        watchChannelTokenHash: tokenHash,
        watchExpiration: new Date(Date.now() + 3600_000),
        googleSyncToken: 'keep-this-sync-token',
      });

      // Missing headers -> 400
      const missingRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
      });
      assert.equal(missingRes.status, 400);

      // Unknown channel -> 404
      const unknownRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': crypto.randomUUID(),
          'X-Goog-Resource-ID': 'res-abc',
          'X-Goog-Resource-State': 'exists',
          'X-Goog-Channel-Token': channelSecret,
        },
      });
      assert.equal(unknownRes.status, 404);

      // Mismatched resourceId -> 403
      const badResourceRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': channelId,
          'X-Goog-Resource-ID': 'evil-res',
          'X-Goog-Resource-State': 'exists',
          'X-Goog-Channel-Token': channelSecret,
        },
      });
      assert.equal(badResourceRes.status, 403);

      // Wrong X-Goog-Channel-Token -> 401
      const badTokenRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': channelId,
          'X-Goog-Resource-ID': 'res-abc',
          'X-Goog-Resource-State': 'exists',
          'X-Goog-Channel-Token': 'forged-token',
        },
      });
      assert.equal(badTokenRes.status, 401);

      // Valid 'sync' handshake -> 200 and MUST preserve googleSyncToken
      const syncRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': channelId,
          'X-Goog-Resource-ID': 'res-abc',
          'X-Goog-Resource-State': 'sync',
          'X-Goog-Channel-Token': channelSecret,
        },
      });
      assert.equal(syncRes.status, 200);
      let conn = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.equal(conn?.googleSyncToken, 'keep-this-sync-token');

      // Valid 'not_exists' -> 200 and clears watch fields
      const stopRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': channelId,
          'X-Goog-Resource-ID': 'res-abc',
          'X-Goog-Resource-State': 'not_exists',
          'X-Goog-Channel-Token': channelSecret,
        },
      });
      assert.equal(stopRes.status, 200);
      conn = await GoogleCalendarConnection.findOne({ userId: user._id });
      assert.equal(conn?.watchChannelId, undefined);
      assert.equal(conn?.watchResourceId, undefined);

      // Expired watch channel -> 410
      const expiredChannelId = crypto.randomUUID();
      await GoogleCalendarConnection.updateOne(
        { userId: user._id },
        {
          watchChannelId: expiredChannelId,
          watchResourceId: 'res-exp',
          watchChannelTokenHash: tokenHash,
          watchExpiration: new Date(Date.now() - 10_000),
        }
      );
      const expiredRes = await fetch(`${baseUrl}/google-calendar/webhook`, {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': expiredChannelId,
          'X-Goog-Resource-ID': 'res-exp',
          'X-Goog-Resource-State': 'exists',
          'X-Goog-Channel-Token': channelSecret,
        },
      });
      assert.equal(expiredRes.status, 410);
    });
  });

  describe('5, 6, 7 & 8. Ownership IDOR, ETag loop prevention, deletions, locks & retries', () => {
    it('prevents cross-user IDOR on pullFromGoogle, handles ETags, cancelled events without extendedProperties, and 410 recovery', async () => {
      const userA = await User.create({
        name: 'User A',
        email: 'usera@example.com',
        password: 'password123',
      });
      const userB = await User.create({
        name: 'User B',
        email: 'userb@example.com',
        password: 'password123',
      });

      const victimEvent = await CalendarEvent.create({
        userId: userB._id,
        title: 'Victim Private Event',
        startDate: new Date('2026-11-20T09:00:00Z'),
        sourceType: 'manual',
      });
      const victimTask = await Task.create({
        userId: userB._id,
        title: 'Victim Private Task',
        status: 'todo',
      });

      await GoogleCalendarConnection.create({
        userId: userA._id,
        googleId: 'gid-usera-1',
        googleEmail: 'usera@gmail.com',
        encryptedAccessToken: encrypt('ya29.a'),
        encryptedRefreshToken: encrypt('1//a'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
        googleSyncToken: 'old-sync-tok',
      });

      const localUserAEvent = await CalendarEvent.create({
        userId: userA._id,
        title: 'User A Event',
        startDate: new Date('2026-11-21T10:00:00Z'),
        sourceType: 'manual',
      });

      let listCalls = 0;
      (google as unknown as Record<string, unknown>).calendar = () => ({
        events: {
          list: async (params: { syncToken?: string }) => {
            listCalls += 1;
            if (params.syncToken === 'old-sync-tok') {
              const err = new Error('Sync token is no longer valid') as Error & {
                code?: number;
              };
              err.code = 410;
              throw err;
            }
            return {
              data: {
                items: [
                  {
                    id: 'g-idor-event',
                    etag: '"etag-idor-1"',
                    summary: 'HIJACKED',
                    start: { dateTime: '2026-11-20T12:00:00+05:30' },
                    end: { dateTime: '2026-11-20T13:00:00+05:30' },
                    updated: new Date().toISOString(),
                    extendedProperties: {
                      private: {
                        lifeadmin_source: 'calendar_event',
                        lifeadmin_record_id: victimEvent._id.toString(),
                      },
                    },
                  },
                  {
                    id: 'g-idor-task',
                    etag: '"etag-idor-2"',
                    summary: 'HIJACKED TASK',
                    start: { date: '2026-11-20' },
                    end: { date: '2026-11-21' },
                    updated: new Date().toISOString(),
                    extendedProperties: {
                      private: {
                        lifeadmin_source: 'task',
                        lifeadmin_record_id: victimTask._id.toString(),
                      },
                    },
                  },
                  {
                    id: 'g-usera-event',
                    etag: '"etag-ua-1"',
                    summary: 'Updated By Google',
                    start: { dateTime: '2026-11-21T14:30:00+05:30' },
                    end: { dateTime: '2026-11-21T15:30:00+05:30' },
                    updated: new Date().toISOString(),
                    extendedProperties: {
                      private: {
                        lifeadmin_source: 'manual',
                        lifeadmin_record_id: localUserAEvent._id.toString(),
                      },
                    },
                  },
                ],
                nextSyncToken: 'fresh-sync-tok',
              },
            };
          },
        },
      });

      const pullResult = await pullFromGoogle(userA._id.toString(), 'old-sync-tok');
      assert.equal(listCalls, 2); // 410 retried automatically with full sync
      assert.equal(pullResult.newSyncToken, 'fresh-sync-tok');

      // User B's records MUST be completely untouched
      const freshVictimEvent = await CalendarEvent.findById(victimEvent._id);
      const freshVictimTask = await Task.findById(victimTask._id);
      assert.equal(freshVictimEvent?.title, 'Victim Private Event');
      assert.equal(freshVictimTask?.title, 'Victim Private Task');

      // User A's event updated and mapped under canonical 'calendar_event' with normalized HH:MM time
      const updatedUserAEvent = await CalendarEvent.findById(localUserAEvent._id);
      assert.equal(updatedUserAEvent?.title, 'Updated By Google');
      assert.match(updatedUserAEvent?.startTime || '', /^\d{2}:\d{2}$/);

      // Re-pulling same ETag must be ignored (loop / echo prevention)
      await CalendarEvent.updateOne(
        { _id: localUserAEvent._id },
        { title: 'Edited Title Locally' }
      );
      await pullFromGoogle(userA._id.toString(), 'fresh-sync-tok');
      const afterSameEtag = await CalendarEvent.findById(localUserAEvent._id);
      assert.equal(afterSameEtag?.title, 'Edited Title Locally');

      // Google sends cancelled event WITHOUT extendedProperties -> tombstones mapping, preserves LifeAdmin record
      (google as unknown as Record<string, unknown>).calendar = () => ({
        events: {
          list: async () => ({
            data: {
              items: [{ id: 'g-usera-event', status: 'cancelled' }],
              nextSyncToken: 'sync-after-cancel',
            },
          }),
        },
      });
      const cancelPull = await pullFromGoogle(userA._id.toString(), 'fresh-sync-tok');
      assert.equal(cancelPull.deleted, 1);

      const preservedEvent = await CalendarEvent.findById(localUserAEvent._id);
      assert.ok(preservedEvent, 'LifeAdmin event should be preserved after Google deletion');

      const tombstoneMapping = await CalendarSyncMapping.findOne({
        userId: userA._id,
        googleEventId: 'g-usera-event',
      });
      assert.equal(tombstoneMapping?.googleEventDeleted, true);

      // Push after tombstone must respect googleEventDeleted and NOT silently recreate ghost event
      let insertCalled = false;
      (google as unknown as Record<string, unknown>).calendar = () => ({
        events: {
          insert: async () => {
            insertCalled = true;
            return { data: { id: 'ghost' } };
          },
          patch: async () => ({ data: { id: 'g-usera-event' } }),
        },
      });
      await pushToGoogle(userA._id.toString(), 'calendar_event', localUserAEvent._id);
      assert.equal(insertCalled, false);
    });

    it('serializes concurrent pushToGoogle calls and persists pending_push on transient failure in enqueueRecordSync', async () => {
      const user = await User.create({
        name: 'Queue User',
        email: 'queue@example.com',
        password: 'password123',
      });
      await GoogleCalendarConnection.create({
        userId: user._id,
        googleId: 'gid-queue-1',
        googleEmail: 'queue@gmail.com',
        encryptedAccessToken: encrypt('ya29.q'),
        encryptedRefreshToken: encrypt('1//q'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });

      const ev1 = await CalendarEvent.create({
        userId: user._id,
        title: 'Concurrent 1',
        startDate: new Date('2026-11-22T09:00:00Z'),
        sourceType: 'manual',
      });
      const ev2 = await CalendarEvent.create({
        userId: user._id,
        title: 'Concurrent 2',
        startDate: new Date('2026-11-23T09:00:00Z'),
        sourceType: 'manual',
      });

      let inFlight = 0;
      let maxConcurrent = 0;
      let counter = 0;
      (google as unknown as Record<string, unknown>).calendar = () => ({
        events: {
          insert: async (req: {
            requestBody?: { extendedProperties?: { private?: { lifeadmin_source?: string } } };
          }) => {
            inFlight += 1;
            maxConcurrent = Math.max(maxConcurrent, inFlight);
            assert.equal(
              req.requestBody?.extendedProperties?.private?.lifeadmin_source,
              'calendar_event'
            );
            await new Promise((r) => setTimeout(r, 30));
            inFlight -= 1;
            counter += 1;
            return { data: { id: `g-conc-${counter}`, etag: '"e1"' } };
          },
        },
      });

      await Promise.all([
        pushToGoogle(user._id.toString(), 'calendar_event', ev1._id),
        pushToGoogle(user._id.toString(), 'calendar_event', ev2._id),
      ]);
      assert.equal(maxConcurrent, 1, 'Concurrent pushes for the same user must serialize');

      // Transient failure in enqueueRecordSync -> records pending_push + sanitized error
      const ev3 = await CalendarEvent.create({
        userId: user._id,
        title: 'Transient Retry Event',
        startDate: new Date('2026-11-24T09:00:00Z'),
        sourceType: 'manual',
      });
      (google as unknown as Record<string, unknown>).calendar = () => ({
        events: {
          insert: async () => {
            throw new Error('503 Service Unavailable Authorization: Bearer ya29.do_not_leak');
          },
        },
      });

      const ev4 = await CalendarEvent.create({
        userId: user._id,
        title: 'Transient Retry Event 2',
        startDate: new Date('2026-11-25T09:00:00Z'),
        sourceType: 'manual',
      });

      await enqueueRecordSync(user._id, 'calendar_event', ev3._id, 'create');
      await enqueueRecordSync(user._id, 'calendar_event', ev4._id, 'create');

      const retryMapping = await CalendarSyncMapping.findOne({
        userId: user._id,
        sourceId: ev3._id,
      });
      const retryMapping2 = await CalendarSyncMapping.findOne({
        userId: user._id,
        sourceId: ev4._id,
      });
      assert.ok(retryMapping);
      assert.ok(retryMapping2);
      assert.equal(retryMapping.syncState, 'pending_push');
      assert.equal(retryMapping2.syncState, 'pending_push');
      assert.doesNotMatch(retryMapping.syncError || '', /ya29\.do_not_leak/);

      // Conflict detection: when Google changed after lastSyncedAt, push marks conflict without resetting lastLocalChangeAt
      const originalLocalChangeAt = new Date('2026-11-22T08:00:00Z');
      await CalendarSyncMapping.findOneAndUpdate(
        { userId: user._id, sourceId: ev1._id },
        {
          $set: {
            lastSyncedAt: new Date('2026-11-22T09:00:00Z'),
            lastGoogleChangeAt: new Date('2026-11-22T10:00:00Z'),
            lastLocalChangeAt: originalLocalChangeAt,
          },
        }
      );
      await assert.rejects(() => pushToGoogle(user._id.toString(), 'calendar_event', ev1._id), /Sync conflict/i);
      const conflictMapping = await CalendarSyncMapping.findOne({
        userId: user._id,
        sourceId: ev1._id,
      });
      assert.equal(conflictMapping?.syncState, 'conflict');
      assert.equal(
        conflictMapping?.lastLocalChangeAt?.getTime(),
        originalLocalChangeAt.getTime()
      );
    });

    it('cascades GoogleCalendarConnection, CalendarSyncMapping & GoogleOAuthState on DELETE /api/users/account', async () => {
      const victim = await User.create({
        name: 'Cascade User',
        email: 'cascade@example.com',
        password: 'password123',
      });
      const other = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
      });

      const victimToken = generateToken(victim._id.toString());

      const victimConn = await GoogleCalendarConnection.create({
        userId: victim._id,
        googleId: 'gid-cascade-vic',
        googleEmail: 'cascade@gmail.com',
        encryptedAccessToken: encrypt('ya29.vic'),
        encryptedRefreshToken: encrypt('1//vic'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });
      await CalendarSyncMapping.create({
        userId: victim._id,
        googleConnectionId: victimConn._id,
        sourceType: 'calendar_event',
        sourceId: new mongoose.Types.ObjectId(),
        googleEventId: 'g-vic-1',
        googleCalendarId: 'primary',
        syncState: 'synced',
      });
      await GoogleOAuthState.create({
        nonce: crypto.randomBytes(16).toString('hex'),
        userId: victim._id,
        expiresAt: new Date(Date.now() + 600_000),
      });

      await GoogleCalendarConnection.create({
        userId: other._id,
        googleId: 'gid-cascade-oth',
        googleEmail: 'other@gmail.com',
        encryptedAccessToken: encrypt('ya29.oth'),
        encryptedRefreshToken: encrypt('1//oth'),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        selectedCalendarId: 'primary',
        status: 'connected',
      });

      OAuth2Client.prototype.revokeToken = async function () {
        return {} as Awaited<ReturnType<OAuth2Client['revokeToken']>>;
      };

      const delRes = await fetch(`${baseUrl}/users/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${victimToken}` },
      });
      assert.equal(delRes.status, 200);

      assert.equal(
        await GoogleCalendarConnection.countDocuments({ userId: victim._id }),
        0
      );
      assert.equal(
        await CalendarSyncMapping.countDocuments({ userId: victim._id }),
        0
      );
      assert.equal(
        await GoogleOAuthState.countDocuments({ userId: victim._id }),
        0
      );
      assert.equal(
        await GoogleCalendarConnection.countDocuments({ userId: other._id }),
        1
      );
    });
  });
});
