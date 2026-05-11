import Alpine from "alpinejs";
import { apiFetch } from "../auth/http.js";

function emptyPasswordForm() {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  };
}

export function registerMeAlpine() {
  Alpine.data("mePage", () => ({
    loading: false,
    error: "",
    me: null,

    pwd: emptyPasswordForm(),
    pwdSaving: false,
    pwdError: "",
    pwdSuccess: "",

    async init() {
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.me = await apiFetch("/auth/me");
      } catch (e) {
        this.error = e.message || "Erro ao carregar perfil";
      } finally {
        this.loading = false;
      }
    },

    profileNames() {
      const list = (this.me?.profiles || []).map((p) => p.name);
      return list.length ? list.join(", ") : "—";
    },

    formatDate(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("pt-BR");
    },

    permissionsCount() {
      return Array.isArray(this.me?.permissions)
        ? this.me.permissions.length
        : 0;
    },

    resetPwd() {
      this.pwd = emptyPasswordForm();
      this.pwdError = "";
      this.pwdSuccess = "";
    },

    async submitPwd() {
      this.pwdError = "";
      this.pwdSuccess = "";
      const { currentPassword, newPassword, confirmPassword } = this.pwd;
      if (!currentPassword) {
        this.pwdError = "Informe a senha atual";
        return;
      }
      if (newPassword.length < 8) {
        this.pwdError = "A nova senha deve ter no mínimo 8 caracteres";
        return;
      }
      if (newPassword !== confirmPassword) {
        this.pwdError = "A confirmação não confere com a nova senha";
        return;
      }
      if (newPassword === currentPassword) {
        this.pwdError = "A nova senha deve ser diferente da atual";
        return;
      }
      this.pwdSaving = true;
      try {
        await apiFetch("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        this.pwdSuccess =
          "Senha alterada. Você será desconectado em 5 segundos para entrar com a nova senha.";
        this.resetPwdFieldsOnly();
        setTimeout(() => {
          if (window.grupoFranciosi && window.grupoFranciosi.logout) {
            window.grupoFranciosi.logout();
          } else {
            window.location.href = "signin.html";
          }
        }, 5000);
      } catch (e) {
        this.pwdError = e.message || "Não foi possível alterar a senha";
      } finally {
        this.pwdSaving = false;
      }
    },

    resetPwdFieldsOnly() {
      this.pwd.currentPassword = "";
      this.pwd.newPassword = "";
      this.pwd.confirmPassword = "";
    },
  }));
}
