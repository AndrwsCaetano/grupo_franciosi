import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["tag", "name", "category", "hourMeter", "odometerKm"];

export function registerFuelMachineryAlpine() {
  Alpine.data("fuelMachineryPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "tag",
    order: "asc",

    canWrite: false,
    canValidate: false,

    products: [],

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
        // A API ordena apenas por "tag"; "sort" não existe no DTO (seria rejeitado).
        const params = new URLSearchParams({
          order: this.order,
          take: "200",
        });
        if (this.q.trim()) params.set("q", this.q.trim());
        const data = await apiFetch(`/fuel-station/machinery?${params.toString()}`);
        this.items = data.items || [];
        this.total = data.total || 0;
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar maquinário";
      } finally {
        this.loading = false;
      }
    },

    async loadProducts() {
      try {
        const data = await apiFetch(`/fuel-station/products?take=500&order=asc`);
        this.products = (data?.items || []).filter((p) => p.active);
      } catch {
        this.products = [];
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
        if (typeof av === "number" || typeof bv === "number") {
          return (Number(av ?? 0) - Number(bv ?? 0)) * dir;
        }
        return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      });
    },

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    statusLabel(status) {
      if (status === "ATIVO") return "Ativo";
      if (status === "MANUTENCAO") return "Manutenção";
      if (status === "INATIVO") return "Inativo";
      return status || "—";
    },

    formatNumber(value) {
      if (value === null || value === undefined || value === "") return "—";
      const n = Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("pt-BR");
    },

    async openNew() {
      this.form = emptyForm();
      this.formError = "";
      await this.loadProducts();
      this.showForm = true;
    },

    async openEdit(m) {
      this.form = {
        id: m.id,
        tag: m.tag,
        name: m.name,
        category: m.category,
        defaultProductId: m.defaultProductId || m.defaultProduct?.id || "",
        hourMeter: m.hourMeter ?? "",
        odometerKm: m.odometerKm ?? "",
        status: m.status || "ATIVO",
        erpExternalId: m.erpExternalId || "",
      };
      this.formError = "";
      await this.loadProducts();
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    async save() {
      this.saving = true;
      this.formError = "";
      const payload = {
        tag: (this.form.tag || "").toUpperCase(),
        name: this.form.name,
        category: this.form.category,
        defaultProductId: this.form.defaultProductId || null,
        hourMeter:
          this.form.hourMeter === "" ? undefined : Number(this.form.hourMeter),
        odometerKm:
          this.form.odometerKm === "" ? undefined : Number(this.form.odometerKm),
        status: this.form.status,
        erpExternalId: this.form.erpExternalId || null,
      };
      try {
        if (this.form.id) {
          await apiFetch(`/fuel-station/machinery/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch(`/fuel-station/machinery`, {
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

    async toggleValidate(m) {
      this.error = "";
      try {
        await apiFetch(`/fuel-station/machinery/${m.id}`, {
          method: "PATCH",
          body: JSON.stringify({ validated: !m.validatedAt }),
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
    tag: "",
    name: "",
    category: "",
    defaultProductId: "",
    hourMeter: "",
    odometerKm: "",
    status: "ATIVO",
    erpExternalId: "",
  };
}
