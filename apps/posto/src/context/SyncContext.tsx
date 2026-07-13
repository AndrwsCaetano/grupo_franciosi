import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  forceSync,
  isOnline,
  onSyncChange,
  processQueue,
  startNetworkWatcher,
} from '../sync';
import * as queue from '../db/queue';

interface SyncContextValue {
  online: boolean;
  processing: boolean;
  counts: Record<queue.QueueStatus, number>;
  refresh: () => Promise<void>;
  forceSync: () => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  purgeDone: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [counts, setCounts] = useState<Record<queue.QueueStatus, number>>({
    pending: 0,
    syncing: 0,
    error: 0,
    done: 0,
  });

  const refresh = useCallback(async () => {
    const c = await queue.countByStatus();
    setCounts(c);
    setOnline(isOnline());
  }, []);

  useEffect(() => {
    const unsub = startNetworkWatcher();
    const off = onSyncChange(() => {
      void refresh();
    });
    void refresh();
    // Try initial flush right away.
    void processQueue();
    return () => {
      unsub();
      off();
    };
  }, [refresh]);

  useEffect(() => {
    const pending = counts.pending + counts.syncing;
    setProcessing(pending > 0 && online);
  }, [counts, online]);

  const value = useMemo<SyncContextValue>(
    () => ({
      online,
      processing,
      counts,
      refresh,
      forceSync: async () => {
        await forceSync();
        await refresh();
      },
      removeItem: async (id: number) => {
        await queue.removeById(id);
        await refresh();
      },
      purgeDone: async () => {
        await queue.purgeDone();
        await refresh();
      },
    }),
    [online, processing, counts, refresh],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const v = useContext(SyncContext);
  if (!v) throw new Error('useSync must be used inside SyncProvider');
  return v;
}
