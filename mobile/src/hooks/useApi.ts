/**
 * Reusable asynchronous API execution hook for LifeAdmin Mobile
 */

import { useState, useCallback } from 'react';
import { ApiError } from '@/types/api';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T, Args extends any[] = any[]>(
  apiFn: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await apiFn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: any) {
        const normalizedError: ApiError =
          err?.status !== undefined
            ? err
            : {
                status: 500,
                message: err?.message || 'An unknown error occurred',
              };
        setState((prev) => ({ ...prev, loading: false, error: normalizedError }));
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useApi;
