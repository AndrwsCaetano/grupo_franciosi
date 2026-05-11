import Alpine from "alpinejs";
import { saveSession, getAccessToken } from "./session.js";

function formatErrorMessage(data) {
  if (!data || typeof data !== "object") {
    return "Falha no login.";
  }
  const { message } = data;
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  if (typeof message === "string") {
    return message;
  }
  return "Falha no login.";
}

export function registerSignInAlpine() {
  Alpine.data("signInForm", () => ({
    email: "",
    password: "",
    showPassword: false,
    loading: false,
    error: "",

    init() {
      if (getAccessToken()) {
        window.location.href = "index.html";
      }
    },

    async submit() {
      this.error = "";
      this.loading = true;
      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email.trim(),
            password: this.password,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          this.error = formatErrorMessage(data);
          return;
        }
        saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        window.location.href = "index.html";
      } catch {
        this.error =
          "Não foi possível contactar o servidor. Confirme se a API está a correr (porta 4000).";
      } finally {
        this.loading = false;
      }
    },
  }));
}
