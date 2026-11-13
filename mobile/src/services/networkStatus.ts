/**
 * LifeAdmin Mobile — Network Status & Sync Coordination Service
 * Tracks live connectivity state from network responses and coordinates
 * safe background synchronizations without overlapping requests.
 */

import { formatSyncTime } from './offlineCache';

export interface NetworkState {
  isOnline: boolean;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

export type NetworkStateListener = (state: NetworkState) => void;
export type SyncTask = () => Promise<void>;

class NetworkStatusService {
  private isOnline = true;
  private lastSyncTime: number | null = null;
  private isSyncing = false;
  private listeners: NetworkStateListener[] = [];
  private syncTasks = new Map<string, SyncTask>();
  private hasNotifiedOfflineToast = false;
  private isApiClientAttached = false;

  constructor() {
    this.attachApiClientListeners();
  }

  public attachApiClientListeners(): void {
    if (this.isApiClientAttached) return;
    try {
      if (typeof process !== 'undefined' && process.versions?.node && typeof navigator === 'undefined') {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { apiClient } = require('./apiClient');
      if (apiClient) {
        apiClient.onNetworkSuccess(() => {
          this.handleNetworkSuccess();
        });

        apiClient.onNetworkFailure((err: any) => {
          if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT' || err.status === 0) {
            this.handleNetworkFailure();
          }
        });
        this.isApiClientAttached = true;
      }
    } catch {
      // In testing / non-bundled environments
    }
  }

  public getState(): NetworkState {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
  }

  public subscribe(listener: NetworkStateListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (err) {
        console.warn('Error in NetworkStateListener:', err);
      }
    });
  }

  public handleNetworkSuccess(): void {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    this.lastSyncTime = Date.now();
    this.hasNotifiedOfflineToast = false;
    this.notify();

    // Trigger background sync when transitioning from offline -> online
    if (wasOffline) {
      void this.executeSyncAll();
    }
  }

  public handleNetworkFailure(): void {
    if (this.isOnline) {
      this.isOnline = false;
      this.notify();
    }
  }

  public setOnlineManually(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      if (online) {
        this.lastSyncTime = Date.now();
        this.hasNotifiedOfflineToast = false;
        void this.executeSyncAll();
      }
      this.notify();
    }
  }

  public setOnline(online: boolean): void {
    this.setOnlineManually(online);
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  public setLastSyncTime(timestamp: number): void {
    this.lastSyncTime = timestamp;
    this.notify();
  }

  /**
   * Prevents repeated spam of identical offline snackbars during one session.
   */
  public shouldShowOfflineAlert(): boolean {
    if (this.hasNotifiedOfflineToast) return false;
    this.hasNotifiedOfflineToast = true;
    return true;
  }

  /**
   * Registers a screen's background refresh task to be safely re-triggered upon reconnection.
   */
  public registerSyncTask(id: string, task: SyncTask): () => void {
    this.syncTasks.set(id, task);
    return () => {
      this.syncTasks.delete(id);
    };
  }

  /**
   * Executes all registered background sync tasks with mutual exclusion (lock).
   */
  public async executeSyncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      const tasks = Array.from(this.syncTasks.values());
      await Promise.allSettled(tasks.map((task) => task()));
      this.lastSyncTime = Date.now();
    } catch (err) {
      console.warn('[NetworkStatus] Error during background synchronization:', err);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public formatLastSync(now: number = Date.now()): string {
    return formatSyncTime(this.lastSyncTime, now);
  }
}

export const networkStatus = new NetworkStatusService();
export default networkStatus;
