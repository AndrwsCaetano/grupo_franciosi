import Alpine from "alpinejs";
import { apiFetch } from "../auth/http.js";

export function registerFuelDispensingsAlpine() {
  Alpine.data("fuelDispensingsPage", () => ({
    items: [],
    allItems: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    points: [],
    filters: {
      pointId: "",
      // Enum real da API: PENDENTE | SINCRONIZADO | ERRO (não PENDING/SYNCED/ERROR).
      syncStatus: "",
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
        // A API só filtra por pointId/machineryId — syncStatus e busca textual
        // não são suportados no backend, então filtramos no cliente abaixo.
        const params = new URLSearchParams({ take: "200" });
        if (this.filters.pointId) params.set("pointId", this.filters.pointId);
        const data = await apiFetch(`/fuel-station/dispensings?${params.toString()}`);
        this.allItems = data.items || [];
        this.applyFilters();
      } catch (e) {
        this.error = e.message || "Erro ao carregar apontamentos";
      } finally {
        this.loading = false;
      }
    },

    applyFilters() {
      const q = this.q.trim().toLowerCase();
      this.items = (this.allItems || []).filter((d) => {
        if (this.filters.syncStatus && d.syncStatus !== this.filters.syncStatus) {
          return false;
        }
        if (q) {
          const haystack = [
            d.operator?.name,
            d.machinery?.tag,
            d.machinery?.name,
            d.product?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
      this.total = this.items.length;
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

    syncLabel(status) {
      if (status === "SINCRONIZADO") return "Sincronizado";
      if (status === "ERRO") return "Erro";
      return "Pendente";
    },

    syncBadgeClass(status) {
      if (status === "SINCRONIZADO") {
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";
      }
      if (status === "ERRO") {
        return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
      }
      return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";
    },
  }));
}
