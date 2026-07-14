import * as SecureStore from 'expo-secure-store';

const SESSION_STARTED_AT_KEY = 'posto_session_started_at';

/** Duração máxima da sessão após o login: 12 horas. */
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function markSessionStart(): Promise<void> {
  await SecureStore.setItemAsync(SESSION_STARTED_AT_KEY, String(Date.now()));
}

/**
 * Garante que exista um timestamp de início de sessão (migração para
 * sessões abertas antes desta feature existir).
 */
export async function ensureSessionStart(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STARTED_AT_KEY);
    if (!raw) await markSessionStart();
  } catch {
    // ignore
  }
}

export async function clearSessionStart(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_STARTED_AT_KEY).catch(() => undefined);
}

/**
 * Sessão expira 12h após o login. Sem timestamp gravado (sessão anterior à
 * feature) não expira — o timestamp é criado na inicialização do AuthContext.
 */
export async function isSessionExpired(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STARTED_AT_KEY);
    if (!raw) return false;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return false;
    return Date.now() - startedAt > SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}
