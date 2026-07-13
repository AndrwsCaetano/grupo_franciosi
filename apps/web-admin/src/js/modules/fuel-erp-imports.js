import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

export function registerFuelErpImportsAlpine() {
  Alpine.data("fuelErpImportsPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    // Filtro real da API: kind (EQUIPAMENTO | NF_ENTRADA). O status
    // (PENDENTE/APROVADO/REJEITADO) é filtrado no cliente.
    kind: "",
    statusFilter: "PENDENTE",

    pulling: false,

    canValidate: false,

    detailsItem: null,
    detailsJson: "",

    rejectingItem: null,
    validateError: "",

    async init() {
      this.canValidate = userHasPermission("fuel_station.validate");
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const params = new URLSearchParams({});
        if (this.kind) params.set("kind", this.kind);
        const qs = params.toString();
        const data = await apiFetch(`/integrations/erp/imports${qs ? `?${qs}` : ""}`);
        const all = data.items || [];
        this.items = this.statusFilter
          ? all.filter((i) => i.status === this.statusFilter)
          : all;
        this.total = this.items.length;
      } catch (e) {
        this.error = e.message || "Erro ao carregar imports ERP";
      } finally {
        this.loading = false;
      }
    },

    // Busca novos registros mock do ERP Compass (fila de pendentes para validação).
    async pull() {
      this.pulling = true;
      this.error = "";
      try {
        await apiFetch(`/integrations/erp/pull`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao buscar dados do ERP";
      } finally {
        this.pulling = false;
      }
    },

    formatDateTime(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    kindLabel(kind) {
      if (kind === "EQUIPAMENTO") return "Equipamento";
      if (kind === "NF_ENTRADA") return "NF de entrada";
      return kind || "—";
    },

    referenceLabel(item) {
      const p = item?.payload || {};
      if (item?.kind === "EQUIPAMENTO") {
        return [p.tag, p.name].filter(Boolean).join(" — ") || "—";
      }
      if (item?.kind === "NF_ENTRADA") {
        return [p.numero, p.fornecedor].filter(Boolean).join(" — ") || "—";
      }
      return "—";
    },

    statusLabel(status) {
      if (status === "PENDENTE") return "Pendente";
      if (status === "APROVADO") return "Aprovado";
      if (status === "REJEITADO") return "Rejeitado";
      return status || "—";
    },

    statusBadgeClass(status) {
      if (status === "APROVADO") {
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";
      }
      if (status === "REJEITADO") {
        return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
      }
      return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";
    },

    openDetails(i) {
      this.detailsItem = i;
      try {
        this.detailsJson = JSON.stringify(i.payload ?? i, null, 2);
      } catch {
        this.detailsJson = String(i.payload ?? "");
      }
    },

    closeDetails() {
      this.detailsItem = null;
      this.detailsJson = "";
    },

    async validate(item, approve) {
      if (approve) {
        await this.doValidate(item, "APROVAR");
      } else {
        this.rejectingItem = item;
        this.validateError = "";
      }
    },

    cancelReject() {
      this.rejectingItem = null;
      this.validateError = "";
    },

    async confirmReject() {
      const item = this.rejectingItem;
      this.rejectingItem = null;
      await this.doValidate(item, "REJEITAR");
    },

    // A API só aceita { action, pointId? } — não existe campo de "motivo" texto.
    async doValidate(item, action) {
      if (!item) return;
      this.error = "";
      try {
        await apiFetch(`/integrations/erp/imports/${item.id}/validate`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao validar import";
      }
    },
  }));
}
