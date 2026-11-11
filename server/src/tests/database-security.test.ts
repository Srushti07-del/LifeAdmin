import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskMongoUri,
  sanitizeErrorMessage,
  sanitizeMongoError,
} from '../config/database';

describe('MongoDB Credential Logging Security Tests', () => {
  const secretPass = 'SuperSecretP@ssword123!';
  const encodedPass = encodeURIComponent(secretPass);

  describe('maskMongoUri', () => {
    it('masks password in standard Atlas SRV URI while preserving host, db and query params', () => {
      const uri = `mongodb+srv://adminUser:${secretPass}@cluster0.abcde.mongodb.net/lifeadmin?retryWrites=true&w=majority`;
      const masked = maskMongoUri(uri);

      assert.ok(!masked.includes(secretPass), 'Masked URI must not contain the secret password');
      assert.ok(masked.includes('adminUser:****@'), 'Masked URI should contain adminUser:****@');
      assert.ok(masked.includes('cluster0.abcde.mongodb.net'), 'Masked URI must preserve the hostname');
      assert.ok(masked.includes('/lifeadmin'), 'Masked URI must preserve the database name');
      assert.ok(masked.includes('retryWrites=true'), 'Masked URI must preserve query parameters');
    });

    it('masks password in standard local URI with user/password', () => {
      const uri = `mongodb://dbUser:${secretPass}@localhost:27017/lifeadmin`;
      const masked = maskMongoUri(uri);

      assert.ok(!masked.includes(secretPass));
      assert.equal(masked, 'mongodb://dbUser:****@localhost:27017/lifeadmin');
    });

    it('masks percent-encoded passwords correctly', () => {
      const uri = `mongodb+srv://user:${encodedPass}@cluster.mongodb.net/prod?ssl=true`;
      const masked = maskMongoUri(uri);

      assert.ok(!masked.includes(encodedPass));
      assert.ok(!masked.includes(secretPass));
      assert.ok(masked.includes('user:****@'));
      assert.ok(masked.includes('/prod?ssl=true'));
    });

    it('leaves URI without credentials intact', () => {
      const uri = 'mongodb://localhost:27017/lifeadmin';
      const masked = maskMongoUri(uri);

      assert.equal(masked, 'mongodb://localhost:27017/lifeadmin');
    });

    it('handles empty, null, or undefined input gracefully', () => {
      assert.equal(maskMongoUri(''), '');
      assert.equal(maskMongoUri(undefined), '');
      assert.equal(maskMongoUri(null as any), '');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('redacts MongoDB URIs embedded within error messages', () => {
      const rawUri = `mongodb+srv://app_admin:${secretPass}@cluster0.xyz.mongodb.net/lifeadmin`;
      const errorMsg = `Connection failed: error while connecting to ${rawUri}: connection timeout`;
      const sanitized = sanitizeErrorMessage(errorMsg, rawUri);

      assert.ok(!sanitized.includes(secretPass), 'Sanitized message must not contain secret password');
      assert.ok(sanitized.includes('app_admin:****@cluster0.xyz.mongodb.net/lifeadmin'));
    });

    it('redacts standalone raw password occurrences if rawUri is provided', () => {
      const rawUri = `mongodb+srv://app_admin:${secretPass}@cluster0.xyz.mongodb.net/lifeadmin`;
      const errorMsg = `Authentication failed using credentials: username app_admin with key ${secretPass} at node 1`;
      const sanitized = sanitizeErrorMessage(errorMsg, rawUri);

      assert.ok(!sanitized.includes(secretPass));
      assert.ok(sanitized.includes('****'));
    });

    it('redacts both encoded and decoded password forms if different', () => {
      const rawUri = `mongodb+srv://user:${encodedPass}@cluster.mongodb.net/db`;
      const errorMsg = `Error connecting with encoded ${encodedPass} or decoded ${secretPass}`;
      const sanitized = sanitizeErrorMessage(errorMsg, rawUri);

      assert.ok(!sanitized.includes(encodedPass));
      assert.ok(!sanitized.includes(secretPass));
    });
  });

  describe('sanitizeMongoError', () => {
    it('sanitizes message and stack trace on Error instances', () => {
      const rawUri = `mongodb+srv://adminUser:${secretPass}@cluster0.mongodb.net/testdb`;
      const err = new Error(`MongoServerSelectionError: connect ECONNREFUSED ${rawUri}`);
      err.stack = `Error: MongoServerSelectionError: connect ECONNREFUSED ${rawUri}\n    at connectDB (/app/dist/config/database.js:31:30)`;

      const sanitized = sanitizeMongoError(err, rawUri);

      assert.ok(!sanitized.message.includes(secretPass));
      assert.ok(!sanitized.stack!.includes(secretPass));
      assert.ok(sanitized.message.includes('adminUser:****@'));
      assert.ok(sanitized.stack!.includes('adminUser:****@'));
    });

    it('deeply sanitizes nested properties on error objects without crashing on circular references', () => {
      const rawUri = `mongodb+srv://adminUser:${secretPass}@cluster0.mongodb.net/testdb`;
      const err: any = new Error('Connection failed');
      err.reason = {
        servers: {
          'server-1': `Host failed: ${rawUri}`,
        },
        description: `Failed with token ${secretPass}`,
      };
      // Add circular reference to verify safety
      err.self = err;

      const sanitized = sanitizeMongoError(err, rawUri);

      assert.ok(!sanitized.reason.servers['server-1'].includes(secretPass));
      assert.ok(sanitized.reason.servers['server-1'].includes('adminUser:****@'));
      assert.ok(!sanitized.reason.description.includes(secretPass));
      assert.ok(sanitized.reason.description.includes('****'));
    });

    it('handles primitive string errors', () => {
      const rawUri = `mongodb+srv://adminUser:${secretPass}@cluster0.mongodb.net/testdb`;
      const errorStr = `Fatal: failed to connect to ${rawUri}`;
      const sanitized = sanitizeMongoError(errorStr, rawUri);

      assert.ok(!sanitized.includes(secretPass));
      assert.ok(sanitized.includes('adminUser:****@'));
    });
  });
});

