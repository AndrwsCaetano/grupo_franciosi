import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["name", "unit", "active"];

export function registerFuelProductsAlpine() {
  Alpine.data("fuelProductsPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,

    showForm: false,
    saving: false,
    formError: "",
    formTab: "data",
    form: emptyForm(),

    // Estoque é somente leitura aqui: a API não expõe CRUD direto de FuelStock,
    // apenas ajusta saldos via apontamentos, transferências e NFs de entrada.
    stockRows: [],
    stockError: "",
    loadingStock: false,

    async init() {
      this.canWrite = userHasPermission("fuel_station.write");
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        // A API só ordena por "name"; "sort" não existe no DTO (seria rejeitado).
        const params = new URLSearchParams({
          order: this.order,
          take: "200",
        });
        if (this.q.trim()) params.set("q", this.q.trim());
        const data = await apiFetch(`/fuel-station/products?${params.toString()}`);
        this.items = data.items || [];
        this.total = data.total || 0;
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar produtos";
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

    applySort() {
      const field = this.sort;
      const dir = this.order === "desc" ? -1 : 1;
      this.items = [...this.items].sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (typeof av === "boolean" || typeof bv === "boolean") {
          return (Number(av) - Number(bv)) * dir;
        }
        return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      });
    },

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.formTab = "data";
      this.stockRows = [];
      this.showForm = true;
    },

    async openEdit(pr) {
      this.form = {
        id: pr.id,
        name: pr.name,
        unit: pr.unit || "L",
        active: pr.active,
      };
      this.formError = "";
      this.formTab = "data";
      await this.loadStock(pr.id);
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    // Não existe endpoint para consultar estoque filtrado por produto, então
    // buscamos todos os pontos (que já retornam seus `stocks` embutidos) e
    // filtramos localmente pelo produto em edição.
    async loadStock(productId) {
      this.stockError = "";
      this.loadingStock = true;
      try {
        const pointsData = await apiFetch(`/fuel-station/points?take=500&order=asc`);
        const points = pointsData?.items || [];
        this.stockRows = points.map((p) => {
          const stock = (p.stocks || []).find((s) => s.productId === productId);
          return {
            pointId: p.id,
            pointName: p.name,
            quantityLiters: stock ? Number(stock.quantityLiters) : 0,
            minReserveLiters: stock ? Number(stock.minReserveLiters) : 0,
            hasStock: !!stock,
          };
        });
      } catch (e) {
        this.stockError = e.message || "Erro ao carregar estoque";
      } finally {
        this.loadingStock = false;
      }
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

    async save() {
      this.saving = true;
      this.formError = "";
      const payload = {
        name: this.form.name,
        unit: this.form.unit,
        active: !!this.form.active,
      };
      try {
        if (this.form.id) {
          await apiFetch(`/fuel-station/products/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          const saved = await apiFetch(`/fuel-station/products`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          this.form.id = saved?.id || "";
        }
        await this.load();
        if (!this.form.id) {
          this.showForm = false;
        }
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },
  }));
}

function emptyForm() {
  return {
    id: "",
    name: "",
    unit: "L",
    active: true,
  };
}
