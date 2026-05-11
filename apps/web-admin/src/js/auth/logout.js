import { clearSession, getRefreshToken } from "./session.js";

export async function logoutAndRedirect() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      /* rede indisponível: limpa sessão local na mesma */
    }
  }
  clearSession();
  window.location.href = "signin.html";
}
