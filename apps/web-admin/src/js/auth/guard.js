import { AUTH_STORAGE, clearSession, getAccessToken } from "./session.js";

/**
 * Páginas que não exigem sessão (nome do ficheiro na URL).
 */
function isPublicAuthPage() {
  const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
  return (
    path.includes("signin.html") ||
    path.includes("signup.html") ||
    path.includes("reset-password.html") ||
    path.includes("404.html")
  );
}

/**
 * Atualiza silenciosamente o `user` em localStorage a partir de `/auth/me`.
 * Necessário para que novas permissões (ex.: `fuel_station.*` após deploy do
 * módulo Posto de combustível) apareçam no menu lateral sem que o usuário
 * precise deslogar/relogar. Se o token estiver inválido, limpa a sessão e
 * redireciona ao login (mesmo comportamento do `apiFetch` para 401).
 */
async function refreshCachedUser() {
  const token = getAccessToken();
  if (!token) return;
  try {
    const resp = await fetch("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status === 401) {
      clearSession();
      if (!window.location.pathname.includes("signin.html")) {
        window.location.href = "signin.html";
      }
      return;
    }
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    if (data && typeof data === "object" && data.id) {
      localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(data));
    }
  } catch {
    // Falha silenciosa: continua com o cache antigo (offline, DNS, etc.).
  }
}

export function runAuthRouteGuard() {
  if (isPublicAuthPage()) {
    return;
  }
  if (!getAccessToken()) {
    window.location.href = "signin.html";
    return;
  }
  // Best-effort: refresh perms/isAdmin do cache em background.
  refreshCachedUser();
}
