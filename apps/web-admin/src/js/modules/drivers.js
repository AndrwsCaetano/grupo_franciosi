import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";
import { maskCpfInput, toISODate } from "../common/format.js";

const SORTABLE = [
  "name",
  "cpf",
  "licenseNumber",
  "licenseExpiryDate",
];

export function registerDriversAlpine() {
  Alpine.data("driversPage", () => ({
    items: [],
    total: 0,
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,
    canAssign: false,

    showForm: false,
    saving: false,
    formError: "",
    formTab: "data",
    form: emptyForm(),

    users: [],
    vehicles: [],

    assignments: [],
    assignError: "",
    newAssign: { vehicleId: "", startDate: "", notes: "" },
    finishingId: "",
    finishDate: "",

    confirmId: "",
    confirmName: "",

    async init() {
      this.canWrite = userHasPermission("drivers.write");
      this.canAssign = userHasPermission("drivers.assign_vehicle");
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
        const data = await apiFetch(`/drivers?${params.toString()}`);
        this.items = data.items;
        this.total = data.total;
      } catch (e) {
        this.error = e.message || "Erro ao carregar motoristas";
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

    formatCpfDisplay(value) {
      return maskCpfInput(value);
    },

    onCpfInput(event) {
      this.form.cpf = maskCpfInput(event.target.value);
    },

    formatDate(iso) {
      if (!iso) return "—";
      const s = String(iso).slice(0, 10);
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    },

    activeAssignmentLabel(driver) {
      const open = (driver.assignments || []).find((a) => !a.endDate);
      return open?.vehicle?.plate || "—";
    },

    async openNew() {
      this.form = emptyForm();
      this.formError = "";
      this.formTab = "data";
      this.assignments = [];
      await this.loadUsersAndVehicles();
      this.showForm = true;
    },

    async openEdit(d) {
      this.form = {
        id: d.id,
        userId: d.userId || "",
        name: d.name,
        birthDate: toISODate(d.birthDate),
        cpf: maskCpfInput(d.cpf),
        licenseNumber: d.licenseNumber,
        licenseIssueDate: toISODate(d.licenseIssueDate),
        licenseExpiryDate: toISODate(d.licenseExpiryDate),
        active: d.active,
      };
      this.formError = "";
      this.formTab = "data";
      await this.loadUsersAndVehicles();
      await this.loadAssignments(d.id);
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    async loadUsersAndVehicles() {
      try {
        const [users, vehicles] = await Promise.all([
          apiFetch(`/users`).catch(() => []),
          apiFetch(`/vehicles?take=500&sort=plate&order=asc`),
        ]);
        this.users = Array.isArray(users) ? users : [];
        this.vehicles = (vehicles?.items || []).filter((v) => v.active);
      } catch {
        // sem permissão para listar usuários, segue só veículos
        this.users = [];
      }
    },

    async loadAssignments(driverId) {
      this.assignError = "";
      try {
        this.assignments = await apiFetch(
          `/drivers/${driverId}/assignments`,
        );
      } catch (e) {
        this.assignError = e.message || "Erro ao carregar vínculos";
      }
    },

    hasOpenAssignment() {
      return (this.assignments || []).some((a) => !a.endDate);
    },

    async addAssignment() {
      this.assignError = "";
      if (!this.form.id) return;
      if (!this.newAssign.vehicleId) {
        this.assignError = "Selecione um veículo";
        return;
      }
      if (!this.newAssign.startDate) {
        this.assignError = "Informe a data inicial";
        return;
      }
      try {
        await apiFetch(`/drivers/${this.form.id}/assignments`, {
          method: "POST",
          body: JSON.stringify({
            vehicleId: this.newAssign.vehicleId,
            startDate: this.newAssign.startDate,
            notes: this.newAssign.notes || undefined,
          }),
        });
        this.newAssign = { vehicleId: "", startDate: "", notes: "" };
        await this.loadAssignments(this.form.id);
      } catch (e) {
        this.assignError = e.message || "Erro ao vincular";
      }
    },

    startFinish(a) {
      this.finishingId = a.id;
      this.finishDate = toISODate(new Date().toISOString());
    },

    cancelFinish() {
      this.finishingId = "";
      this.finishDate = "";
    },

    async confirmFinish() {
      if (!this.form.id || !this.finishingId || !this.finishDate) return;
      try {
        await apiFetch(
          `/drivers/${this.form.id}/assignments/${this.finishingId}/finish`,
          {
            method: "PATCH",
            body: JSON.stringify({ endDate: this.finishDate }),
          },
        );
        this.cancelFinish();
        await this.loadAssignments(this.form.id);
      } catch (e) {
        this.assignError = e.message || "Erro ao finalizar";
      }
    },

    async deleteAssignment(a) {
      if (!confirm("Excluir este vínculo?")) return;
      try {
        await apiFetch(
          `/drivers/${this.form.id}/assignments/${a.id}`,
          { method: "DELETE" },
        );
        await this.loadAssignments(this.form.id);
      } catch (e) {
        this.assignError = e.message || "Erro ao excluir vínculo";
      }
    },

    async save() {
      this.saving = true;
      this.formError = "";
      const cpfDigits = (this.form.cpf || "").replace(/\D+/g, "");
      const payload = {
        userId: this.form.userId || null,
        name: this.form.name,
        birthDate: this.form.birthDate,
        cpf: cpfDigits,
        licenseNumber: this.form.licenseNumber,
        licenseIssueDate: this.form.licenseIssueDate,
        licenseExpiryDate: this.form.licenseExpiryDate,
        active: !!this.form.active,
      };
      try {
        let saved;
        if (this.form.id) {
          saved = await apiFetch(`/drivers/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          saved = await apiFetch(`/drivers`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          this.form.id = saved.id;
          await this.loadAssignments(saved.id);
        }
        await this.load();
        // Se acabou de criar, mantém aberto na aba de vínculos para o usuário
        if (!this.form.id) {
          this.showForm = false;
        }
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },

    askDelete(d) {
      this.confirmId = d.id;
      this.confirmName = d.name;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmName = "";
    },

    async confirmDelete() {
      const id = this.confirmId;
      this.confirmId = "";
      try {
        await apiFetch(`/drivers/${id}`, { method: "DELETE" });
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
    userId: "",
    name: "",
    birthDate: "",
    cpf: "",
    licenseNumber: "",
    licenseIssueDate: "",
    licenseExpiryDate: "",
    active: true,
  };
}
