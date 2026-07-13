import Alpine from "alpinejs";
import { apiFetch } from "../auth/http.js";

export function registerFuelTransfersAlpine() {
  Alpine.data("fuelTransfersPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    points: [],
    filters: {
      pointId: "",
      // Enum real da API: PENDENTE | ACEITA | RECUSADA.
      status: "",
    },

    async init() {
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

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const params = new URLSearchParams({ take: "200" });
        if (this.filters.pointId) params.set("pointId", this.filters.pointId);
        if (this.filters.status) params.set("status", this.filters.status);
        const data = await apiFetch(`/fuel-station/transfers?${params.toString()}`);
        this.items = data.items || [];
        this.total = data.total || 0;
      } catch (e) {
        this.error = e.message || "Erro ao carregar transferências";
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

    formatNumber(value) {
      if (value === null || value === undefined) return "0,00";
      const n = Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },

    statusLabel(status) {
      if (status === "ACEITA") return "Aceita";
      if (status === "RECUSADA") return "Recusada";
      return "Pendente";
    },

    statusBadgeClass(status) {
      if (status === "ACEITA") {
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";
      }
      if (status === "RECUSADA") {
        return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
      }
      return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";
    },
  }));
}
