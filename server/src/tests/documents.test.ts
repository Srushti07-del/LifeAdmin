import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';
import app from '../app';
import User from '../models/User';
import DocumentModel from '../models/Document';
import { generateToken } from '../middleware/auth';
import { classifyDocumentFallback } from '../services/documentExtraction';
import config from '../config';

describe('Document Authorization & Truthful Classification Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: any;
  let baseUrl: string;

  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let testDocA: any;
  let testDocB: any;

  const uploadDir = path.join(process.cwd(), config.uploadDir);

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // Create two test users
    userA = await User.create({
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123',
    });
    tokenA = generateToken(userA._id.toString());

    userB = await User.create({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123',
    });
    tokenB = generateToken(userB._id.toString());

    // Create a physical dummy file for User A
    const fileNameA = `test-file-a-${Date.now()}.txt`;
    const filePathA = path.join(uploadDir, fileNameA);
    fs.writeFileSync(filePathA, 'User A confidential content');

    testDocA = await DocumentModel.create({
      userId: userA._id,
      originalName: 'Confidential_UserA.txt',
      fileName: fileNameA,
      filePath: `/api/documents/placeholder/download`,
      fileSize: 26,
      mimeType: 'text/plain',
      category: 'Personal',
      aiProcessed: false,
    });
    testDocA.filePath = `/api/documents/${testDocA._id}/download`;
    await testDocA.save();

    // Create a physical dummy file for User B
    const fileNameB = `test-file-b-${Date.now()}.txt`;
    const filePathB = path.join(uploadDir, fileNameB);
    fs.writeFileSync(filePathB, 'User B confidential content');

    testDocB = await DocumentModel.create({
      userId: userB._id,
      originalName: 'Confidential_UserB.txt',
      fileName: fileNameB,
      filePath: `/api/documents/placeholder/download`,
      fileSize: 26,
      mimeType: 'text/plain',
      category: 'Finance',
      aiProcessed: false,
    });
    testDocB.filePath = `/api/documents/${testDocB._id}/download`;
    await testDocB.save();
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();

    // Clean up test files
    try {
      if (testDocA?.fileName) {
        const pA = path.join(uploadDir, testDocA.fileName);
        if (fs.existsSync(pA)) fs.unlinkSync(pA);
      }
      if (testDocB?.fileName) {
        const pB = path.join(uploadDir, testDocB.fileName);
        if (fs.existsSync(pB)) fs.unlinkSync(pB);
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it('rejects unauthenticated document download with 401', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}/download`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.match(body.message, /authentication/i);
  });

  it('rejects document download with invalid token with 401', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}/download`, {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    assert.equal(res.status, 401);
  });

  it('allows owner to download their document via Bearer header with 200', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}/download`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text, 'User A confidential content');
  });

  it('allows owner to download their document via query token (?token=...) with 200', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}/download?token=${tokenA}`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text, 'User A confidential content');
  });

  it('forbids User B from downloading User A document (returns 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}/download`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.match(body.message, /access denied/i);
  });

  it('forbids User B from viewing User A document metadata (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 403);
  });

  it('forbids User B from deleting User A document (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/documents/${testDocA._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 403);

    // Document A must still exist in DB
    const docStillExists = await DocumentModel.findById(testDocA._id);
    assert.ok(docStillExists);
  });

  it('returns 404 for non-existent document ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await fetch(`${baseUrl}/documents/${fakeId}/download`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 404);
  });

  it('returns 404 for invalid ObjectId format', async () => {
    const res = await fetch(`${baseUrl}/documents/not-an-id/download`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 404);
  });

  it('truthfully handles document upload without fabricating fake OCR/AI data', async () => {
    // Test multipart upload using FormData
    const formData = new FormData();
    const blob = new Blob(['Electric bill dummy text'], { type: 'text/plain' });
    formData.append('file', blob, 'electric_bill_january.txt');
    formData.append('category', 'Utilities');

    const res = await fetch(`${baseUrl}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    const doc = body.document;

    // AI extraction pipeline ran; with no real content it must NOT complete successfully
    assert.ok(doc.aiProcessed, 'aiProcessed should be true after extraction pipeline ran');
    assert.ok(['no_info', 'failed', 'unsupported'].includes(doc.aiExtractionStatus), 'extraction status should not be completed for dummy content');
    // Must NOT fabricate amounts, providers, or dates
    assert.deepEqual(doc.aiExtracted.amounts, [], 'Must not fabricate amounts');
    assert.deepEqual(doc.aiExtracted.importantDates, [], 'Must not fabricate dates');
    assert.equal(doc.aiExtracted.provider, '', 'Must not fabricate provider');

    // Clean up created file
    if (doc.fileName) {
      const p = path.join(uploadDir, doc.fileName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await DocumentModel.findByIdAndDelete(doc._id);
  });
});

describe('Document Filename Fallback Classification', () => {
  it('classifies academic case studies by filename', () => {
    const r = classifyDocumentFallback('CS101_Academic_Case_Study.pdf', '');
    assert.equal(r.documentType, 'Academic Case Study');
    assert.equal(r.category, 'Education');
  });

  it('classifies invoices by filename', () => {
    const r = classifyDocumentFallback('Invoice_ACME_Jan2026.pdf', '');
    assert.equal(r.documentType, 'Utility Bill');
    assert.equal(r.category, 'Utilities');
  });
});
