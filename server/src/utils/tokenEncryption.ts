import crypto from 'crypto';

const CBC_IV_LENGTH = 16;
const GCM_IV_LENGTH = 12;
const TAG_LENGTH = 16; // GCM authentication tag is 16 bytes (128-bit)

// Format versions:
//   v1:<iv_hex>:<ciphertext_hex>   — legacy AES-256-CBC (no authentication; migrated on decrypt)
//   v2:<iv_b64>:<tag_b64>:<ct_b64> — AES-256-GCM (authenticated encryption)

function getKey(): Buffer {
  const keyHex = (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '').trim();
  if (!keyHex) {
    throw new Error(
      'GOOGLE_TOKEN_ENCRYPTION_KEY is not configured. Set it to a 32-byte hex string (64 hex chars) to enable Google Calendar token encryption.'
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      'GOOGLE_TOKEN_ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes)'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM (authenticated encryption).
 * Returns versioned format: v2:<iv_base64url>:<tag_base64url>:<ciphertext_base64url>
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

/**
 * Decrypt a versioned encrypted string.
 * Supports v2 (AES-256-GCM) and legacy v1 (AES-256-CBC) for safe seamless migration.
 * Callers should re-encrypt version 1 tokens with encrypt() to migrate to AES-256-GCM.
 */
export function decrypt(encryptedText: string): { plaintext: string; version: number } {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('Invalid encrypted token format');
  }

  const parts = encryptedText.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid encrypted token format');
  }

  const version = parts[0];

  // --- v2: AES-256-GCM (authenticated) ---
  if (version === 'v2') {
    if (parts.length !== 4) {
      throw new Error('Invalid v2 encrypted token format');
    }
    const key = getKey();
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const encrypted = Buffer.from(parts[3], 'base64url');

    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error('Invalid v2 IV length');
    }
    if (tag.length !== TAG_LENGTH) {
      throw new Error('Invalid v2 authentication tag length');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return { plaintext: decrypted.toString('utf8'), version: 2 };
  }

  // --- v1: legacy AES-256-CBC (no authentication) — DEPRECATED, read-only for migration ---
  if (version === 'v1') {
    if (parts.length !== 3) {
      throw new Error('Invalid v1 encrypted token format');
    }
    const key = getKey();
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    if (iv.length !== CBC_IV_LENGTH || encrypted.length === 0) {
      throw new Error('Invalid v1 encrypted token payload');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return { plaintext: decrypted.toString('utf8'), version: 1 };
  }

  // --- Legacy unversioned AES-256-CBC (<32-hex-iv>:<hex-ct>) fallback for migration ---
  if (parts.length === 2 && /^[0-9a-fA-F]{32}$/.test(parts[0]) && /^[0-9a-fA-F]+$/.test(parts[1])) {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');

    if (encrypted.length === 0) {
      throw new Error('Invalid legacy encrypted token payload');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return { plaintext: decrypted.toString('utf8'), version: 1 };
  }

  throw new Error(`Unknown encryption version: ${version}`);
}

/**
 * Backward-compatible decrypt that returns just the plaintext string.
 */
export function decryptString(encryptedText: string): string {
  return decrypt(encryptedText).plaintext;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether an encrypted token uses a legacy unauthenticated format (v1 or unversioned CBC)
 * and should be re-encrypted to v2 (AES-256-GCM).
 */
export function isLegacyToken(encryptedText: string): boolean {
  if (!encryptedText || typeof encryptedText !== 'string') return false;
  if (encryptedText.startsWith('v2:')) return false;
  return encryptedText.startsWith('v1:') || /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(encryptedText);
}
