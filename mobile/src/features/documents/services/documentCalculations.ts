/**
 * LifeAdmin Mobile — Documents Calculations & Helpers
 * Pure domain logic: size formatting, file validation, totals,
 * multi-criteria search/filtering, and extraction entity converters.
 */

import {
  DocumentItem,
  DocumentSortKey,
  DocumentTotals,
  ExtractionStatus,
  CreateEntityFromDocParams,
} from '../types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit matching server config

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'txt',
];

/**
 * Formats byte size into human readable string (B, KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats document upload or creation date
 */
export function formatDocumentDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Validates file extension and size prior to network transfer
 */
export function validateUploadFile(file: {
  name: string;
  size?: number;
  mimeType?: string;
}): { valid: boolean; error?: string } {
  if (!file || !file.name) {
    return { valid: false, error: 'Please choose a file to upload.' };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(extension);

  const mime = (file.mimeType || '').toLowerCase();
  const isAllowedMime =
    mime.includes('pdf') ||
    mime.includes('image') ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('text') ||
    mime === 'application/octet-stream';

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      error: 'Invalid file format. Supported formats: PDF, Images (JPG, PNG, WEBP), Word (.doc, .docx), and Text (.txt).',
    };
  }

  if (file.size !== undefined && file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB maximum limit (${formatFileSize(file.size)}).`,
    };
  }

  return { valid: true };
}

/**
 * Computes dashboard aggregate metrics for Document Vault
 */
export function calculateDocumentTotals(documents: DocumentItem[]): DocumentTotals {
  let processedCount = 0;
  let processingCount = 0;
  let failedCount = 0;
  let totalSizeBytes = 0;

  for (const doc of documents) {
    totalSizeBytes += doc.fileSize || 0;

    const status = doc.aiExtractionStatus;
    if (status === 'completed' || doc.aiProcessed) {
      processedCount++;
    } else if (status === 'processing') {
      processingCount++;
    } else if (status === 'failed') {
      failedCount++;
    }
  }

  return {
    totalCount: documents.length,
    processedCount,
    processingCount,
    failedCount,
    totalSizeBytes,
    totalSizeFormatted: formatFileSize(totalSizeBytes),
  };
}

/**
 * Filters and sorts documents
 */
export function filterAndSortDocuments(
  documents: DocumentItem[],
  category: string = 'All',
  searchQuery: string = '',
  sortKey: DocumentSortKey = '-createdAt'
): DocumentItem[] {
  let list = documents;

  // 1. Category Filter
  if (category && category !== 'All') {
    list = list.filter(
      (d) => (d.category || 'General').toLowerCase() === category.toLowerCase()
    );
  }

  // 2. Search Query (across name, provider, type, notes, summary, and identifiers)
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((doc) => {
      const originalName = (doc.originalName || '').toLowerCase();
      const docType = (doc.documentType || '').toLowerCase();
      const cat = (doc.category || '').toLowerCase();
      const notes = (doc.notes || '').toLowerCase();
      const provider = (doc.aiExtracted?.provider || '').toLowerCase();
      const summary = (doc.aiExtracted?.summary || '').toLowerCase();

      const idMatch = (doc.aiExtracted?.identifiers || []).some(
        (id) =>
          (id.label || '').toLowerCase().includes(q) ||
          (id.value || '').toLowerCase().includes(q)
      );

      return (
        originalName.includes(q) ||
        docType.includes(q) ||
        cat.includes(q) ||
        notes.includes(q) ||
        provider.includes(q) ||
        summary.includes(q) ||
        idMatch
      );
    });
  }

  // 3. Sorting
  return [...list].sort((a, b) => {
    switch (sortKey) {
      case 'createdAt':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case '-createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'originalName':
        return (a.originalName || '').localeCompare(b.originalName || '');
      case 'fileSize':
        return (a.fileSize || 0) - (b.fileSize || 0);
      case '-fileSize':
        return (b.fileSize || 0) - (a.fileSize || 0);
      default:
        return 0;
    }
  });
}

/**
 * Returns badge styling and human readable metadata for AI Extraction status
 */
export function getExtractionStatusInfo(
  status?: ExtractionStatus,
  aiProcessed?: boolean
): { label: string; color: string; bg: string; icon: string } {
  if (status === 'processing') {
    return {
      label: 'Analyzing',
      color: '#D97706', // amber-600
      bg: '#FEF3C7',    // amber-100
      icon: 'sync',
    };
  }

  if (status === 'completed' || aiProcessed) {
    return {
      label: 'AI Analyzed',
      color: '#0D9488', // teal-600
      bg: '#CCFBF1',    // teal-100
      icon: 'sparkles',
    };
  }

  if (status === 'failed') {
    return {
      label: 'Analysis Failed',
      color: '#EF4444', // red-500
      bg: '#FEE2E2',    // red-100
      icon: 'alert-circle',
    };
  }

  if (status === 'no_info') {
    return {
      label: 'No Data Detected',
      color: '#6B7280', // gray-500
      bg: '#F3F4F6',    // gray-100
      icon: 'info',
    };
  }

  if (status === 'unsupported') {
    return {
      label: 'Format Unsupported',
      color: '#6B7280',
      bg: '#F3F4F6',
      icon: 'file-text',
    };
  }

  return {
    label: 'Uploaded',
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: 'file',
  };
}

/**
 * Prepares default form values for converting extracted document data into Task, Bill, or Reminder
 */
export function prepareEntityFromExtraction(
  doc: DocumentItem,
  entityType: 'task' | 'bill' | 'reminder'
): CreateEntityFromDocParams {
  const provider = doc.aiExtracted?.provider || '';
  const firstDate = doc.aiExtracted?.importantDates?.[0]?.date;
  const firstAmount = doc.aiExtracted?.amounts?.[0]?.amount;

  let title = '';
  let amount: number | undefined = undefined;

  if (entityType === 'bill') {
    title = provider ? `Pay ${provider}` : `Bill for ${doc.originalName}`;
    amount = firstAmount;
  } else if (entityType === 'task') {
    title = `Review / Action for ${doc.originalName}`;
  } else {
    title = `Reminder: ${doc.originalName}`;
  }

  let formattedDueDate = '';
  if (firstDate) {
    const d = new Date(firstDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      formattedDueDate = `${y}-${m}-${day}`;
    }
  }

  return {
    type: entityType,
    title,
    dueDate: formattedDueDate || undefined,
    amount,
    priority: 'medium',
    description: doc.aiExtracted?.summary
      ? `Summary: ${doc.aiExtracted.summary}`
      : `Extracted from document: ${doc.originalName}`,
  };
}

