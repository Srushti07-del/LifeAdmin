/**
 * LifeAdmin Mobile — Documents Feature Types & Contracts
 */

export interface ExtractedDate {
  label: string;
  date: string;
}

export interface ExtractedAmount {
  label: string;
  amount: number;
  currency?: string;
}

export interface ExtractedIdentifier {
  label: string;
  value: string;
}

export interface AiExtractedData {
  provider?: string;
  expiryDate?: string;
  renewalDate?: string;
  importantDates?: ExtractedDate[];
  amounts?: ExtractedAmount[];
  identifiers?: ExtractedIdentifier[];
  summary?: string;
  rawExtraction?: string;
}

export type ExtractionStatus =
  | 'processing'
  | 'completed'
  | 'no_info'
  | 'unsupported'
  | 'failed';

export interface DocumentItem {
  _id: string;
  userId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  documentType?: string;
  category: string;
  tags?: string[];
  notes?: string;
  aiExtracted?: AiExtractedData;
  aiProcessed: boolean;
  aiConfirmed: boolean;
  aiExtractionStatus?: ExtractionStatus;
  aiExtractionError?: string;
  linkedTasks?: string[];
  linkedBills?: string[];
  linkedReminders?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type DocumentCategory =
  | 'All'
  | 'General'
  | 'Utilities'
  | 'Housing'
  | 'Medical'
  | 'Education'
  | 'Financial'
  | 'Legal';

export type DocumentSortKey =
  | '-createdAt'
  | 'createdAt'
  | 'originalName'
  | '-fileSize'
  | 'fileSize';

export interface DocumentTotals {
  totalCount: number;
  processedCount: number;
  processingCount: number;
  failedCount: number;
  totalSizeFormatted: string;
  totalSizeBytes: number;
}

export interface CreateEntityFromDocParams {
  type: 'task' | 'bill' | 'reminder';
  title: string;
  dueDate?: string;
  amount?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
}

export interface UploadDocumentParams {
  file: {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  };
  category?: string;
  documentType?: string;
  notes?: string;
  expiryDate?: string;
}

export interface EditDocumentParams {
  category?: string;
  documentType?: string;
  notes?: string;
  tags?: string[];
}

