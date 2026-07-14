import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens } from './api/tokens';
import { wipeAllLocalData } from './db';

const KEY_API_URL = 'posto.apiBaseUrl';
const KEY_SESSION_POINT = 'posto.sessionPointId';

const DEFAULT_API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://10.0.2.2:4000';

let currentBase = DEFAULT_API_URL;

export async function loadApiBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(KEY_API_URL);
    if (stored && stored.trim()) {
      currentBase = stored.replace(/\/$/, '');
    }
  } catch {
    // ignore
  }
  return currentBase;
}

export function getApiBaseUrl(): string {
  return currentBase;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  currentBase = url.replace(/\/$/, '');
  await AsyncStorage.setItem(KEY_API_URL, currentBase);
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_URL;
}

/**
 * Normaliza a URL digitada: adiciona https:// quando falta esquema e remove
 * a barra final. Retorna null se não for uma URL válida.
 */
export function normalizeApiUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
  } catch {
    return null;
  }
  return url;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

/** Testa se a URL aponta para a API (GET /health, rota pública). */
export async function testApiConnection(
  url: string,
  timeoutMs = 8000,
): Promise<ConnectionTestResult> {
  const base = url.replace(/\/+$/, '');
  try {
    const res = await Promise.race([
      fetch(`${base}/health`, { method: 'GET' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ]);
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { status?: string }
        | null;
      if (data?.status === 'ok') {
        return { ok: true, message: 'Conexão OK — API respondendo.' };
      }
      return {
        ok: false,
        message: 'Servidor respondeu, mas não parece ser a API do Agrigestão.',
      };
    }
    return {
      ok: false,
      message: `Servidor respondeu HTTP ${res.status} — confira se a URL aponta para a API.`,
    };
  } catch {
    return {
      ok: false,
      message: 'Sem resposta do servidor. Verifique a URL e a conexão.',
    };
  }
}

/**
 * Troca de servidor com limpeza total: tokens, cache SQLite (incluindo fila
 * de sync e apontamentos locais) e ponto da sessão. Dados de um servidor
 * nunca podem vazar para outro.
 */
export async function switchServer(url: string): Promise<void> {
  await clearTokens();
  await wipeAllLocalData();
  await AsyncStorage.removeItem(KEY_SESSION_POINT);
  await setApiBaseUrl(url);
}
