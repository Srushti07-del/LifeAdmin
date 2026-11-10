/**
 * Unit Tests for LifeAdmin Mobile Password Reset Deep Linking
 * Validates token extraction across HTTPS App Links, custom schemes,
 * parameter ordering, encoding, and invalid/unrelated URLs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractResetPasswordToken } from '../features/auth/utils/deepLink.ts';

describe('Password Reset Deep Link Token Extraction', () => {
  it('extracts token from canonical HTTPS Android App Link', () => {
    const url = 'https://lifeadmin.app/reset-password?token=sec_token_alpha123';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'sec_token_alpha123');
  });

  it('extracts token with trailing slash in path', () => {
    const url = 'https://lifeadmin.app/reset-password/?token=sec_token_slash';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'sec_token_slash');
  });

  it('extracts token from subdomain HTTPS URL', () => {
    const url = 'https://auth.lifeadmin.app/reset-password?token=subdomain_token';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'subdomain_token');
  });

  it('extracts token from custom scheme lifeadmin://', () => {
    const url = 'lifeadmin://reset-password?token=custom_scheme_token';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'custom_scheme_token');
  });

  it('extracts token from triple-slash custom scheme lifeadmin:///', () => {
    const url = 'lifeadmin:///reset-password?token=triple_slash_token';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'triple_slash_token');
  });

  it('extracts token from Expo development URL', () => {
    const url = 'exp://192.168.1.50:8081/--/reset-password?token=expo_dev_token';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'expo_dev_token');
  });

  it('extracts and trims whitespace from token', () => {
    const url = 'https://lifeadmin.app/reset-password?token=%20padded_token%20';
    const token = extractResetPasswordToken(url);
    assert.strictEqual(token, 'padded_token');
  });

  it('handles multiple query parameters in any order', () => {
    const url1 = 'https://lifeadmin.app/reset-password?utm_source=email&token=multi_param_token&lang=en';
    assert.strictEqual(extractResetPasswordToken(url1), 'multi_param_token');

    const url2 = 'https://lifeadmin.app/reset-password?token=first_param_token&channel=mobile';
    assert.strictEqual(extractResetPasswordToken(url2), 'first_param_token');
  });

  it('returns null when token query parameter is absent', () => {
    const url = 'https://lifeadmin.app/reset-password';
    assert.strictEqual(extractResetPasswordToken(url), null);
  });

  it('returns null when token query parameter is empty or only whitespace', () => {
    assert.strictEqual(extractResetPasswordToken('https://lifeadmin.app/reset-password?token='), null);
    assert.strictEqual(extractResetPasswordToken('https://lifeadmin.app/reset-password?token=%20%20'), null);
  });

  it('returns null for unrelated web application paths', () => {
    assert.strictEqual(extractResetPasswordToken('https://lifeadmin.app/login'), null);
    assert.strictEqual(extractResetPasswordToken('https://lifeadmin.app/tasks?token=123'), null);
    assert.strictEqual(extractResetPasswordToken('https://lifeadmin.app/forgot-password'), null);
  });

  it('returns null for unrelated custom scheme paths', () => {
    assert.strictEqual(extractResetPasswordToken('lifeadmin://login'), null);
    assert.strictEqual(extractResetPasswordToken('lifeadmin://tasks?filter=today'), null);
  });

  it('gracefully returns null for invalid, non-string, or empty input', () => {
    assert.strictEqual(extractResetPasswordToken(''), null);
    assert.strictEqual(extractResetPasswordToken(null), null);
    assert.strictEqual(extractResetPasswordToken(undefined), null);
    assert.strictEqual(extractResetPasswordToken('just-a-plain-string'), null);
  });
});
