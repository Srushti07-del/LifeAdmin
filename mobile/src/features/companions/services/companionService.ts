/**
 * LifeBuddy Companion Persistence Service
 * Stores and hydrates companion states keyed by user ID via SecureStore,
 * and maintains seamless bidirectional synchronization with the backend.
 */

import { secureStorage } from '@/services/secureStore';
import { authService } from '@/features/auth/services/authService';
import { CompanionState } from '../types';
import { INITIAL_COMPANION_STATE } from '../catalog';

const COMPANION_KEY_PREFIX = 'lifeadmin_companion_state_';

type CompanionListener = (state: CompanionState) => void;
const listeners = new Set<CompanionListener>();

export const companionService = {
  /**
   * Retrieves active companion state for a user (or guest session).
   * Checks SecureStore first, falls back to cachedUser.companion, then initial state.
   */
  async getCompanionState(userId: string): Promise<CompanionState> {
    try {
      const key = `${COMPANION_KEY_PREFIX}${userId}`;
      const state = await secureStorage.getCustomData<CompanionState>(key);
      if (state) return state;

      // Check if user has companion from server session
      const cachedUser = await secureStorage.getCachedUser<{
        id?: string;
        companion?: CompanionState;
      }>();
      if (cachedUser && cachedUser.id === userId && cachedUser.companion) {
        await secureStorage.setCustomData(key, cachedUser.companion);
        return cachedUser.companion;
      }

      return INITIAL_COMPANION_STATE;
    } catch {
      return INITIAL_COMPANION_STATE;
    }
  },

  /**
   * Persists active companion state for a user (or guest session)
   * and synchronizes remotely with the shared backend.
   */
  async saveCompanionState(
    userId: string,
    state: CompanionState,
    syncRemote: boolean = true
  ): Promise<void> {
    try {
      const key = `${COMPANION_KEY_PREFIX}${userId}`;
      await secureStorage.setCustomData(key, state);

      // Notify in-app subscribers
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (err) {
          console.warn('[CompanionService] Listener error:', err);
        }
      });

      // Synchronize remotely if user is authenticated and not skipping remote sync
      if (syncRemote) {
        authService.updateCompanion(state).catch((syncErr) => {
          // Graceful fallback: Network failure does not block local state
          console.warn('[CompanionService] Remote sync to backend failed:', syncErr?.message || syncErr);
        });
      }
    } catch (err) {
      console.warn('[CompanionService] Failed to persist companion state:', err);
    }
  },

  /**
   * Subscribes to active companion state changes across the application
   */
  subscribe(listener: CompanionListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

