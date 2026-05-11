import Alpine from "alpinejs";
import { apiFetch, getCachedUser, userHasPermission } from "../auth/http.js";

const SORTABLE = ["name", "email", "createdAt"];

function emptyForm() {
  return {
    id: null,
    name: "",
    email: "",
    password: "",
    active: true,
    isAdmin: false,
    profileIds: {},
    /** Override por permissão: 'inherit' | 'allow' | 'deny' */
    permissionStates: {},
  };
}

export function registerUsersAlpine() {
  Alpine.data("usersPage", () => ({
    items: [],
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,
    canAssign: false,
    currentUserId: "",

    profilesCatalog: [],
    permissionsCatalog: [],

    showForm: false,
    saving: false,
    formError: "",
    activeTab: "dados", // 'dados' | 'perfis' | 'permissoes'
    form: emptyForm(),

    confirmId: "",
    confirmLabel: "",

    async init() {
      this.canWrite = userHasPermission("users.write");
      this.canAssign = userHasPermission("permissions.assign");
      this.currentUserId = getCachedUser()?.id || "";
      try {
        const [profiles, permissions] = await Promise.all([
          apiFetch("/profiles"),
          apiFetch("/permissions"),
        ]);
        this.profilesCatalog = profiles;
        this.permissionsCatalog = permissions;
      } catch (e) {
        this.error = e.message || "Erro ao carregar catálogos";
      }
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const items = await apiFetch("/users");
        this.items = items;
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar usuários";
      } finally {
        this.loading = false;
      }
    },

    sortBy(field) {
      if (!SORTABLE.includes(field)) return;
      if (this.sort === field) {
        this.order = this.order === "asc" ? "desc" : "asc";
      } else {
        this.sort = field;
        this.order = "asc";
      }
      this.applySort();
    },

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    applySort() {
      const dir = this.order === "asc" ? 1 : -1;
      const items = [...this.items];
      items.sort((a, b) => {
        const va = (a[this.sort] || "").toString().toLowerCase();
        const vb = (b[this.sort] || "").toString().toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      this.items = items;
    },

    filteredItems() {
      const term = this.q.trim().toLowerCase();
      if (!term) return this.items;
      return this.items.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term),
      );
    },

    profileNames(u) {
      const names = (u.profiles || []).map((p) => p.profile?.name).filter(Boolean);
      return names.length ? names.join(", ") : "—";
    },

    formatDate(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("pt-BR");
    },

    openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.activeTab = "dados";
      this.showForm = true;
    },

    async openEdit(user) {
      this.formError = "";
      this.activeTab = "dados";
      this.form = emptyForm();
      this.form.id = user.id;
      this.form.name = user.name || "";
      this.form.email = user.email || "";
      this.form.password = "";
      this.form.active = !!user.active;
      this.form.isAdmin = !!user.isAdmin;
      const profileIds = {};
      for (const p of user.profiles || []) {
        if (p.profile?.id) profileIds[p.profile.id] = true;
      }
      this.form.profileIds = profileIds;
      try {
        const detail = await apiFetch(`/users/${user.id}`);
        const states = {};
        for (const o of detail.permissionOverrides || []) {
          states[o.permission.id] = o.granted ? "allow" : "deny";
        }
        this.form.permissionStates = states;
      } catch (e) {
        this.formError = e.message || "Erro ao carregar overrides";
      }
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    toggleProfile(id) {
      this.form.profileIds[id] = !this.form.profileIds[id];
    },

    permState(id) {
      return this.form.permissionStates[id] || "inherit";
    },

    setPermState(id, state) {
      if (state === "inherit") {
        delete this.form.permissionStates[id];
      } else {
        this.form.permissionStates[id] = state;
      }
    },

    async save() {
      this.saving = true;
      this.formError = "";
      try {
        const name = this.form.name.trim();
        const email = this.form.email.trim().toLowerCase();
        if (!name) throw new Error("Nome é obrigatório");
        if (!email) throw new Error("E-mail é obrigatório");

        let saved;
        if (this.form.id) {
          const payload = {
            name,
            email,
            active: this.form.active,
            isAdmin: this.form.isAdmin,
          };
          if (this.form.password.trim()) {
            if (this.form.password.length < 8) {
              throw new Error("Senha deve ter no mínimo 8 caracteres");
            }
            payload.password = this.form.password;
          }
          saved = await apiFetch(`/users/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          if (!this.form.password.trim()) {
            throw new Error("Senha é obrigatória para criar um usuário");
          }
          if (this.form.password.length < 8) {
            throw new Error("Senha deve ter no mínimo 8 caracteres");
          }
          saved = await apiFetch("/users", {
            method: "POST",
            body: JSON.stringify({
              name,
              email,
              password: this.form.password,
              active: this.form.active,
              isAdmin: this.form.isAdmin,
              profileIds: Object.keys(this.form.profileIds).filter(
                (id) => this.form.profileIds[id],
              ),
            }),
          });
        }

        if (this.form.id) {
          const profileIds = Object.keys(this.form.profileIds).filter(
            (id) => this.form.profileIds[id],
          );
          await apiFetch(`/users/${saved.id}/profiles`, {
            method: "POST",
            body: JSON.stringify({ profileIds }),
          });
        }

        if (this.canAssign) {
          const overrides = [];
          for (const [permId, state] of Object.entries(
            this.form.permissionStates,
          )) {
            if (state === "allow") {
              overrides.push({ permissionId: permId, granted: true });
            } else if (state === "deny") {
              overrides.push({ permissionId: permId, granted: false });
            }
          }
          await apiFetch(`/users/${saved.id}/permissions`, {
            method: "PUT",
            body: JSON.stringify({ permissions: overrides }),
          });
        }

        await this.load();
        this.closeForm();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar usuário";
      } finally {
        this.saving = false;
      }
    },

    askDelete(user) {
      if (user.id === this.currentUserId) {
        this.error = "Não é possível excluir o próprio usuário enquanto autenticado.";
        return;
      }
      this.confirmId = user.id;
      this.confirmLabel = `${user.name} (${user.email})`;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmLabel = "";
    },

    async confirmDelete() {
      if (!this.confirmId) return;
      try {
        await apiFetch(`/users/${this.confirmId}`, { method: "DELETE" });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao excluir usuário";
      } finally {
        this.cancelDelete();
      }
    },
  }));
}
