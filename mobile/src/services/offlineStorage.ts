/**
 * LifeAdmin Mobile — Persistent Offline Storage Driver
 * Provides reliable, sandboxed key-value persistence.
 *
 * Driver Selection:
 * - Native (iOS / Android): expo-file-system writing to documentDirectory/lifeadmin_cache.
 *   This ensures multi-megabyte record collections can be saved without hitting
 *   Android SharedPreferences/Keystore size limits (which throw SizeLimitExceededException).
 * - Web: window.localStorage with prefix lifeadmin_cache:.
 * - Memory / Node / Unit Tests: In-memory fallback map.
 */

export interface IStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clearAll(): Promise<void>;
}

class MemoryStorageDriver implements IStorageDriver {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async clearAll(): Promise<void> {
    this.store.clear();
  }
}

class WebStorageDriver implements IStorageDriver {
  private prefix = 'lifeadmin_cache:';

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(this.prefix + key);
      }
      return null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.prefix + key, value);
      }
    } catch (e) {
      console.warn('[OfflineStorage] LocalStorage setItem failed:', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.prefix + key);
      }
    } catch {}
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            keys.push(k.slice(this.prefix.length));
          }
        }
        return keys;
      }
      return [];
    } catch {
      return [];
    }
  }

  async clearAll(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      for (const k of keys) {
        await this.removeItem(k);
      }
    } catch {}
  }
}

interface ExpoFileSystemModule {
  documentDirectory?: string | null;
  getInfoAsync(fileUri: string, options?: any): Promise<{ exists: boolean; isDirectory?: boolean; size?: number }>;
  makeDirectoryAsync(fileUri: string, options?: { intermediates?: boolean }): Promise<void>;
  readAsStringAsync(fileUri: string, options?: any): Promise<string>;
  writeAsStringAsync(fileUri: string, contents: string, options?: any): Promise<void>;
  deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  readDirectoryAsync(fileUri: string): Promise<string[]>;
}

class NativeFileStorageDriver implements IStorageDriver {
  private memoryFallback = new MemoryStorageDriver();
  private dirPath: string | null = null;
  private isInitialized = false;

  private sanitizeFilename(key: string): string {
    return encodeURIComponent(key).replace(/%/g, '_') + '.json';
  }

  private desanitizeFilename(filename: string): string {
    if (!filename.endsWith('.json')) return filename;
    return decodeURIComponent(filename.slice(0, -5).replace(/_/g, '%'));
  }

  private async getFileSystem(): Promise<ExpoFileSystemModule | null> {
    try {
      const fsMod: any = await import('expo-file-system/legacy').catch(() => import('expo-file-system'));
      return fsMod?.default || fsMod || null;
    } catch {
      return null;
    }
  }

  private async ensureDir(): Promise<string | null> {
    if (this.dirPath) return this.dirPath;

    const FileSystem = await this.getFileSystem();
    if (!FileSystem || !FileSystem.documentDirectory) {
      return null;
    }

    const cacheDir = `${FileSystem.documentDirectory}lifeadmin_cache/`;
    try {
      const info = await FileSystem.getInfoAsync(cacheDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }
      this.dirPath = cacheDir;
      this.isInitialized = true;
      return cacheDir;
    } catch (err) {
      console.warn('[OfflineStorage] Failed to initialize cache directory:', err);
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const dir = await this.ensureDir();
    if (!dir) {
      return this.memoryFallback.getItem(key);
    }

    const FileSystem = await this.getFileSystem();
    if (!FileSystem) return this.memoryFallback.getItem(key);

    const filePath = `${dir}${this.sanitizeFilename(key)}`;
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) {
        return null;
      }
      return await FileSystem.readAsStringAsync(filePath);
    } catch (err) {
      console.warn(`[OfflineStorage] Failed to read ${key}:`, err);
      return this.memoryFallback.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const dir = await this.ensureDir();
    if (!dir) {
      await this.memoryFallback.setItem(key, value);
      return;
    }

    const FileSystem = await this.getFileSystem();
    if (!FileSystem) {
      await this.memoryFallback.setItem(key, value);
      return;
    }

    const filePath = `${dir}${this.sanitizeFilename(key)}`;
    try {
      await FileSystem.writeAsStringAsync(filePath, value);
    } catch (err) {
      console.warn(`[OfflineStorage] Failed to write ${key}:`, err);
      await this.memoryFallback.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.memoryFallback.removeItem(key);

    const dir = await this.ensureDir();
    if (!dir) return;

    const FileSystem = await this.getFileSystem();
    if (!FileSystem) return;

    const filePath = `${dir}${this.sanitizeFilename(key)}`;
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (err) {
      console.warn(`[OfflineStorage] Failed to delete ${key}:`, err);
    }
  }

  async getAllKeys(): Promise<string[]> {
    const dir = await this.ensureDir();
    if (!dir) {
      return this.memoryFallback.getAllKeys();
    }

    const FileSystem = await this.getFileSystem();
    if (!FileSystem) return this.memoryFallback.getAllKeys();

    try {
      const files = await FileSystem.readDirectoryAsync(dir);
      return files.filter((f) => f.endsWith('.json')).map((f) => this.desanitizeFilename(f));
    } catch {
      return this.memoryFallback.getAllKeys();
    }
  }

  async clearAll(): Promise<void> {
    await this.memoryFallback.clearAll();

    const dir = await this.ensureDir();
    if (!dir) return;

    const FileSystem = await this.getFileSystem();
    if (!FileSystem) return;

    try {
      const files = await FileSystem.readDirectoryAsync(dir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          await FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true });
        }
      }
    } catch (err) {
      console.warn('[OfflineStorage] clearAll failed:', err);
    }
  }
}

function getPlatformOS(): string {
  if (typeof process !== 'undefined' && process.versions?.node && typeof navigator === 'undefined') {
    return 'node';
  }
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return 'web';
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    return rn?.Platform?.OS || 'node';
  } catch {
    return typeof window !== 'undefined' ? 'web' : 'node';
  }
}

function createDefaultDriver(): IStorageDriver {
  const os = getPlatformOS();
  if (os === 'web') {
    return new WebStorageDriver();
  }
  // Native (Android / iOS)
  if (os === 'android' || os === 'ios' || os === 'native') {
    return new NativeFileStorageDriver();
  }
  // Fallback (test/Node/SSR)
  return new MemoryStorageDriver();
}

export const offlineStorageDriver: IStorageDriver = createDefaultDriver();
export { MemoryStorageDriver, WebStorageDriver, NativeFileStorageDriver };
export default offlineStorageDriver;
