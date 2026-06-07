import Alpine from "alpinejs";
import { embedDashboard } from "@superset-ui/embedded-sdk";
import { apiFetch, userHasPermission } from "../auth/http.js";

function emptyForm() {
  return {
    id: null,
    title: "",
    slug: "",
    description: "",
    embeddedUuid: "",
    active: true,
  };
}

async function fetchGuestToken(slug) {
  const res = await apiFetch(`/superset/dashboards/${slug}/guest-token`, {
    method: "POST",
  });
  return res;
}

export function registerSupersetAlpine() {
  Alpine.data("supersetPage", () => ({
    // Visualização (usuário)
    mine: [],
    loadingMine: false,
    selectedSlug: "",
    embedError: "",
    embedding: false,
    embedInstance: null,

    // Administração
    canWrite: false,
    canAssign: false,
    tab: "view", // 'view' | 'manage'

    items: [],
    loading: false,
    error: "",

    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),

    confirmId: "",
    confirmLabel: "",

    // Liberação de usuários
    showAssign: false,
    assignDashboard: null,
    users: [],
    assignedIds: {},
    assignSaving: false,
    assignError: "",

    async init() {
      this.canWrite = userHasPermission("superset.write");
      this.canAssign = userHasPermission("superset.assign");
      await this.loadMine();
      if (this.canWrite) {
        await this.loadItems();
      }
    },

    // ---------------- Visualização ----------------
    async loadMine() {
      this.loadingMine = true;
      try {
        this.mine = await apiFetch("/superset/dashboards/me");
        if (this.mine.length && !this.selectedSlug) {
          await this.openDashboard(this.mine[0].slug);
        }
      } catch (e) {
        this.embedError = e.message || "Erro ao carregar dashboards";
      } finally {
        this.loadingMine = false;
      }
    },

    async openDashboard(slug) {
      this.selectedSlug = slug;
      this.embedError = "";
      this.embedding = true;
      const mount = this.$refs.embed;
      try {
        if (this.embedInstance?.unmount) {
          this.embedInstance.unmount();
        }
        mount.innerHTML = "";
        const first = await fetchGuestToken(slug);
        this.embedInstance = await embedDashboard({
          id: first.embeddedUuid,
          supersetDomain: first.supersetUrl,
          mountPoint: mount,
          fetchGuestToken: async () => (await fetchGuestToken(slug)).token,
          dashboardUiConfig: {
            hideTitle: true,
            hideChartControls: false,
            filters: { expanded: false },
          },
        });
        // O iframe gerado herda 100% da largura; força altura útil.
        const iframe = mount.querySelector("iframe");
        if (iframe) {
          iframe.style.width = "100%";
          iframe.style.height = "75vh";
          iframe.style.border = "0";
        }
      } catch (e) {
        this.embedError =
          e.message || "Não foi possível carregar o dashboard do Superset";
      } finally {
        this.embedding = false;
      }
    },

    // ---------------- Administração ----------------
    async loadItems() {
      this.loading = true;
      this.error = "";
      try {
        this.items = await apiFetch("/superset/dashboards");
      } catch (e) {
        this.error = e.message || "Erro ao carregar dashboards";
      } finally {
        this.loading = false;
      }
    },

    openCreate() {
      if (!this.canWrite) return;
      this.form = emptyForm();
      this.formError = "";
      this.showForm = true;
    },

    openEdit(item) {
      if (!this.canWrite) return;
      this.form = {
        id: item.id,
        title: item.title,
        slug: item.slug,
        description: item.description || "",
        embeddedUuid: item.embeddedUuid,
        active: !!item.active,
      };
      this.formError = "";
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
      this.form = emptyForm();
    },

    buildPayload() {
      const payload = {
        title: this.form.title.trim(),
        slug: this.form.slug.trim().toLowerCase(),
        embeddedUuid: this.form.embeddedUuid.trim(),
        active: !!this.form.active,
      };
      const desc = (this.form.description || "").trim();
      if (desc) payload.description = desc;
      if (!payload.title) throw new Error("Informe o título");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
        throw new Error("Slug inválido (use minúsculas, números e hífens)");
      }
      if (!payload.embeddedUuid) throw new Error("Informe o Embedded UUID");
      return payload;
    },

    async save() {
      this.formError = "";
      this.saving = true;
      try {
        const payload = this.buildPayload();
        if (this.form.id) {
          await apiFetch(`/superset/dashboards/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch("/superset/dashboards", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        this.closeForm();
        await this.loadItems();
        await this.loadMine();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },

    askDelete(item) {
      if (!this.canWrite) return;
      this.confirmId = item.id;
      this.confirmLabel = item.title;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmLabel = "";
    },

    async confirmDelete() {
      if (!this.confirmId) return;
      try {
        await apiFetch(`/superset/dashboards/${this.confirmId}`, {
          method: "DELETE",
        });
        this.cancelDelete();
        await this.loadItems();
      } catch (e) {
        this.error = e.message || "Erro ao excluir";
        this.cancelDelete();
      }
    },

    // ---------------- Liberação de usuários ----------------
    async openAssign(item) {
      if (!this.canAssign) return;
      this.assignDashboard = item;
      this.assignError = "";
      this.assignedIds = {};
      this.showAssign = true;
      try {
        if (!this.users.length) {
          this.users = await apiFetch("/users");
        }
        const detail = await apiFetch(`/superset/dashboards/${item.id}`);
        for (const a of detail.assignments || []) {
          this.assignedIds[a.userId] = true;
        }
      } catch (e) {
        this.assignError =
          e.message ||
          "Erro ao carregar usuários (precisa da permissão de listar usuários)";
      }
    },

    closeAssign() {
      this.showAssign = false;
      this.assignDashboard = null;
      this.assignedIds = {};
    },

    async saveAssign() {
      if (!this.assignDashboard) return;
      this.assignSaving = true;
      this.assignError = "";
      try {
        const userIds = Object.keys(this.assignedIds).filter(
          (id) => this.assignedIds[id],
        );
        await apiFetch(`/superset/dashboards/${this.assignDashboard.id}/assign`, {
          method: "POST",
          body: JSON.stringify({ userIds }),
        });
        this.closeAssign();
        await this.loadItems();
      } catch (e) {
        this.assignError = e.message || "Erro ao salvar liberações";
      } finally {
        this.assignSaving = false;
      }
    },
  }));
}
