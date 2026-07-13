import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '../api/auth';
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

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await refreshMe();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
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

  const signOut = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

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
