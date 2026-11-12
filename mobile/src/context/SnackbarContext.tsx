/**
 * LifeAdmin Mobile — Global Snackbar Context & Host Coordinator
 * Provides non-blocking, queued toast/snackbar feedback across screens and native modals
 * with auto-dismissal, deduplication, and safe async action handling (e.g., Undo).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INITIAL_SNACKBAR_QUEUE_STATE,
  SnackbarItem,
  SnackbarOptions,
  SnackbarQueueState,
  createSnackbarItem,
  dismissSnackbarById,
  enqueueSnackbar,
} from './snackbarQueue';

export interface SnackbarContextValue {
  showSnackbar: (options: SnackbarOptions) => string;
  hideSnackbar: (id?: string) => void;
  clearSnackbars: () => void;
}

interface SnackbarInternalContextValue extends SnackbarContextValue {
  current: SnackbarItem | null;
  dismissingId: string | null;
  completeDismiss: (id?: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  registerModalHost: (hostId: symbol) => () => void;
  activeModalHostId: symbol | null;
}

const SnackbarContext = createContext<SnackbarInternalContextValue | undefined>(undefined);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [queueState, setQueueState] = useState<SnackbarQueueState>(
    INITIAL_SNACKBAR_QUEUE_STATE
  );
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [modalHostStack, setModalHostStack] = useState<symbol[]>([]);
  const [pausedId, setPausedId] = useState<string | null>(null);

  const seqRef = useRef(0);
  const currentRef = useRef<SnackbarItem | null>(null);
  const dismissingIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  currentRef.current = queueState.current;
  dismissingIdRef.current = dismissingId;

  const clearActiveTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackDismissRef.current) {
      clearTimeout(fallbackDismissRef.current);
      fallbackDismissRef.current = null;
    }
  }, []);

  const completeDismiss = useCallback(
    (targetId?: string) => {
      clearFallbackTimer();
      setDismissingId((prev) => {
        const next = !targetId || prev === targetId ? null : prev;
        dismissingIdRef.current = next;
        return next;
      });
      setPausedId((prev) => (!targetId || prev === targetId ? null : prev));
      setQueueState((prev) => dismissSnackbarById(prev, targetId));
    },
    [clearFallbackTimer]
  );

  const hideSnackbar = useCallback(
    (id?: string) => {
      const active = currentRef.current;
      if (!active) return;

      if (id && active.id !== id) {
        setQueueState((prev) => dismissSnackbarById(prev, id));
        return;
      }

      const activeId = active.id;
      if (dismissingIdRef.current === activeId) {
        return;
      }

      dismissingIdRef.current = activeId;
      setDismissingId(activeId);
      clearFallbackTimer();
      // Safety release in case an unmount cancels exit animation completion
      fallbackDismissRef.current = setTimeout(() => {
        completeDismiss(activeId);
      }, 280);
    },
    [clearFallbackTimer, completeDismiss]
  );

  const showSnackbar = useCallback((options: SnackbarOptions): string => {
    const nextItem = createSnackbarItem(options, () => {
      seqRef.current += 1;
      return `snackbar-${Date.now()}-${seqRef.current}`;
    });

    setQueueState((prev) => enqueueSnackbar(prev, nextItem));
    return nextItem.id;
  }, []);

  const clearSnackbars = useCallback(() => {
    clearActiveTimer();
    clearFallbackTimer();
    setDismissingId(null);
    setPausedId(null);
    setQueueState(INITIAL_SNACKBAR_QUEUE_STATE);
  }, [clearActiveTimer, clearFallbackTimer]);

  const pauseTimer = useCallback((id: string) => {
    setPausedId(id);
  }, []);

  const resumeTimer = useCallback((id: string) => {
    setPausedId((prev) => (prev === id ? null : prev));
  }, []);

  const registerModalHost = useCallback((hostId: symbol) => {
    setModalHostStack((prev) => (prev.includes(hostId) ? prev : [...prev, hostId]));
    return () => {
      setModalHostStack((prev) => prev.filter((item) => item !== hostId));
    };
  }, []);

  const current = queueState.current;
  const activeModalHostId =
    modalHostStack.length > 0 ? modalHostStack[modalHostStack.length - 1] : null;

  // Schedule automatic dismissal for the currently visible snackbar
  useEffect(() => {
    clearActiveTimer();

    if (!current || current.duration === 0) return;
    if (dismissingId === current.id || pausedId === current.id) return;

    const targetId = current.id;
    timerRef.current = setTimeout(() => {
      hideSnackbar(targetId);
    }, current.duration);

    return clearActiveTimer;
  }, [clearActiveTimer, current, dismissingId, hideSnackbar, pausedId]);

  useEffect(() => {
    return () => {
      clearActiveTimer();
      clearFallbackTimer();
    };
  }, [clearActiveTimer, clearFallbackTimer]);

  const value = useMemo<SnackbarInternalContextValue>(
    () => ({
      showSnackbar,
      hideSnackbar,
      clearSnackbars,
      current,
      dismissingId,
      completeDismiss,
      pauseTimer,
      resumeTimer,
      registerModalHost,
      activeModalHostId,
    }),
    [
      activeModalHostId,
      clearSnackbars,
      completeDismiss,
      current,
      dismissingId,
      hideSnackbar,
      pauseTimer,
      registerModalHost,
      resumeTimer,
      showSnackbar,
    ]
  );

  return <SnackbarContext.Provider value={value}>{children}</SnackbarContext.Provider>;
}

/**
 * Public hook for triggering and controlling global Snackbars anywhere in the app.
 */
export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return {
    showSnackbar: ctx.showSnackbar,
    hideSnackbar: ctx.hideSnackbar,
    clearSnackbars: ctx.clearSnackbars,
  };
}

/**
 * Internal hook used by SnackbarViewport / modal hosts to render in the topmost window.
 */
export function useSnackbarInternal(): SnackbarInternalContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('SnackbarViewport must be rendered within a SnackbarProvider');
  }
  return ctx;
}

/**
 * Registers an open native `<Modal>` container as the active Snackbar host
 * so feedback renders cleanly above modal sheets instead of behind them.
 */
export function useSnackbarModalHost(isOpen: boolean): symbol {
  const { registerModalHost } = useSnackbarInternal();
  const hostIdRef = useRef<symbol>(Symbol('snackbar-modal-host'));

  useEffect(() => {
    if (!isOpen) return;
    return registerModalHost(hostIdRef.current);
  }, [isOpen, registerModalHost]);

  return hostIdRef.current;
}
