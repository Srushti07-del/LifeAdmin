/**
 * LifeAdmin Mobile — Document Upload & Binary Handling Helpers
 * Resolves the React Native / Expo Winter-fetch "Unsupported FormDataPart implementation" error.
 *
 * Provides a 3-tier resilient upload pipeline:
 * 1. Native background streaming multipart upload via expo-file-system/legacy uploadAsync.
 * 2. Native React Native XMLHttpRequest multipart upload (uses Android OkHttp / iOS RCTNetworking,
 *    bypassing Expo Winter-fetch convertFormDataAsync completely).
 * 3. Winter-fetch compliant fallback with bytes(): () => Uint8Array.
 *
 * Also guarantees that picked files (content:// URIs, DocumentPicker paths, etc.) are copied
 * to a verified app-owned uploads directory before upload so OkHttp can read them.
 */

import { DocumentItem, UploadDocumentParams } from '../types';

export function getPlatformOS(): string {
  if (typeof process !== 'undefined' && process.versions?.node && typeof navigator === 'undefined') {
    return 'node';
  }
  try {
    const modName = 'react-native';
    // Use dynamic string reference so static bundlers in Node test runners don't attempt to parse Flow syntax
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = typeof require === 'function' ? require(modName) : null;
    return rn?.Platform?.OS || (typeof window !== 'undefined' ? 'web' : 'android');
  } catch {
    return typeof window !== 'undefined' ? 'web' : 'node';
  }
}

/**
 * Checks whether an error is a recognized server business validation / authorization error
 * that should be rethrown directly to inform the user (e.g. 400, 401, 413, file type/size).
 */
export function isServerErrorToRethrow(err: any): boolean {
  if (!err) return false;
  const status = err?.status;
  if (status === 400 || status === 401 || status === 403 || status === 413) {
    return true;
  }
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('please select a file') ||
    msg.includes('invalid file type') ||
    msg.includes('file too large') ||
    msg.includes('exceeds') ||
    msg.includes('access denied') ||
    msg.includes('unauthorized') ||
    msg.includes('401')
  );
}

/**
 * Pure JavaScript base64 to Uint8Array decoder
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  const clean = base64.replace(/[\r\n\t =]/g, '');
  const len = clean.length;
  const byteLength = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const b0 = lookup[clean.charCodeAt(i)] ?? 0;
    const b1 = lookup[clean.charCodeAt(i + 1)] ?? 0;
    const b2 = lookup[clean.charCodeAt(i + 2)] ?? 0;
    const b3 = lookup[clean.charCodeAt(i + 3)] ?? 0;
    bytes[p++] = (b0 << 2) | (b1 >> 4);
    if (i + 2 < len) bytes[p++] = ((b1 & 15) << 4) | (b2 >> 2);
    if (i + 3 < len) bytes[p++] = ((b2 & 3) << 6) | b3;
  }
  return bytes.subarray(0, p);
}

/**
 * Pure JavaScript Uint8Array to base64 encoder
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const maybeBuffer = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
  if (maybeBuffer && typeof maybeBuffer.from === 'function') {
    return maybeBuffer.from(bytes).toString('base64');
  }
  if (typeof btoa === 'function') {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return result;
}

/**
 * Reads local file content into a Uint8Array across all environments
 */
export async function readFileAsUint8Array(uri: string): Promise<Uint8Array> {
  // Strategy 0: Data URI directly decoded from base64
  if (uri.startsWith('data:')) {
    const commaIdx = uri.indexOf(',');
    const base64 = commaIdx >= 0 ? uri.slice(commaIdx + 1) : uri;
    return base64ToUint8Array(base64);
  }

  // Strategy 1: Legacy expo-file-system readAsStringAsync (supports content:// and file:// on Android)
  try {
    const legacyFs: any = await import('expo-file-system/legacy').catch(() => import('expo-file-system'));
    const readAsStringAsync = legacyFs?.readAsStringAsync || legacyFs?.default?.readAsStringAsync;
    if (typeof readAsStringAsync === 'function') {
      const base64 = await readAsStringAsync(uri, {
        encoding: legacyFs?.EncodingType?.Base64 || legacyFs?.default?.EncodingType?.Base64 || 'base64',
      });
      if (base64) {
        return base64ToUint8Array(base64);
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Modern expo-file-system File (native JSI)
  try {
    const fsMod: any = await import('expo-file-system');
    if (fsMod && fsMod.File) {
      const file = new fsMod.File(uri);
      if (typeof file.bytes === 'function') {
        const b = await file.bytes();
        if (b) return b;
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Standard fetch(uri).arrayBuffer() (works for web Blobs, blob URLs, file URLs in some webviews)
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    throw new Error(
      `Failed to read file data from ${uri}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Creates a Winter-fetch and Expo FormData compliant file part.
 * Returns an instance of Blob/File compatible with Expo Winter-fetch convertFormDataAsync,
 * while preserving bytes() method for test compatibility.
 */
export async function createUploadFilePart(file: {
  uri: string;
  name: string;
  mimeType: string;
}): Promise<any> {
  const safeName = file.name || 'document';
  const mimeType = file.mimeType || 'application/octet-stream';

  // Strategy 1: Modern expo-file-system File (extends native Blob, accepted by expo/fetch)
  try {
    const fsMod: any = await import('expo-file-system');
    if (fsMod && fsMod.File) {
      const expoFile = new fsMod.File(file.uri);
      if (typeof expoFile.bytes === 'function' || typeof expoFile.arrayBuffer === 'function') {
        return expoFile;
      }
    }
  } catch {}

  // Strategy 2: Read bytes into Uint8Array
  let bytes: Uint8Array | null = null;
  try {
    bytes = await readFileAsUint8Array(file.uri);
  } catch (err) {
    console.warn('readFileAsUint8Array failed:', err);
  }

  // Strategy 3: Standard web/WinterCG Blob constructor from bytes
  if (typeof Blob !== 'undefined' && bytes) {
    try {
      const blob: any = new Blob([bytes as any], { type: mimeType });
      blob.name = safeName;
      if (typeof blob.bytes !== 'function') {
        blob.bytes = async () => bytes;
      }
      return blob;
    } catch (blobErr) {
      console.warn('new Blob failed:', blobErr);
    }
  }

  // Strategy 4: Web fetch(uri).blob()
  try {
    const res = await fetch(file.uri);
    const blob: any = await res.blob();
    if (blob) {
      blob.name = safeName;
      if (typeof blob.bytes !== 'function' && bytes) {
        blob.bytes = async () => bytes;
      }
      return blob;
    }
  } catch {}

  // Strategy 5: Fallback object with bytes and RN descriptors
  return {
    uri: file.uri,
    name: safeName,
    type: mimeType,
    bytes: bytes ? () => bytes : undefined,
  };
}

/**
 * Ensures a picked file (content:// URI or temporary DocumentPicker path) is accessible
 * by copying or writing it into the application's scoped cache directory before upload.
 * Returns the accessible local file URI and an optional cleanup callback.
 */
export async function prepareAccessibleUploadFile(file: {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}): Promise<{ localUri: string; cleanup?: () => Promise<void> }> {
  const os = getPlatformOS();
  if (os === 'web' || os === 'node') {
    return { localUri: file.uri };
  }

  try {
    const legacyFs: any = await import('expo-file-system/legacy').catch(() => import('expo-file-system'));
    const FileSystem = legacyFs?.default || legacyFs;
    if (!FileSystem) {
      return { localUri: file.uri };
    }

    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!cacheDir) {
      return { localUri: file.uri };
    }

    const uploadsDir = `${cacheDir}uploads/`;
    await FileSystem.makeDirectoryAsync(uploadsDir, { intermediates: true }).catch(() => {});

    // Only reuse existing path if it was already created inside our designated uploadsDir
    if (file.uri.startsWith(uploadsDir)) {
      return { localUri: file.uri };
    }

    const safeName = (file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const destinationUri = `${uploadsDir}${Date.now()}_${safeName}`;

    // Step 1: Attempt native copyAsync (handles content:// and file://)
    let copied = false;
    try {
      await FileSystem.copyAsync({
        from: file.uri,
        to: destinationUri,
      });
      copied = true;
    } catch (copyErr) {
      console.warn('FileSystem.copyAsync failed, trying fallback write:', copyErr);
    }

    // Step 2: Fallback write into scoped uploadsDir if copyAsync failed
    if (!copied) {
      try {
        const encoding = FileSystem.EncodingType?.Base64 || 'base64';
        let base64Data: string | null = null;

        if (typeof FileSystem.readAsStringAsync === 'function') {
          base64Data = await FileSystem.readAsStringAsync(file.uri, { encoding }).catch(() => null);
        }

        if (!base64Data) {
          const bytes = await readFileAsUint8Array(file.uri);
          base64Data = uint8ArrayToBase64(bytes);
        }

        if (base64Data && typeof FileSystem.writeAsStringAsync === 'function') {
          await FileSystem.writeAsStringAsync(destinationUri, base64Data, { encoding });
          copied = true;
        }
      } catch (writeErr) {
        console.warn('Fallback write to scoped directory failed:', writeErr);
      }
    }

    if (copied) {
      return {
        localUri: destinationUri,
        cleanup: async () => {
          try {
            await FileSystem.deleteAsync(destinationUri, { idempotent: true });
          } catch {
            // Ignore cleanup errors
          }
        },
      };
    }

    return { localUri: file.uri };
  } catch {
    // If copying fails, return original URI so downstream strategies can still attempt to process
    return { localUri: file.uri };
  }
}

/**
 * Strategy 1: Attempts native background streaming upload via expo-file-system/legacy uploadAsync.
 * Returns null if uploadAsync is unavailable or throws a transport error.
 */
export async function tryNativeUploadAsync(
  params: UploadDocumentParams,
  localUri: string
): Promise<DocumentItem | null> {
  const os = getPlatformOS();
  if (os === 'web' || os === 'node') {
    return null;
  }

  try {
    const legacyFs: any = await import('expo-file-system/legacy').catch(() => import('expo-file-system'));
    const FileSystem = legacyFs?.default || legacyFs;

    if (!FileSystem || typeof FileSystem.uploadAsync !== 'function') {
      return null;
    }

    const { default: apiConfig } = await import('../../../services/config');
    const { Endpoints } = await import('../../../services/endpoints');
    const baseUrl = apiConfig.getBaseUrl();
    const token = apiConfig.getAuthToken();
    const uploadUrl = `${baseUrl}${Endpoints.documents.upload}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const parameters: Record<string, string> = {};
    if (params.category) parameters.category = params.category;
    if (params.documentType) parameters.documentType = params.documentType;
    if (params.notes) parameters.notes = params.notes;
    if (params.expiryDate) parameters.expiryDate = params.expiryDate;

    const uploadType =
      FileSystem.FileSystemUploadType?.MULTIPART ??
      FileSystem.UploadType?.MULTIPART ??
      1;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      uploadType,
      fieldName: 'file',
      mimeType: params.file.mimeType || 'application/octet-stream',
      parameters,
      headers,
    });

    if (result.status === 401) {
      apiConfig.notifyUnauthorized();
    }

    if (result.status >= 200 && result.status < 300) {
      const data = JSON.parse(result.body);
      return data.document;
    } else {
      let errorMsg = 'Failed to upload document';
      try {
        const errorData = JSON.parse(result.body);
        errorMsg = errorData.message || errorMsg;
      } catch {}
      const err: any = new Error(errorMsg);
      err.status = result.status;
      throw err;
    }
  } catch (err: any) {
    if (isServerErrorToRethrow(err)) {
      throw err;
    }
    console.warn('Native uploadAsync failed, falling back:', err?.message);
    return null;
  }
}

/**
 * Strategy 2: Native React Native XMLHttpRequest multipart upload.
 * Operates directly on React Native's native NetworkingModule / OkHttp stack on Android,
 * completely bypassing Expo Winter-fetch convertFormDataAsync.
 */
export async function uploadViaXhrAsync(
  params: UploadDocumentParams,
  localUri: string
): Promise<DocumentItem> {
  const os = getPlatformOS();
  if (os === 'node') {
    throw new Error('XMLHttpRequest upload not supported in Node environment.');
  }

  const { default: apiConfig } = await import('../../../services/config');
  const { Endpoints } = await import('../../../services/endpoints');
  const baseUrl = apiConfig.getBaseUrl();
  const token = apiConfig.getAuthToken();
  const uploadUrl = `${baseUrl}${Endpoints.documents.upload}`;

  return new Promise<DocumentItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.timeout = 60000;

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('Accept', 'application/json');

    const formData = new FormData();

    // Standard React Native file descriptor for native OkHttp / NetworkingModule
    const filePart: any = {
      uri: localUri,
      name: params.file.name || 'document',
      type: params.file.mimeType || 'application/octet-stream',
    };

    formData.append('file', filePart);

    if (params.category) formData.append('category', params.category);
    if (params.documentType) formData.append('documentType', params.documentType);
    if (params.notes) formData.append('notes', params.notes);
    if (params.expiryDate) formData.append('expiryDate', params.expiryDate);

    xhr.onload = () => {
      if (xhr.status === 401) {
        apiConfig.notifyUnauthorized();
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.document);
        } catch {
          reject(new Error('Server returned an invalid response.'));
        }
      } else {
        let errorMsg = 'Failed to upload document';
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMsg = errorData.message || errorMsg;
        } catch {
          if (xhr.statusText) {
            errorMsg = `Upload failed with status ${xhr.status}: ${xhr.statusText}`;
          }
        }
        const err: any = new Error(errorMsg);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed. Please verify your connection to the server.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out after 60 seconds.'));
    };

    xhr.send(formData);
  });
}

/**
 * Strategy 3: Standard fetch with Winter-fetch compatible Uint8Array file part.
 */
export async function uploadViaFetchAsync(
  params: UploadDocumentParams,
  localUri: string
): Promise<DocumentItem> {
  const { default: apiClient } = await import('../../../services/apiClient');
  const { Endpoints } = await import('../../../services/endpoints');

  const formData = new FormData();
  const filePart = await createUploadFilePart({
    uri: localUri,
    name: params.file.name || 'document',
    mimeType: params.file.mimeType || 'application/octet-stream',
  });

  if (
    (typeof Blob !== 'undefined' && filePart instanceof Blob) ||
    (typeof filePart === 'object' && filePart !== null && (typeof (filePart as any).arrayBuffer === 'function' || typeof (filePart as any).bytes === 'function'))
  ) {
    formData.append('file', filePart, params.file.name || 'document');
  } else {
    formData.append('file', filePart);
  }

  if (params.category) formData.append('category', params.category);
  if (params.documentType) formData.append('documentType', params.documentType);
  if (params.notes) formData.append('notes', params.notes);
  if (params.expiryDate) formData.append('expiryDate', params.expiryDate);

  const res = await apiClient.upload<{ message: string; document: DocumentItem }>(
    Endpoints.documents.upload,
    formData
  );

  return res.document;
}
