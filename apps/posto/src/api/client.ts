import { getApiBaseUrl } from '../config';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokens';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function refreshTokens(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions extends RequestInit {
  /** desabilita anexar bearer token (ex.: login) */
  auth?: boolean;
  /** timeout em ms (default 15000). */
  timeoutMs?: number;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new ApiError(0, 'timeout', null)), ms),
    ),
  ]);
}

export async function apiFetch(
  path: string,
  options: RequestOptions = {},
  retryOn401 = true,
): Promise<Response> {
  const { auth = true, timeoutMs = 15000, headers, ...rest } = options;
  const h = new Headers(headers);
  if (!h.has('Content-Type') && rest.body && typeof rest.body === 'string') {
    h.set('Content-Type', 'application/json');
  }
  if (auth) {
    const t = await getAccessToken();
    if (t) h.set('Authorization', `Bearer ${t}`);
  }
  const url = `${getApiBaseUrl()}${path}`;
  const res = await withTimeout(fetch(url, { ...rest, headers: h }), timeoutMs);
  if (res.status === 401 && retryOn401 && auth) {
    const ok = await refreshTokens();
    if (ok) return apiFetch(path, options, false);
    await clearTokens();
  }
  return res;
}

export async function apiJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await apiFetch(path, options);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data: unknown = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const msg =
      (typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : null) || res.statusText || 'request_failed';
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}
