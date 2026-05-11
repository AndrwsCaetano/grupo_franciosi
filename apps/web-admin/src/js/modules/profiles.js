import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["name", "users", "permissions"];

function emptyForm() {
  return {
    id: null,
    name: "",
    description: "",
    permissions: {},
  };
}

export function registerProfilesAlpine() {
  Alpine.data("profilesPage", () => ({
    items: [],
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,
    canAssign: false,

    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),
    permissionsCatalog: [],

    confirmId: "",
    confirmLabel: "",

    async init() {
      this.canWrite = userHasPermission("profiles.write");
      this.canAssign = userHasPermission("permissions.assign");
      try {
        this.permissionsCatalog = await apiFetch("/permissions");
      } catch (e) {
        this.error = e.message || "Erro ao carregar opções de permissões";
      }
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const items = await apiFetch("/profiles");
        this.items = items;
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar perfis";
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
        const va = this.sortValue(a, this.sort);
        const vb = this.sortValue(b, this.sort);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      this.items = items;
    },

    sortValue(item, field) {
      if (field === "users") return item._count?.users ?? 0;
      if (field === "permissions") {
        return (item.permissions || []).filter((p) => p.granted).length;
      }
      return (item[field] || "").toString().toLowerCase();
    },

    filteredItems() {
      const term = this.q.trim().toLowerCase();
      if (!term) return this.items;
      return this.items.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(term) ||
          (p.description || "").toLowerCase().includes(term),
      );
    },

    grantedCount(profile) {
      return (profile.permissions || []).filter((p) => p.granted).length;
    },

    openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.showForm = true;
    },

    openEdit(profile) {
      this.form = {
        id: profile.id,
        name: profile.name || "",
        description: profile.description || "",
        permissions: {},
      };
      for (const pp of profile.permissions || []) {
        if (pp.granted) {
          this.form.permissions[pp.permission.id] = true;
        }
      }
      this.formError = "";
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    togglePermission(id) {
      this.form.permissions[id] = !this.form.permissions[id];
    },

    selectAllPermissions() {
      const next = {};
      for (const p of this.permissionsCatalog) next[p.id] = true;
      this.form.permissions = next;
    },

    clearAllPermissions() {
      this.form.permissions = {};
    },

    async save() {
      this.saving = true;
      this.formError = "";
      try {
        const payload = {
          name: this.form.name.trim(),
          description: this.form.description.trim() || null,
        };
        if (!payload.name) throw new Error("Nome é obrigatório");

        let saved;
        if (this.form.id) {
          saved = await apiFetch(`/profiles/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          saved = await apiFetch("/profiles", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }

        if (this.canAssign) {
          const permList = this.permissionsCatalog
            .filter((p) => this.form.permissions[p.id])
            .map((p) => ({ permissionId: p.id, granted: true }));
          await apiFetch(`/profiles/${saved.id}/permissions`, {
            method: "PUT",
            body: JSON.stringify({ permissions: permList }),
          });
        }

        await this.load();
        this.closeForm();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar perfil";
      } finally {
        this.saving = false;
      }
    },

    askDelete(profile) {
      if (profile._count?.users > 0) {
        this.error = `Perfil "${profile.name}" não pode ser excluído: está em uso por ${profile._count.users} usuário(s).`;
        return;
      }
      this.confirmId = profile.id;
      this.confirmLabel = profile.name;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmLabel = "";
    },

    async confirmDelete() {
      if (!this.confirmId) return;
      try {
        await apiFetch(`/profiles/${this.confirmId}`, { method: "DELETE" });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao excluir perfil";
      } finally {
        this.cancelDelete();
      }
    },
  }));
}
