import Alpine from "alpinejs";
import {
  apiFetch,
  getCachedUser,
  userHasPermission,
} from "../auth/http.js";
import { getAccessToken } from "../auth/session.js";
import { toISODate } from "../common/format.js";

const SORTABLE = [
  "fuelDate",
  "createdAt",
  "driver",
  "vehicle",
  "quantityLiters",
  "odometerKm",
];

export function registerFuelingsAlpine() {
  Alpine.data("fuelingsPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "fuelDate",
    order: "desc",

    canWrite: false,
    currentUser: null,

    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),
    receiptFile: null,
    receiptPreview: "",
    removeReceipt: false,

    drivers: [],
    vehicles: [],

    confirmId: "",
    confirmLabel: "",

    receiptModalUrl: "",
    receiptModalLabel: "",
    receiptModalFilename: "",

    async init() {
      this.canWrite = userHasPermission("fuelings.write");
      this.currentUser = getCachedUser();
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
        const data = await apiFetch(`/fuelings?${params.toString()}`);
        this.items = data.items;
        this.total = data.total;
      } catch (e) {
        this.error = e.message || "Erro ao carregar abastecimentos";
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

    formatDate(iso) {
      if (!iso) return "—";
      const s = String(iso).slice(0, 10);
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    },

    formatDateTime(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    formatLiters(value) {
      if (value === null || value === undefined) return "0,00";
      const n = Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },

    formatKm(value) {
      if (value === null || value === undefined || value === "") return "—";
      const n = Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("pt-BR");
    },

    receiptUrl(item) {
      if (!item.receiptImagePath) return "";
      return `/uploads/${item.receiptImagePath}`;
    },

    openReceipt(f) {
      if (!f?.receiptImagePath) return;
      this.receiptModalUrl = this.receiptUrl(f);
      const plate = f.vehicle?.plate || "";
      const driver = f.driverNameSnapshot || "";
      const date = this.formatDate(f.fuelDate);
      this.receiptModalLabel = [plate, driver, date]
        .filter(Boolean)
        .join(" — ");
      this.receiptModalFilename = this.buildDownloadFilename(f);
    },

    closeReceipt() {
      this.receiptModalUrl = "";
      this.receiptModalLabel = "";
      this.receiptModalFilename = "";
    },

    buildDownloadFilename(f) {
      const ext = (f.receiptImagePath || "").split(".").pop() || "img";
      const slug = (this.receiptModalLabel || "comprovante")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
      return `${slug || "comprovante"}.${ext}`;
    },

    async downloadReceipt() {
      if (!this.receiptModalUrl) return;
      try {
        const res = await fetch(this.receiptModalUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = this.receiptModalFilename || "comprovante";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (e) {
        this.error = e.message || "Erro ao baixar comprovante";
      }
    },

    async openNew() {
      this.formError = "";
      this.receiptFile = null;
      this.receiptPreview = "";
      this.removeReceipt = false;
      // Carrega motoristas/veículos ANTES de mostrar o form, senão o
      // x-model do <select> não casa com options renderizadas após.
      await this.loadOptions();
      this.form = emptyForm();
      this.form.fuelDate = toISODate(new Date().toISOString());
      this.showForm = true;
    },

    async openEdit(f) {
      this.formError = "";
      this.receiptFile = null;
      this.receiptPreview = f.receiptImagePath ? `/uploads/${f.receiptImagePath}` : "";
      this.removeReceipt = false;
      await this.loadOptions();
      this.form = {
        id: f.id,
        driverId: f.driverId || "",
        vehicleId: f.vehicleId || "",
        fuelDate: toISODate(f.fuelDate),
        quantityLiters: Number(f.quantityLiters),
        odometerKm: f.odometerKm ?? "",
        notes: f.notes || "",
        receiptImagePath: f.receiptImagePath || "",
        createdAt: f.createdAt,
        createdBy: f.createdBy
          ? `${f.createdBy.name} (${f.createdBy.email})`
          : "—",
      };
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
      if (this.receiptPreview && this.receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(this.receiptPreview);
      }
    },

    async loadOptions() {
      try {
        const [drivers, vehicles] = await Promise.all([
          apiFetch(`/drivers?take=500&sort=name&order=asc`),
          apiFetch(`/vehicles?take=500&sort=plate&order=asc`),
        ]);
        this.drivers = (drivers?.items || []).filter((d) => d.active);
        this.vehicles = (vehicles?.items || []).filter((v) => v.active);
      } catch (e) {
        this.formError = e.message || "Erro ao carregar opções";
      }
    },

    onDriverChange() {
      const d = this.drivers.find((x) => x.id === this.form.driverId);
      // Auto-preenche o veículo se o motorista tiver vínculo em aberto.
      // O backend lista assignments[0] = vínculo aberto (where: endDate is null).
      const open = d?.assignments?.[0];
      const openVehicleId = open?.vehicleId || open?.vehicle?.id || "";
      if (openVehicleId) {
        this.form.vehicleId = openVehicleId;
      }
    },

    onReceiptSelected(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        this.formError = "Selecione uma imagem (JPG, PNG, WEBP, HEIC).";
        event.target.value = "";
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        this.formError = "Imagem maior que 8 MB.";
        event.target.value = "";
        return;
      }
      this.formError = "";
      if (this.receiptPreview && this.receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(this.receiptPreview);
      }
      this.receiptFile = file;
      this.receiptPreview = URL.createObjectURL(file);
      this.removeReceipt = false;
    },

    clearReceipt() {
      if (this.receiptPreview && this.receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(this.receiptPreview);
      }
      this.receiptFile = null;
      this.receiptPreview = "";
      this.removeReceipt = !!this.form.id && !!this.form.receiptImagePath;
    },

    async save() {
      this.saving = true;
      this.formError = "";
      try {
        const fd = new FormData();
        if (this.form.driverId) fd.append("driverId", this.form.driverId);
        if (this.form.vehicleId) fd.append("vehicleId", this.form.vehicleId);
        fd.append("fuelDate", this.form.fuelDate);
        fd.append("quantityLiters", String(this.form.quantityLiters));
        if (
          this.form.odometerKm !== "" &&
          this.form.odometerKm !== null &&
          this.form.odometerKm !== undefined
        ) {
          fd.append("odometerKm", String(this.form.odometerKm));
        }
        if (this.form.notes) fd.append("notes", this.form.notes);
        if (this.receiptFile) fd.append("receipt", this.receiptFile);
        if (!this.receiptFile && this.removeReceipt && this.form.id) {
          fd.append("removeReceipt", "true");
        }

        const url = this.form.id ? `/fuelings/${this.form.id}` : `/fuelings`;
        const method = this.form.id ? "PATCH" : "POST";
        const headers = new Headers();
        const token = getAccessToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(url, { method, headers, body: fd });
        if (res.status === 401) {
          window.location.href = "signin.html";
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(extractMsg(data) || res.statusText);
        }
        this.showForm = false;
        await this.load();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },

    askDelete(f) {
      this.confirmId = f.id;
      this.confirmLabel = `${f.vehicle?.plate || ""} — ${f.driverNameSnapshot} — ${this.formatDate(f.fuelDate)}`;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmLabel = "";
    },

    async confirmDelete() {
      const id = this.confirmId;
      this.confirmId = "";
      try {
        await apiFetch(`/fuelings/${id}`, { method: "DELETE" });
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
    driverId: "",
    vehicleId: "",
    fuelDate: "",
    quantityLiters: 0,
    odometerKm: "",
    notes: "",
    receiptImagePath: "",
    createdAt: "",
    createdBy: "",
  };
}

function extractMsg(data) {
  if (!data) return "";
  if (Array.isArray(data.message)) return data.message.join(", ");
  if (typeof data.message === "string") return data.message;
  return "";
}
