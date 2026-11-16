/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Documents Feature
 * Tests file size formatting, date formatting, upload validation, totals computation,
 * multi-criteria search/filtering/sorting, extraction status mapping, and entity conversion.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFileSize,
  formatDocumentDate,
  validateUploadFile,
  calculateDocumentTotals,
  filterAndSortDocuments,
  getExtractionStatusInfo,
  prepareEntityFromExtraction,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
} from '../features/documents/services/documentCalculations.ts';
import { DocumentItem } from '../features/documents/types.ts';
import {
  base64ToUint8Array,
  createUploadFilePart,
} from '../features/documents/services/uploadHelpers.ts';

function createMockDocument(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    _id: `doc-${Math.random().toString(36).substring(2, 9)}`,
    originalName: 'Apartment_Lease_2026.pdf',
    fileName: '1731234567890-123456789.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 500, // 500 KB
    filePath: '/api/documents/placeholder/download',
    documentType: 'Lease Agreement',
    category: 'Housing',
    notes: 'Includes parking space #42',
    aiProcessed: true,
    aiConfirmed: false,
    aiExtractionStatus: 'completed',
    aiExtracted: {
      provider: 'Highland Properties LLC',
      summary: '12-month residential lease expiring November 2027.',
      importantDates: [
        { label: 'Lease Expiry', date: '2027-11-30T00:00:00.000Z' },
        { label: 'Rent Due', date: '2026-12-01T00:00:00.000Z' },
      ],
      amounts: [
        { label: 'Monthly Rent', amount: 2400 },
        { label: 'Security Deposit', amount: 2400 },
      ],
      identifiers: [
        { label: 'Unit', value: 'Apt 4B' },
        { label: 'Agreement ID', value: 'AGR-9841' },
      ],
    },
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('File Size & Date Formatting', () => {
  it('formats byte sizes into readable units', () => {
    assert.strictEqual(formatFileSize(0), '0 B');
    assert.strictEqual(formatFileSize(-10), '0 B');
    assert.strictEqual(formatFileSize(512), '512 B');
    assert.strictEqual(formatFileSize(1024), '1.0 KB');
    assert.strictEqual(formatFileSize(1536), '1.5 KB');
    assert.strictEqual(formatFileSize(1024 * 1024), '1.0 MB');
    assert.strictEqual(formatFileSize(5.5 * 1024 * 1024), '5.5 MB');
  });

  it('formats document creation and extraction dates', () => {
    assert.strictEqual(formatDocumentDate('2026-11-15T00:00:00.000Z'), 'Nov 15, 2026');
    assert.strictEqual(formatDocumentDate('2026-03-05T12:00:00.000Z'), 'Mar 5, 2026');
    assert.strictEqual(formatDocumentDate(''), '');
  });
});

describe('File Upload Validation', () => {
  it('accepts files with valid extensions and sizes', () => {
    const validPdf = validateUploadFile({
      name: 'invoice.pdf',
      size: 1024 * 200,
      mimeType: 'application/pdf',
    });
    assert.strictEqual(validPdf.valid, true);

    const validImg = validateUploadFile({
      name: 'receipt.png',
      size: 1024 * 500,
      mimeType: 'image/png',
    });
    assert.strictEqual(validImg.valid, true);

    const validDocx = validateUploadFile({
      name: 'contract.docx',
      size: 1024 * 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    assert.strictEqual(validDocx.valid, true);
  });

  it('rejects files with forbidden extensions', () => {
    const invalidExe = validateUploadFile({
      name: 'malware.exe',
      size: 1024,
      mimeType: 'application/x-msdownload',
    });
    assert.strictEqual(invalidExe.valid, false);
    assert.ok(invalidExe.error?.includes('Invalid file format'));

    const invalidZip = validateUploadFile({
      name: 'archive.zip',
      size: 2048,
      mimeType: 'application/zip',
    });
    assert.strictEqual(invalidZip.valid, false);
  });

  it('rejects files exceeding the 10 MB limit', () => {
    const oversized = validateUploadFile({
      name: 'giant_scan.pdf',
      size: MAX_FILE_SIZE_BYTES + 1024,
      mimeType: 'application/pdf',
    });
    assert.strictEqual(oversized.valid, false);
    assert.ok(oversized.error?.includes('10 MB maximum limit'));
  });

  it('rejects empty or missing files', () => {
    const missing = validateUploadFile({ name: '' });
    assert.strictEqual(missing.valid, false);
    assert.ok(missing.error?.includes('choose a file'));
  });
});

describe('Dashboard Totals Computation', () => {
  it('correctly aggregates document metrics and total storage', () => {
    const sampleDocs: DocumentItem[] = [
      createMockDocument({
        _id: 'd1',
        fileSize: 1024 * 1024, // 1 MB
        aiExtractionStatus: 'completed',
        aiProcessed: true,
      }),
      createMockDocument({
        _id: 'd2',
        fileSize: 1024 * 512, // 512 KB
        aiExtractionStatus: 'processing',
        aiProcessed: false,
      }),
      createMockDocument({
        _id: 'd3',
        fileSize: 1024 * 256, // 256 KB
        aiExtractionStatus: 'failed',
        aiProcessed: false,
      }),
    ];

    const totals = calculateDocumentTotals(sampleDocs);
    assert.strictEqual(totals.totalCount, 3);
    assert.strictEqual(totals.processedCount, 1);
    assert.strictEqual(totals.processingCount, 1);
    assert.strictEqual(totals.failedCount, 1);
    assert.strictEqual(totals.totalSizeBytes, 1024 * 1024 + 1024 * 512 + 1024 * 256);
    assert.strictEqual(totals.totalSizeFormatted, '1.8 MB');
  });

  it('handles empty document list gracefully', () => {
    const totals = calculateDocumentTotals([]);
    assert.strictEqual(totals.totalCount, 0);
    assert.strictEqual(totals.processedCount, 0);
    assert.strictEqual(totals.processingCount, 0);
    assert.strictEqual(totals.failedCount, 0);
    assert.strictEqual(totals.totalSizeBytes, 0);
    assert.strictEqual(totals.totalSizeFormatted, '0 B');
  });
});

describe('Document Search, Filtering, and Sorting', () => {
  const doc1 = createMockDocument({
    _id: '1',
    originalName: 'Pacific_Gas_Electric_Bill.pdf',
    documentType: 'Utility Bill',
    category: 'Utilities',
    fileSize: 300 * 1024,
    createdAt: '2026-11-01T00:00:00.000Z',
    notes: 'Account ending in 4920',
    aiExtracted: {
      provider: 'PG&E',
      summary: 'Monthly gas and electric utility bill.',
      amounts: [{ label: 'Total Due', amount: 145 }],
      identifiers: [{ label: 'Account Number', value: 'PGE-90214' }],
    },
  });

  const doc2 = createMockDocument({
    _id: '2',
    originalName: 'Apartment_Lease_Agreement.pdf',
    documentType: 'Lease Agreement',
    category: 'Housing',
    fileSize: 1200 * 1024,
    createdAt: '2026-11-05T00:00:00.000Z',
    notes: 'Landlord contact info inside',
    aiExtracted: {
      provider: 'Oakridge Properties',
      summary: 'Annual apartment lease agreement.',
      amounts: [{ label: 'Rent', amount: 2100 }],
      identifiers: [{ label: 'Lease ID', value: 'OAK-2026' }],
    },
  });

  const doc3 = createMockDocument({
    _id: '3',
    originalName: 'Blood_Test_Results.pdf',
    documentType: 'Medical Record',
    category: 'Medical',
    fileSize: 600 * 1024,
    createdAt: '2026-11-03T00:00:00.000Z',
    notes: 'Routine fasting panel',
    aiExtracted: {
      provider: 'Quest Diagnostics',
      summary: 'Routine cholesterol and glucose blood test.',
      identifiers: [{ label: 'Patient ID', value: 'QD-7890' }],
    },
  });

  const allDocs = [doc1, doc2, doc3];

  it('filters documents by category', () => {
    const utilitiesOnly = filterAndSortDocuments(allDocs, 'Utilities');
    assert.strictEqual(utilitiesOnly.length, 1);
    assert.strictEqual(utilitiesOnly[0]._id, '1');

    const housingOnly = filterAndSortDocuments(allDocs, 'Housing');
    assert.strictEqual(housingOnly.length, 1);
    assert.strictEqual(housingOnly[0]._id, '2');

    const all = filterAndSortDocuments(allDocs, 'All');
    assert.strictEqual(all.length, 3);
  });

  it('searches documents across filename, provider, type, notes, and identifiers', () => {
    // By filename keyword
    const matchName = filterAndSortDocuments(allDocs, 'All', 'electric');
    assert.strictEqual(matchName.length, 1);
    assert.strictEqual(matchName[0]._id, '1');

    // By provider
    const matchProvider = filterAndSortDocuments(allDocs, 'All', 'quest');
    assert.strictEqual(matchProvider.length, 1);
    assert.strictEqual(matchProvider[0]._id, '3');

    // By document type
    const matchType = filterAndSortDocuments(allDocs, 'All', 'lease agreement');
    assert.strictEqual(matchType.length, 1);
    assert.strictEqual(matchType[0]._id, '2');

    // By notes
    const matchNotes = filterAndSortDocuments(allDocs, 'All', 'fasting');
    assert.strictEqual(matchNotes.length, 1);
    assert.strictEqual(matchNotes[0]._id, '3');

    // By extracted identifier value
    const matchId = filterAndSortDocuments(allDocs, 'All', 'PGE-90214');
    assert.strictEqual(matchId.length, 1);
    assert.strictEqual(matchId[0]._id, '1');

    // Non-matching query
    const noMatch = filterAndSortDocuments(allDocs, 'All', 'nonexistent_xyz');
    assert.strictEqual(noMatch.length, 0);
  });

  it('sorts documents by date, name, and size', () => {
    // Newest first (-createdAt)
    const byNewest = filterAndSortDocuments(allDocs, 'All', '', '-createdAt');
    assert.strictEqual(byNewest[0]._id, '2'); // Nov 5
    assert.strictEqual(byNewest[2]._id, '1'); // Nov 1

    // Oldest first (createdAt)
    const byOldest = filterAndSortDocuments(allDocs, 'All', '', 'createdAt');
    assert.strictEqual(byOldest[0]._id, '1'); // Nov 1
    assert.strictEqual(byOldest[2]._id, '2'); // Nov 5

    // Alphabetical by originalName
    const byName = filterAndSortDocuments(allDocs, 'All', '', 'originalName');
    assert.strictEqual(byName[0]._id, '2'); // Apartment_Lease...
    assert.strictEqual(byName[1]._id, '3'); // Blood_Test...
    assert.strictEqual(byName[2]._id, '1'); // Pacific_Gas...

    // Largest file size first (-fileSize)
    const byLargest = filterAndSortDocuments(allDocs, 'All', '', '-fileSize');
    assert.strictEqual(byLargest[0]._id, '2'); // 1200 KB
    assert.strictEqual(byLargest[2]._id, '1'); // 300 KB
  });
});

describe('Extraction Status & Entity Conversion', () => {
  it('maps extraction statuses to appropriate badges', () => {
    const processing = getExtractionStatusInfo('processing');
    assert.strictEqual(processing.label, 'Analyzing');

    const completed = getExtractionStatusInfo('completed');
    assert.strictEqual(completed.label, 'AI Analyzed');

    const failed = getExtractionStatusInfo('failed');
    assert.strictEqual(failed.label, 'Analysis Failed');

    const noInfo = getExtractionStatusInfo('no_info');
    assert.strictEqual(noInfo.label, 'No Data Detected');
  });

  it('prepares Task entity parameters from extracted document data', () => {
    const doc = createMockDocument();
    const taskParams = prepareEntityFromExtraction(doc, 'task');

    assert.strictEqual(taskParams.type, 'task');
    assert.ok(taskParams.title.includes(doc.originalName));
    assert.strictEqual(taskParams.dueDate, '2027-11-30');
    assert.strictEqual(taskParams.priority, 'medium');
  });

  it('prepares Bill entity parameters with extracted provider and amount', () => {
    const doc = createMockDocument();
    const billParams = prepareEntityFromExtraction(doc, 'bill');

    assert.strictEqual(billParams.type, 'bill');
    assert.strictEqual(billParams.title, 'Pay Highland Properties LLC');
    assert.strictEqual(billParams.amount, 2400);
    assert.strictEqual(billParams.dueDate, '2027-11-30');
  });

  it('prepares Reminder entity parameters', () => {
    const doc = createMockDocument();
    const reminderParams = prepareEntityFromExtraction(doc, 'reminder');

    assert.strictEqual(reminderParams.type, 'reminder');
    assert.ok(reminderParams.title.includes(doc.originalName));
    assert.strictEqual(reminderParams.dueDate, '2027-11-30');
  });
});

describe('Document Upload & Winter Fetch Compatibility (FormDataPart Fix)', () => {
  it('correctly decodes base64 strings to Uint8Array', () => {
    // "Hello World" in base64: SGVsbG8gV29ybGQ=
    const base64 = 'SGVsbG8gV29ybGQ=';
    const decoded = base64ToUint8Array(base64);
    const expected = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
    assert.deepStrictEqual(decoded, expected);
  });

  it('generates an Expo Winter-fetch compliant file part with bytes() method', async () => {
    // Simulate a data URI for testing readFileAsUint8Array fallback
    const sampleText = 'Document content bytes';
    const base64Data = Buffer.from(sampleText, 'utf8').toString('base64');
    const dataUri = `data:text/plain;base64,${base64Data}`;

    const filePart = await createUploadFilePart({
      uri: dataUri,
      name: 'receipt.txt',
      mimeType: 'text/plain',
    });

    assert.ok(filePart, 'File part must be created');
    assert.strictEqual(filePart.name, 'receipt.txt');
    assert.strictEqual(filePart.type, 'text/plain');
    assert.strictEqual(typeof filePart.bytes, 'function', 'Must implement bytes() for Expo Winter fetch convertFormDataAsync');

    const bytes = await filePart.bytes();
    assert.ok(bytes instanceof Uint8Array, 'bytes() must return a Uint8Array');
    const decodedText = Buffer.from(bytes).toString('utf8');
    assert.strictEqual(decodedText, sampleText);
  });

  it('provides prepareAccessibleUploadFile that preserves accessible paths and provides safe fallback', async () => {
    const { prepareAccessibleUploadFile } = await import('../features/documents/services/uploadHelpers.ts');
    assert.strictEqual(typeof prepareAccessibleUploadFile, 'function');

    const result = await prepareAccessibleUploadFile({
      uri: 'file:///app/accessible/doc.pdf',
      name: 'doc.pdf',
    });
    assert.ok(result);
    assert.ok(result.localUri);
  });

  it('tryNativeUploadAsync handles unreadable native locations gracefully', async () => {
    const { tryNativeUploadAsync, isServerErrorToRethrow } = await import('../features/documents/services/uploadHelpers.ts');
    assert.strictEqual(typeof tryNativeUploadAsync, 'function');
    assert.strictEqual(typeof isServerErrorToRethrow, 'function');

    // On node/test environment, returns null cleanly without crashing or throwing
    const result = await tryNativeUploadAsync(
      {
        file: {
          uri: 'file:///data/user/0/host.exp.exponent/cache/DocumentPicker/test.pdf',
          name: 'test.pdf',
          mimeType: 'application/pdf',
        },
      },
      'file:///data/user/0/host.exp.exponent/cache/DocumentPicker/test.pdf'
    );
    assert.strictEqual(result, null);

    assert.strictEqual(isServerErrorToRethrow({ status: 400 }), true);
    assert.strictEqual(isServerErrorToRethrow({ status: 401 }), true);
    assert.strictEqual(isServerErrorToRethrow({ message: 'File too large' }), true);
    assert.strictEqual(isServerErrorToRethrow({ message: 'Random transport glitch' }), false);
  });

  it('constructs a Winter-fetch compliant multipart payload with bytes() method', async () => {
    const sampleText = 'PDF content sample';
    const base64Data = Buffer.from(sampleText, 'utf8').toString('base64');
    const dataUri = `data:application/pdf;base64,${base64Data}`;

    const filePart = await createUploadFilePart({
      uri: dataUri,
      name: 'uploaded_doc.pdf',
      mimeType: 'application/pdf',
    });

    const formData = new FormData();
    formData.append('file', filePart);
    formData.append('category', 'Housing');
    formData.append('documentType', 'Lease Agreement');

    assert.ok(formData instanceof FormData);
    assert.strictEqual(formData.get('category'), 'Housing');
    assert.strictEqual(formData.get('documentType'), 'Lease Agreement');

    assert.strictEqual(filePart.name, 'uploaded_doc.pdf');
    assert.strictEqual(filePart.type, 'application/pdf');
    assert.strictEqual(typeof filePart.bytes, 'function', 'file part must have bytes() method for Winter fetch');
    const bytes = await filePart.bytes();
    assert.ok(bytes instanceof Uint8Array);
    assert.strictEqual(Buffer.from(bytes).toString('utf8'), sampleText);
  });
});

