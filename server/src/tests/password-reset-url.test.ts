import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePasswordResetUrl,
  getPublicWebBaseUrl,
} from '../services/passwordResetUrl';

describe('Password Reset URL Generation Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.APP_URL;
    delete process.env.CLIENT_URL;
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe('Development & Test Environment (Default)', () => {
    it('generates standard reset URL with fallback localhost:5173 when no env var is set', () => {
      const url = generatePasswordResetUrl('secure-token-123');
      assert.equal(url, 'http://localhost:5173/reset-password?token=secure-token-123');
    });

    it('honors APP_URL environment variable', () => {
      process.env.APP_URL = 'http://localhost:3000';
      const url = generatePasswordResetUrl('token-abc');
      assert.equal(url, 'http://localhost:3000/reset-password?token=token-abc');
    });

    it('honors CLIENT_URL when APP_URL is not set', () => {
      process.env.CLIENT_URL = 'http://127.0.0.1:4173';
      const url = generatePasswordResetUrl('token-xyz');
      assert.equal(url, 'http://127.0.0.1:4173/reset-password?token=token-xyz');
    });

    it('prefers APP_URL over CLIENT_URL if both are specified', () => {
      process.env.APP_URL = 'http://localhost:8080';
      process.env.CLIENT_URL = 'http://localhost:5173';
      const url = generatePasswordResetUrl('token-priority');
      assert.equal(url, 'http://localhost:8080/reset-password?token=token-priority');
    });

    it('strips trailing slashes from base URL cleanly', () => {
      process.env.APP_URL = 'http://localhost:5173///';
      const url = generatePasswordResetUrl('token-clean');
      assert.equal(url, 'http://localhost:5173/reset-password?token=token-clean');
    });

    it('properly URI encodes tokens containing special characters', () => {
      const specialToken = 'token+with spaces&symbols=123/456';
      const url = generatePasswordResetUrl(specialToken);
      assert.equal(
        url,
        `http://localhost:5173/reset-password?token=${encodeURIComponent(specialToken)}`
      );
    });

    it('throws error when token is missing or empty', () => {
      assert.throws(() => generatePasswordResetUrl(''), /valid reset token is required/i);
      assert.throws(() => generatePasswordResetUrl('   '), /valid reset token is required/i);
    });

    it('supports options object signature with web channel', () => {
      const url = generatePasswordResetUrl({
        token: 'token-options',
        channel: 'web',
      });
      assert.equal(url, 'http://localhost:5173/reset-password?token=token-options');
    });
  });

  describe('Production Environment Validation (Strict Security Rules)', () => {
    it('throws clear configuration error if neither APP_URL nor CLIENT_URL is set in production', () => {
      assert.throws(
        () => getPublicWebBaseUrl({ nodeEnv: 'production', rawUrl: '' }),
        /APP_URL \(or CLIENT_URL\) must be set/i
      );
    });

    it('rejects unencrypted HTTP protocol in production', () => {
      assert.throws(
        () =>
          getPublicWebBaseUrl({
            nodeEnv: 'production',
            rawUrl: 'http://my-domain.com',
          }),
        /must use HTTPS/i
      );
    });

    it('rejects localhost and loopback domains in production', () => {
      const loopbacks = [
        'https://localhost',
        'https://localhost:5173',
        'https://127.0.0.1:5173',
        'https://0.0.0.0:5000',
        'https://app.local',
      ];

      for (const loopback of loopbacks) {
        assert.throws(
          () =>
            getPublicWebBaseUrl({
              nodeEnv: 'production',
              rawUrl: loopback,
            }),
          /cannot be localhost or loopback/i,
          `Expected ${loopback} to be rejected in production`
        );
      }
    });

    it('rejects malformed invalid URLs', () => {
      assert.throws(
        () =>
          getPublicWebBaseUrl({
            nodeEnv: 'production',
            rawUrl: 'not-a-valid-url',
          }),
        /invalid application URL/i
      );
    });

    it('generates verified HTTPS URL in production when properly configured', () => {
      const url = generatePasswordResetUrl({
        token: 'prod-token-999',
        baseUrl: 'https://lifeadmin.app',
        nodeEnv: 'production',
      });

      assert.equal(url, 'https://lifeadmin.app/reset-password?token=prod-token-999');
    });

    it('fails clearly in generatePasswordResetUrl when production config is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.APP_URL;
      delete process.env.CLIENT_URL;

      assert.throws(
        () => generatePasswordResetUrl({ token: 'prod-token', nodeEnv: 'production' }),
        /Production configuration error/i
      );
    });
  });
});

