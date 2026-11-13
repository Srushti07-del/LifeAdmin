/**
 * LifeAdmin Mobile — Network Context & Provider
 * Manages live connectivity state, background synchronization on reconnection,
 * and de-duplicated user-facing offline alerts.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { AppState, Platform } from 'react-native';
import { networkStatus, NetworkState } from '@/services/networkStatus';
import { useSnackbar } from '@/context/SnackbarContext';

export interface NetworkContextType extends NetworkState {
  formattedLastSync: string;
  syncNow: () => Promise<void>;
  registerSyncTask: (id: string, task: () => Promise<void>) => () => void;
  notifyActionRequiresNetwork: (actionName?: string) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { showSnackbar } = useSnackbar();
  const [networkState, setNetworkState] = useState<NetworkState>(() => networkStatus.getState());

  useEffect(() => {
    let previousOnline = networkState.isOnline;

    const unsubscribe = networkStatus.subscribe((state) => {
      setNetworkState(state);

      // Handle offline transition
      if (previousOnline && !state.isOnline) {
        if (networkStatus.shouldShowOfflineAlert()) {
          showSnackbar({
            variant: 'info',
            title: 'Working Offline',
            message: 'Viewing cached records. Changes that require connection are paused.',
            duration: 3500,
          });
        }
      }

      // Handle reconnection transition
      if (!previousOnline && state.isOnline) {
        showSnackbar({
          variant: 'success',
          title: 'Back Online',
          message: 'Connection restored. Data synchronized with server.',
          duration: 2500,
        });
      }

      previousOnline = state.isOnline;
    });

    return unsubscribe;
  }, [showSnackbar]);

  // Web event listeners
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => networkStatus.setOnlineManually(true);
      const handleOffline = () => networkStatus.setOnlineManually(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // AppState change listener: re-check sync when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && networkState.isOnline) {
        void networkStatus.executeSyncAll();
      }
    });

    return () => subscription.remove();
  }, [networkState.isOnline]);

  const syncNow = useCallback(async () => {
    await networkStatus.executeSyncAll();
  }, []);

  const registerSyncTask = useCallback((id: string, task: () => Promise<void>) => {
    return networkStatus.registerSyncTask(id, task);
  }, []);

  const notifyActionRequiresNetwork = useCallback(
    (actionName?: string) => {
      const label = actionName ? `to ${actionName}` : 'to perform this action';
      showSnackbar({
        variant: 'info',
        title: 'Network Required',
        message: `An active internet connection is required ${label}. Please reconnect and try again.`,
        duration: 3200,
      });
    },
    [showSnackbar]
  );

  const formattedLastSync = useMemo(() => {
    return networkStatus.formatLastSync();
  }, [networkState.lastSyncTime]);

  const contextValue = useMemo<NetworkContextType>(
    () => ({
      ...networkState,
      formattedLastSync,
      syncNow,
      registerSyncTask,
      notifyActionRequiresNetwork,
    }),
    [networkState, formattedLastSync, syncNow, registerSyncTask, notifyActionRequiresNetwork]
  );

  return <NetworkContext.Provider value={contextValue}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    // Graceful fallback for components or tests running outside provider
    const state = networkStatus.getState();
    return {
      ...state,
      formattedLastSync: networkStatus.formatLastSync(),
      syncNow: async () => {},
      registerSyncTask: () => () => {},
      notifyActionRequiresNetwork: () => {},
    };
  }
  return context;
}

export default useNetwork;

