/**
 * LifeAdmin Mobile — Document Vault Service
 * Fully integrated with backend Express routes in /server/src/routes/documents.ts
 */

import apiClient from '@/services/apiClient';
import apiConfig from '@/services/config';
import { Endpoints } from '@/services/endpoints';
import {
  DocumentItem,
  UploadDocumentParams,
  EditDocumentParams,
  CreateEntityFromDocParams,
} from '../types';
import {
  prepareAccessibleUploadFile,
  tryNativeUploadAsync,
  uploadViaFetchAsync,
  uploadViaXhrAsync,
  isServerErrorToRethrow,
} from './uploadHelpers';

export interface FetchDocumentsParams {
  category?: string;
  documentType?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface FetchDocumentsResponse {
  documents: DocumentItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

class DocumentService {
  /**
   * Fetches paginated and filtered list of user documents
   */
  public async fetchDocuments(params: FetchDocumentsParams = {}): Promise<FetchDocumentsResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params.category && params.category !== 'All') {
      queryParams.category = params.category;
    }
    if (params.documentType) {
      queryParams.documentType = params.documentType;
    }
    if (params.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }
    if (params.sort) {
      queryParams.sort = params.sort;
    }
    if (params.page !== undefined) {
      queryParams.page = params.page;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }

    return apiClient.get<FetchDocumentsResponse>(Endpoints.documents.list, {
      params: queryParams,
    });
  }

  /**
   * Fetches full details for a single document
   */
  public async getDocumentById(id: string): Promise<DocumentItem> {
    const res = await apiClient.get<{ document: DocumentItem }>(Endpoints.documents.getById(id));
    return res.document;
  }

  /**
   * Uploads a document via multipart/form-data.
   * Employs a resilient 3-tier pipeline:
   * 1. Native background streaming via expo-file-system uploadAsync (OkHttp direct, no JS heap memory spike).
   * 2. Standards-compliant Blob multipart fetch (Expo Winter-fetch / Web compliant).
   * 3. Native React Native XMLHttpRequest multipart upload fallback.
   * Completely eliminates "Unsupported FormDataPart implementation" and "Location isn't readable" errors.
   */
  public async uploadDocument(params: UploadDocumentParams): Promise<DocumentItem> {
    const { localUri, cleanup } = await prepareAccessibleUploadFile(params.file);

    try {
      // Tier 1: Native background streaming uploadAsync (bypasses JS FormData completely)
      try {
        const nativeDoc = await tryNativeUploadAsync(params, localUri);
        if (nativeDoc) {
          return nativeDoc;
        }
      } catch (nativeErr: any) {
        if (isServerErrorToRethrow(nativeErr)) {
          throw nativeErr;
        }
        console.warn('Native uploadAsync failed, falling back to multipart fetch:', nativeErr?.message);
      }

      // Tier 2: Standards-compliant Blob multipart upload (handles Expo Winter-fetch & Web)
      try {
        const fetchDoc = await uploadViaFetchAsync(params, localUri);
        if (fetchDoc) {
          return fetchDoc;
        }
      } catch (fetchErr: any) {
        if (isServerErrorToRethrow(fetchErr)) {
          throw fetchErr;
        }
        console.warn('Multipart fetch upload failed, falling back to native XHR:', fetchErr?.message);
      }

      // Tier 3: Native React Native XMLHttpRequest multipart upload (uses Android OkHttp / iOS RCTNetworking)
      return await uploadViaXhrAsync(params, localUri);
    } finally {
      if (cleanup) {
        await cleanup();
      }
    }
  }

  /**
   * Updates metadata for an existing document (category, documentType, notes, tags)
   */
  public async updateDocument(id: string, updates: EditDocumentParams): Promise<DocumentItem> {
    const res = await apiClient.put<{ message: string; document: DocumentItem }>(
      Endpoints.documents.update(id),
      updates
    );
    return res.document;
  }

  /**
   * Re-triggers AI content extraction on a failed or stuck document
   */
  public async reExtractDocument(id: string): Promise<DocumentItem> {
    const res = await apiClient.post<{ message: string; document: DocumentItem }>(
      Endpoints.documents.reExtract(id)
    );
    return res.document;
  }

  /**
   * Converts extracted information into a Task, Bill, or Reminder
   */
  public async createEntityFromDocument(
    id: string,
    params: CreateEntityFromDocParams
  ): Promise<{ message: string; entity: any; document: DocumentItem }> {
    return apiClient.post<{ message: string; entity: any; document: DocumentItem }>(
      Endpoints.documents.createEntities(id),
      params
    );
  }

  /**
   * Deletes a document by ID
   */
  public async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(Endpoints.documents.delete(id));
  }

  /**
   * Generates authenticated download / inline preview URL
   */
  public getAuthenticatedDownloadUrl(id: string, download: boolean = false): string {
    const baseUrl = apiConfig.getBaseUrl();
    const token = apiConfig.getAuthToken();
    const endpoint = Endpoints.documents.downloadUrl(id);
    const downloadQuery = download ? '&download=true' : '';

    if (token) {
      return `${baseUrl}${endpoint}?token=${encodeURIComponent(token)}${downloadQuery}`;
    }
    return `${baseUrl}${endpoint}${download ? '?download=true' : ''}`;
  }
}

export const documentService = new DocumentService();
export default documentService;

