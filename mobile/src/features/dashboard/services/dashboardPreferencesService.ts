/**
 * LifeAdmin Mobile — Dashboard Layout Preferences Persistence Service
 * Stores widget order and visibility locally per user/guest via encrypted SecureStore
 * (mirroring client localStorage behavior without mutating backend schemas).
 */

import { secureStorage } from '@/services/secureStore';
import { PersistedWidgetItem, WidgetConfig } from '../types';
import {
  DEFAULT_WIDGETS,
  getDashboardStorageKey,
  sanitizeWidgetConfigs,
  serializeWidgetConfigs,
} from './dashboardLayout';

export const dashboardPreferencesService = {
  /**
   * Loads saved widget layout for the current authenticated user or guest session.
   */
  async loadWidgets(
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<WidgetConfig[]> {
    try {
      const key = getDashboardStorageKey(userId, isGuest);
      const saved = await secureStorage.getCustomData<PersistedWidgetItem[]>(key);
      if (!saved) {
        return DEFAULT_WIDGETS.map((w) => ({ ...w }));
      }
      return sanitizeWidgetConfigs(saved);
    } catch (err) {
      console.warn('[DashboardPreferences] Failed to load saved widgets:', err);
      return DEFAULT_WIDGETS.map((w) => ({ ...w }));
    }
  },

  /**
   * Persists widget layout locally for the current authenticated user or guest session.
   */
  async saveWidgets(
    widgets: WidgetConfig[],
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<void> {
    try {
      const key = getDashboardStorageKey(userId, isGuest);
      const compact = serializeWidgetConfigs(widgets);
      await secureStorage.setCustomData(key, compact);
    } catch (err) {
      console.warn('[DashboardPreferences] Failed to save widget layout:', err);
    }
  },

  /**
   * Resets layout to defaults and persists it for the active user/guest.
   */
  async resetWidgets(
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<WidgetConfig[]> {
    const defaults = DEFAULT_WIDGETS.map((w) => ({ ...w }));
    await this.saveWidgets(defaults, userId, isGuest);
    return defaults;
  },
};

export default dashboardPreferencesService;

