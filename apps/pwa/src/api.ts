/**
 * Em `vite dev`, se `VITE_API_URL` não estiver definido, usamos URLs relativas
 * e o proxy em vite.config.ts encaminha para a API (evita CORS).
 * Em build de produção, defina `VITE_API_URL` com a URL pública da API.
 */
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/$/, '');
  // Dev: proxy Vite. Prod sem VITE_API_URL: mesma origem (nginx proxia /driver-auth, /driver, /uploads).
  return '';
}

const BASE = resolveApiBase();

const ACCESS = 'gf_driver_access_token';
const REFRESH = 'gf_driver_refresh_token';

export function getApiBase(): string {
  return BASE;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

async function refreshTokens(): Promise<boolean> {
  const r = localStorage.getItem(REFRESH);
  if (!r) return false;
  const res = await fetch(`${BASE}/driver-auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: r }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    const ok = await refreshTokens();
    if (ok) return apiFetch(path, init, false);
  }
  return res;
}
