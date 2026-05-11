import {
  AUTH_STORAGE,
  clearSession,
  getAccessToken,
} from "./session.js";

/**
 * Wrapper de fetch que adiciona Authorization Bearer e trata 401 redirecionando ao login.
 * Para JSON: retorna o objeto já parseado.
 * Para erros: lança Error com .status e .data (corpo de erro da API).
 */
export async function apiFetch(input, init = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    clearSession();
    if (!window.location.pathname.includes("signin.html")) {
      window.location.href = "signin.html";
    }
    const err = new Error("Sessão expirada");
    err.status = 401;
    throw err;
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const err = new Error(extractErrorMessage(data) || response.statusText);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function extractErrorMessage(data) {
  if (!data) {
    return "";
  }
  if (Array.isArray(data.message)) {
    return data.message.join(", ");
  }
  if (typeof data.message === "string") {
    return data.message;
  }
  return "";
}

export function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE.user) || "null");
  } catch {
    return null;
  }
}

export function userHasPermission(code) {
  const user = getCachedUser();
  if (!user) return false;
  if (user.isAdmin) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(code);
}

export function userIsAdmin() {
  return Boolean(getCachedUser()?.isAdmin);
}

/**
 * Helper para uso em x-show no Alpine. Aceita 1+ codes; retorna true se admin
 * ou se possui qualquer um dos codes informados.
 */
export function canAny(...codes) {
  const user = getCachedUser();
  if (!user) return false;
  if (user.isAdmin) return true;
  if (!Array.isArray(user.permissions)) return false;
  return codes.some((c) => user.permissions.includes(c));
}
