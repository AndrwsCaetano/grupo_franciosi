import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

export function registerFuelPointAccessAlpine() {
  Alpine.data("fuelPointAccessPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    canWrite: false,

    points: [],
    users: [],
    filters: { pointId: "" },

    showForm: false,
    saving: false,
    formError: "",
    form: { userId: "", pointId: "" },

    confirmUserId: "",
    confirmPointId: "",
    confirmLabel: "",

    async init() {
      this.canWrite = userHasPermission("fuel_station.write");
      await this.loadPoints();
      await this.load();
    },

    async loadPoints() {
      try {
        // "sort" não existe no BasicListDto (seria rejeitado); a API ordena por name.
        const data = await apiFetch(`/fuel-station/points?take=500&order=asc`);
        this.points = data?.items || [];
      } catch {
        this.points = [];
      }
    },

    async loadUsers() {
      try {
        const data = await apiFetch(`/users`);
        this.users = Array.isArray(data) ? data : data?.items || [];
      } catch {
        this.users = [];
      }
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const params = new URLSearchParams();
        if (this.filters.pointId) params.set("pointId", this.filters.pointId);
        const qs = params.toString();
        const data = await apiFetch(`/fuel-station/access${qs ? `?${qs}` : ""}`);
        this.items = data.items || [];
        this.total = data.total || 0;
      } catch (e) {
        this.error = e.message || "Erro ao carregar liberações";
      } finally {
        this.loading = false;
      }
    },

    formatDateTime(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    async openNew() {
      this.form = { userId: "", pointId: "" };
      this.formError = "";
      await this.loadUsers();
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    async save() {
      this.saving = true;
      this.formError = "";
      try {
        await apiFetch(`/fuel-station/access`, {
          method: "POST",
          body: JSON.stringify({
            userId: this.form.userId,
            pointId: this.form.pointId,
          }),
        });
        this.showForm = false;
        await this.load();
      } catch (e) {
        this.formError = e.message || "Erro ao liberar acesso";
      } finally {
        this.saving = false;
      }
    },

    // UserFuelPointAccess tem chave composta (userId+pointId) — não existe "id".
    askRemove(a) {
      this.confirmUserId = a.userId;
      this.confirmPointId = a.pointId;
      this.confirmLabel = `${a.user?.name || "—"} — ${a.point?.name || "—"}`;
    },

    cancelRemove() {
      this.confirmUserId = "";
      this.confirmPointId = "";
      this.confirmLabel = "";
    },

    async confirmRemove() {
      const userId = this.confirmUserId;
      const pointId = this.confirmPointId;
      this.confirmUserId = "";
      this.confirmPointId = "";
      try {
        await apiFetch(`/fuel-station/access/${userId}/${pointId}`, {
          method: "DELETE",
        });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao remover acesso";
      }
    },
  }));
}
