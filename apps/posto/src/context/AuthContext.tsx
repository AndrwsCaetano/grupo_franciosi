import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as authApi from '../api/auth';
import {
  clearSessionStart,
  ensureSessionStart,
  isSessionExpired,
  markSessionStart,
} from '../api/session';
import { clearTokens, getAccessToken } from '../api/tokens';

export interface AuthUser {
  id: number | string;
  name: string;
  email?: string;
  permissions?: string[];
  isAdmin?: boolean;
}

interface AuthContextValue {
  loading: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshMe = useCallback(async () => {
    const info = await authApi.me();
    if (info) {
      setUser({
        id: info.id,
        name: info.name ?? info.email ?? 'Operador',
        email: info.email,
        permissions: info.permissions,
        isAdmin: info.isAdmin,
      });
    } else {
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    // Apenas encerra a sessão (tokens + estado do usuário). Nunca apaga o
    // SQLite nem a fila de sync: apontamentos offline não podem ser perdidos.
    await clearTokens();
    await clearSessionStart();
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          if (await isSessionExpired()) {
            await clearTokens();
            await clearSessionStart();
            return;
          }
          await ensureSessionStart();
          await refreshMe();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  // Ao voltar para o primeiro plano, encerra a sessão se as 12h expiraram.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        if (await isSessionExpired()) {
          await signOut();
        }
      })();
    });
    return () => sub.remove();
  }, [signOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      await markSessionStart();
      if (result.user) {
        setUser({
          id: result.user.id,
          name: result.user.name ?? result.user.email ?? 'Operador',
          email: result.user.email,
        });
      }
      await refreshMe();
    },
    [refreshMe],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      isAuthenticated: !!user,
      signIn,
      signOut,
      refreshMe,
    }),
    [loading, user, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
