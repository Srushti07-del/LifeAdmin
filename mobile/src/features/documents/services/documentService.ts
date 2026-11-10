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
   * Uploads a document via multipart/form-data
   */
  public async uploadDocument(params: UploadDocumentParams): Promise<DocumentItem> {
    const formData = new FormData();

    // In React Native / Expo, file objects in FormData take the shape:
    // { uri: string, name: string, type: string }
    const filePayload = {
      uri: params.file.uri,
      name: params.file.name || 'document',
      type: params.file.mimeType || 'application/octet-stream',
    } as any;

    formData.append('file', filePayload);

    if (params.category) {
      formData.append('category', params.category);
    }
    if (params.documentType) {
      formData.append('documentType', params.documentType);
    }
    if (params.notes) {
      formData.append('notes', params.notes);
    }
    if (params.expiryDate) {
      formData.append('expiryDate', params.expiryDate);
    }

    const res = await apiClient.upload<{ message: string; document: DocumentItem }>(
      Endpoints.documents.upload,
      formData
    );

    return res.document;
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

