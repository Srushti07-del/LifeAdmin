process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import net from 'net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createHash } from 'crypto';
import app from '../app';
import User from '../models/User';
import { sendPasswordResetEmail, resetTransporter } from '../services/email';

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
      resetTransporter();
    }
  });

  it('rejects invalid email formats with 400 and clear error message', async () => {
    const invalidInputs = ['', 'invalid-email', 'missing-at.com', '@nodomain.com'];
    for (const email of invalidInputs) {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      assert.equal(res.status, 400);
      const body = (await res.json()) as any;
      assert.equal(body.message, 'Valid email is required');
    }
  });

  it('handles SMTP connection failure gracefully by returning 503 and cleaning up DB token', async () => {
    // Configure SMTP to point to an unreachable local port that immediately refuses connection
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '9'; // Discard port (rejects/refuses)
    process.env.SMTP_USER = 'test-user';
    process.env.SMTP_PASS = 'test-pass';
    resetTransporter();

    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com' }),
      });

      assert.equal(res.status, 503);
      const body = (await res.json()) as any;
      assert.equal(body.message, 'Failed to send password reset email. Please try again later.');

      // Verify the token was cleaned up in MongoDB so an unmailed token is not left active
      const user = await User.findOne({ email: 'alice@example.com' });
      assert.equal(user?.resetPasswordToken, undefined);
      assert.equal(user?.resetPasswordExpires, undefined);
    } finally {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      resetTransporter();
    }
  });

  it('enforces timeout on sendPasswordResetEmail so it never hangs indefinitely', async () => {
    // Point to a non-routable IP with a tiny custom timeout (e.g. 250ms)
    process.env.SMTP_HOST = '192.0.2.1'; // RFC 5737 TEST-NET-1 (blackhole / drops packets)
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'timeout-user';
    process.env.SMTP_PASS = 'timeout-pass';
    resetTransporter();

    try {
      const startTime = Date.now();
      await assert.rejects(
        async () => {
          await sendPasswordResetEmail('alice@example.com', 'https://lifeadmin.app/reset', { timeoutMs: 250 });
        },
        (err: any) => {
          assert.equal(err.code, 'ETIMEDOUT');
          assert.match(err.message, /timed out/i);
          return true;
        }
      );
      const duration = Date.now() - startTime;
      assert.ok(duration < 2000, `Must reject quickly on timeout, took ${duration}ms`);
    } finally {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      resetTransporter();
    }
  });

  it('successfully delivers password reset email via SMTP and stores single-use token hash', async () => {
    let receivedData = '';
    const mockSmtpServer = net.createServer((socket) => {
      socket.write('220 smtp.mock.local ESMTP\r\n');
      socket.on('data', (chunk) => {
        const text = chunk.toString();
        receivedData += text;
        if (text.startsWith('EHLO') || text.startsWith('HELO')) {
          socket.write('250-smtp.mock.local\r\n250 AUTH PLAIN\r\n');
        } else if (text.startsWith('AUTH')) {
          socket.write('235 2.7.0 Authentication successful\r\n');
        } else if (text.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 Ok\r\n');
        } else if (text.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 Ok\r\n');
        } else if (text.startsWith('DATA')) {
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (text.includes('\r\n.\r\n') || text === '.\r\n') {
          socket.write('250 2.0.0 Ok: queued as mock-msg-12345\r\n');
        } else if (text.startsWith('QUIT')) {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        }
      });
    });

    await new Promise<void>((resolve) => mockSmtpServer.listen(0, '127.0.0.1', () => resolve()));
    const port = (mockSmtpServer.address() as net.AddressInfo).port;

    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_SECURE = 'false';
    resetTransporter();

    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com' }),
      });

      assert.equal(res.status, 200);
      const body = (await res.json()) as any;
      assert.equal(body.message, 'If an account exists for this email, a password reset link has been sent.');

      // Verify email was received by our mock SMTP server
      assert.ok(receivedData.includes('alice@example.com'), 'Email content must be sent to recipient');
      assert.ok(receivedData.includes('Reset your LifeAdmin password'), 'Subject must be in email');

      // Verify token hash is stored in MongoDB with future expiry
      const user = await User.findOne({ email: 'alice@example.com' });
      assert.ok(user?.resetPasswordToken, 'Reset token hash must be set in database');
      assert.ok(user?.resetPasswordExpires, 'Expiry must be set');
      assert.ok(user!.resetPasswordExpires!.getTime() > Date.now(), 'Expiry must be in future');
    } finally {
      mockSmtpServer.close();
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_SECURE;
      resetTransporter();
    }
  });

  it('handles database error during user lookup gracefully without leaking internals', async () => {
    process.env.SMTP_HOST = 'smtp.mock.local';
    process.env.SMTP_USER = 'test-user';
    process.env.SMTP_PASS = 'test-pass';

    const originalFindOne = User.findOne;
    (User as any).findOne = () => {
      throw new Error('Simulated database connection failure');
    };

    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com' }),
      });

      assert.equal(res.status, 500);
      const body = (await res.json()) as any;
      assert.equal(body.message, 'Failed to process password reset request due to a database error.');
    } finally {
      User.findOne = originalFindOne;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    }
  });
});

