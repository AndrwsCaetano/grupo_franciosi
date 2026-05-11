/** Chaves alinhadas à API (Nest) em apps/api */
export const AUTH_STORAGE = {
  accessToken: "gf_access_token",
  refreshToken: "gf_refresh_token",
  user: "gf_user",
};

export function saveSession(payload) {
  if (payload.accessToken) {
    localStorage.setItem(AUTH_STORAGE.accessToken, payload.accessToken);
  }
  if (payload.refreshToken) {
    localStorage.setItem(AUTH_STORAGE.refreshToken, payload.refreshToken);
  }
  if (payload.user) {
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(payload.user));
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE.accessToken);
  localStorage.removeItem(AUTH_STORAGE.refreshToken);
  localStorage.removeItem(AUTH_STORAGE.user);
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_STORAGE.accessToken);
}

export function getRefreshToken() {
  return localStorage.getItem(AUTH_STORAGE.refreshToken);
}
