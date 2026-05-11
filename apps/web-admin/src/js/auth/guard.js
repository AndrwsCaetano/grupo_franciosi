import { getAccessToken } from "./session.js";

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

export function runAuthRouteGuard() {
  if (isPublicAuthPage()) {
    return;
  }
  if (!getAccessToken()) {
    window.location.href = "signin.html";
  }
}
