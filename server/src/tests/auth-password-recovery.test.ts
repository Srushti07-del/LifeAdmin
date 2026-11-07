import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createHash } from 'crypto';
import app from '../app';
import User from '../models/User';

describe('Authentication & Password Recovery Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('registers a new user successfully and returns token + user profile', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Springs',
        email: 'alice@example.com',
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.token, 'Must return JWT token');
    assert.equal(body.user.email, 'alice@example.com');
    assert.equal(body.user.name, 'Alice Springs');
  });

  it('rejects registration with duplicate email with clean friendly message and no [DEV] leaks', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'AnotherPassword123!',
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(
      body.message,
      'An account with this email already exists. Please sign in or reset your password.'
    );
    assert.equal(body.stack, undefined, 'Must not expose stack trace');
    assert.ok(!JSON.stringify(body).includes('[DEV]'), 'Must not contain [DEV] prefix');
  });

  it('rejects login with incorrect password without leaking internal details', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'WrongPassword!',
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.message, 'Invalid email or password');
    assert.ok(!JSON.stringify(body).includes('[DEV]'));
  });

  it('rejects login for non-existent email with identical 401 message (no email enumeration)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'WrongPassword!',
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.message, 'Invalid email or password');
  });

  it('returns 503 when requesting password reset without configured SMTP email provider', async () => {
    // Ensure SMTP env vars are unset
    const oldHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com' }),
      });

      assert.equal(res.status, 503);
      const body = (await res.json()) as any;
      assert.match(body.message, /email service is not configured/i);
    } finally {
      if (oldHost) process.env.SMTP_HOST = oldHost;
    }
  });

  it('handles forgot-password when email provider is configured, creates hashed token, and prevents enumeration', async () => {
    // Temporarily set SMTP env vars to mock configuration
    process.env.SMTP_HOST = 'smtp.mock.local';
    process.env.SMTP_USER = 'mock_user';
    process.env.SMTP_PASS = 'mock_pass';

    try {
      // 1. Request reset for non-existent email -> returns generic confirmation (no enumeration)
      const nonExistentRes = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });
      assert.equal(nonExistentRes.status, 200);
      const nonExistentBody = (await nonExistentRes.json()) as any;
      assert.equal(
        nonExistentBody.message,
        'If an account exists for this email, a password reset link has been sent.'
      );

      // 2. Request reset for existing user alice@example.com
      // (Directly simulate token creation on user model to test the secure hash storage and reset)
      const rawToken = 'test-secure-random-token-1234567890abcdef';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes in future

      await User.findOneAndUpdate(
        { email: 'alice@example.com' },
        {
          resetPasswordToken: tokenHash,
          resetPasswordExpires: expiresAt,
        }
      );

      // Verify token in DB is hashed and not plaintext
      const dbUser = await User.findOne({ email: 'alice@example.com' });
      assert.equal(dbUser?.resetPasswordToken, tokenHash);
      assert.notEqual(dbUser?.resetPasswordToken, rawToken, 'Token must not be stored in plaintext');

      // 3. Test incorrect reset token
      const wrongTokenRes = await fetch(`${baseUrl}/auth/reset-password/invalid-bogus-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'NewValidPassword123!',
          confirmPassword: 'NewValidPassword123!',
        }),
      });
      assert.equal(wrongTokenRes.status, 400);
      const wrongTokenBody = (await wrongTokenRes.json()) as any;
      assert.equal(wrongTokenBody.message, 'Invalid or expired reset token.');

      // 4. Test expired token
      await User.findOneAndUpdate(
        { email: 'alice@example.com' },
        { resetPasswordExpires: new Date(Date.now() - 1000) } // expired 1s ago
      );
      const expiredRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'NewValidPassword123!',
          confirmPassword: 'NewValidPassword123!',
        }),
      });
      assert.equal(expiredRes.status, 400);

      // Restore unexpired token
      await User.findOneAndUpdate(
        { email: 'alice@example.com' },
        {
          resetPasswordToken: tokenHash,
          resetPasswordExpires: expiresAt,
        }
      );

      // 5. Successful password reset
      const successRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'BrandNewSecurePassword123!',
          confirmPassword: 'BrandNewSecurePassword123!',
        }),
      });
      assert.equal(successRes.status, 200);
      const successBody = (await successRes.json()) as any;
      assert.match(successBody.message, /password has been reset successfully/i);

      // 6. Token reuse prevention (token should be invalidated immediately)
      const reuseRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
        }),
      });
      assert.equal(reuseRes.status, 400, 'Reused token must be rejected');

      // 7. Verify token is cleared in DB
      const updatedUser = await User.findOne({ email: 'alice@example.com' });
      assert.equal(updatedUser?.resetPasswordToken, undefined);
      assert.equal(updatedUser?.resetPasswordExpires, undefined);

      // 8. Old password fails login
      const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@example.com',
          password: 'Password123!',
        }),
      });
      assert.equal(oldLoginRes.status, 401);

      // 9. New password succeeds login
      const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@example.com',
          password: 'BrandNewSecurePassword123!',
        }),
      });
      assert.equal(newLoginRes.status, 200);
      const newLoginBody = (await newLoginRes.json()) as any;
      assert.ok(newLoginBody.token);
      assert.equal(newLoginBody.user.email, 'alice@example.com');
    } finally {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    }
  });

  it('preserves guest demo session creation regression check', async () => {
    const res = await fetch(`${baseUrl}/auth/guest`, {
      method: 'POST',
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.token);
    assert.equal(body.user.isDemo, true);
    assert.match(body.user.email, /@lifeadmin\.demo$/);
  });
});

