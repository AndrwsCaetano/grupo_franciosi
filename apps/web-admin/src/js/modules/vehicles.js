import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["plate", "brand", "model", "fuelTankLiters", "active"];

export function registerVehiclesAlpine() {
  Alpine.data("vehiclesPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "plate",
    order: "asc",

    canWrite: false,
    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),

    confirmId: "",
    confirmPlate: "",

    async init() {
      this.canWrite = userHasPermission("vehicles.write");
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const params = new URLSearchParams({
          sort: this.sort,
          order: this.order,
          take: "200",
        });
        if (this.q.trim()) params.set("q", this.q.trim());
        const data = await apiFetch(`/vehicles?${params.toString()}`);
        this.items = data.items;
        this.total = data.total;
      } catch (e) {
        this.error = e.message || "Erro ao carregar veículos";
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
      this.load();
    },

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.showForm = true;
    },

    openEdit(v) {
      this.form = {
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        fuelTankLiters: v.fuelTankLiters,
        active: v.active,
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
        plate: (this.form.plate || "").toUpperCase(),
        brand: this.form.brand,
        model: this.form.model,
        fuelTankLiters: Number(this.form.fuelTankLiters || 0),
        active: !!this.form.active,
      };
      try {
        if (this.form.id) {
          await apiFetch(`/vehicles/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch(`/vehicles`, {
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

    askDelete(v) {
      this.confirmId = v.id;
      this.confirmPlate = v.plate;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmPlate = "";
    },

    async confirmDelete() {
      const id = this.confirmId;
      this.confirmId = "";
      try {
        await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao excluir";
      }
    },
  }));
}

function emptyForm() {
  return {
    id: "",
    plate: "",
    brand: "",
    model: "",
    fuelTankLiters: 0,
    active: true,
  };
}
