import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getMeta, setMeta } from '../db';
import { getPoint } from '../db/repos';
import type { FuelPoint } from '../api/fuelStation';

const KEY_POINT_ID = 'posto.sessionPointId';
const KEY_BOOT_STAMP = 'lastBootstrapAt';

interface SessionContextValue {
  point: FuelPoint | null;
  loading: boolean;
  setPointId: (id: string | null) => Promise<void>;
  lastBootstrapAt: string | null;
  markBootstrapped: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [point, setPoint] = useState<FuelPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastBootstrapAt, setLastBootstrapAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(KEY_POINT_ID);
      if (stored) {
        const p = await getPoint(stored);
        setPoint(p);
      } else {
        setPoint(null);
      }
      const stamp = await getMeta(KEY_BOOT_STAMP);
      setLastBootstrapAt(stamp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPointId = useCallback(async (id: string | null) => {
    if (id) {
      await AsyncStorage.setItem(KEY_POINT_ID, id);
      const p = await getPoint(id);
      setPoint(p);
    } else {
      await AsyncStorage.removeItem(KEY_POINT_ID);
      setPoint(null);
    }
  }, []);

  const markBootstrapped = useCallback(async () => {
    const now = new Date().toISOString();
    await setMeta(KEY_BOOT_STAMP, now);
    setLastBootstrapAt(now);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ point, loading, setPointId, lastBootstrapAt, markBootstrapped, refresh }),
    [point, loading, setPointId, lastBootstrapAt, markBootstrapped, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
