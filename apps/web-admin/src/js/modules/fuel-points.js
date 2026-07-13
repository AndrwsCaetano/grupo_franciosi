import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["name", "type", "maxCapacityLiters", "active"];

export function registerFuelPointsAlpine() {
  Alpine.data("fuelPointsPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,
    canValidate: false,

    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),

    async init() {
      this.canWrite = userHasPermission("fuel_station.write");
      this.canValidate = userHasPermission("fuel_station.validate");
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        // A API ordena apenas por "name" (order asc/desc); o parâmetro "sort"
        // não existe no DTO e é rejeitado (ValidationPipe forbidNonWhitelisted).
        const params = new URLSearchParams({
          order: this.order,
          take: "200",
        });
        if (this.q.trim()) params.set("q", this.q.trim());
        const data = await apiFetch(`/fuel-station/points?${params.toString()}`);
        this.items = data.items || [];
        this.total = data.total || 0;
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar pontos de abastecimento";
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

    // A ordenação por coluna acontece no cliente: a API só ordena por "name".
    applySort() {
      const field = this.sort;
      const dir = this.order === "desc" ? -1 : 1;
      this.items = [...this.items].sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (typeof av === "boolean" || typeof bv === "boolean") {
          return (Number(av) - Number(bv)) * dir;
        }
        if (typeof av === "number" || typeof bv === "number") {
          return ((av ?? 0) - (bv ?? 0)) * dir;
        }
        return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      });
    },

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    tipoLabel(type) {
      if (type === "POSTO") return "Posto";
      if (type === "COMBOIO") return "Comboio";
      return type || "—";
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

    openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.showForm = true;
    },

    openEdit(p) {
      this.form = {
        id: p.id,
        name: p.name,
        type: p.type || "POSTO",
        maxCapacityLiters: p.maxCapacityLiters,
        active: p.active,
      };
      this.formError = "";
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    async save() {
      this.saving = true;
      this.formError = "";
      const payload = {
        name: this.form.name,
        type: this.form.type,
        maxCapacityLiters: Number(this.form.maxCapacityLiters || 0),
        active: !!this.form.active,
      };
      try {
        if (this.form.id) {
          await apiFetch(`/fuel-station/points/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch(`/fuel-station/points`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        this.showForm = false;
        await this.load();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },

    async toggleValidate(p) {
      this.error = "";
      try {
        await apiFetch(`/fuel-station/points/${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({ validated: !p.validatedAt }),
        });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao atualizar validação";
      }
    },
  }));
}

function emptyForm() {
  return {
    id: "",
    name: "",
    type: "POSTO",
    maxCapacityLiters: 0,
    active: true,
  };
}
