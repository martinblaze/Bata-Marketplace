'use client';

import { create } from 'zustand';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingStore {
  states: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key: string) => boolean;
  clearAll: () => void;
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  states: {},
  
  setLoading: (key, isLoading) =>
    set((state) => ({
      states: { ...state.states, [key]: isLoading },
    })),
  
  isLoading: (key) => get().states[key] || false,
  
  clearAll: () => set({ states: {} }),
}));

export function useLoading(key: string) {
  const { setLoading, isLoading } = useLoadingStore();
  
  return {
    isLoading: isLoading(key),
    setLoading: (loading: boolean) => setLoading(key, loading),
    startLoading: () => setLoading(key, true),
    stopLoading: () => setLoading(key, false),
  };
}

export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  key: string
) {
  const { setLoading, isLoading } = useLoading(key);

  const execute = async (...args: T): Promise<R | undefined> => {
    try {
      setLoading(true);
      const result = await action(...args);
      return result;
    } catch (error) {
      console.error(`Error in ${key}:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    isLoading,
  };
}

// Hook for handling multiple loading states
export function useMultipleLoading() {
  const store = useLoadingStore();

  const setMultiple = (keys: string[], isLoading: boolean) => {
    keys.forEach((key) => store.setLoading(key, isLoading));
  };

  const isAnyLoading = (keys: string[]) => {
    return keys.some((key) => store.isLoading(key));
  };

  const areAllLoading = (keys: string[]) => {
    return keys.every((key) => store.isLoading(key));
  };

  return {
    setMultiple,
    isAnyLoading,
    areAllLoading,
  };
}