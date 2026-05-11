import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const SORTABLE = ["name", "type", "host", "active"];

const DEFAULT_PORTS = {
  POSTGRES: 5432,
  MARIADB: 3306,
  ORACLE: 1521,
  SQLSERVER: 1433,
};

const TYPE_LABELS = {
  POSTGRES: "PostgreSQL",
  MARIADB: "MariaDB / MySQL",
  ORACLE: "Oracle",
  SQLSERVER: "SQL Server",
};

function emptyForm() {
  return {
    id: null,
    name: "",
    type: "ORACLE",
    host: "",
    port: DEFAULT_PORTS.ORACLE,
    databaseName: "",
    username: "",
    password: "",
    ssl: false,
    active: true,
    extraText: "",
    keepPassword: true,
  };
}

export function registerConnectionsAlpine() {
  Alpine.data("connectionsPage", () => ({
    items: [],
    loading: false,
    error: "",

    q: "",
    sort: "name",
    order: "asc",

    canWrite: false,

    showForm: false,
    saving: false,
    formError: "",
    form: emptyForm(),

    testing: false,
    testResult: null,

    rowTesting: "",
    rowTestResult: null,

    confirmId: "",
    confirmLabel: "",

    typeLabels: TYPE_LABELS,
    typeOptions: Object.keys(TYPE_LABELS),

    async init() {
      this.canWrite = userHasPermission("datasources.write");
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.items = await apiFetch("/data-sources");
        this.applySort();
      } catch (e) {
        this.error = e.message || "Erro ao carregar conexões";
      } finally {
        this.loading = false;
      }
    },

    typeLabel(t) {
      return TYPE_LABELS[t] || t;
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

    sortIndicator(field) {
      if (this.sort !== field) return "";
      return this.order === "asc" ? "▲" : "▼";
    },

    applySort() {
      const dir = this.order === "asc" ? 1 : -1;
      const items = [...this.items];
      items.sort((a, b) => {
        const av = a[this.sort];
        const bv = b[this.sort];
        if (typeof av === "boolean") {
          return ((av === bv ? 0 : av ? 1 : -1)) * dir;
        }
        const as = (av ?? "").toString().toLowerCase();
        const bs = (bv ?? "").toString().toLowerCase();
        if (as < bs) return -1 * dir;
        if (as > bs) return 1 * dir;
        return 0;
      });
      this.items = items;
    },

    filtered() {
      const q = this.q.trim().toLowerCase();
      if (!q) return this.items;
      return this.items.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.host?.toLowerCase().includes(q) ||
          it.databaseName?.toLowerCase().includes(q) ||
          it.username?.toLowerCase().includes(q) ||
          (TYPE_LABELS[it.type] || "").toLowerCase().includes(q),
      );
    },

    onTypeChange() {
      const def = DEFAULT_PORTS[this.form.type];
      if (def) {
        this.form.port = def;
      }
    },

    openCreate() {
      if (!this.canWrite) return;
      this.form = emptyForm();
      this.formError = "";
      this.testResult = null;
      this.showForm = true;
    },

    openEdit(item) {
      if (!this.canWrite) return;
      this.form = {
        id: item.id,
        name: item.name,
        type: item.type,
        host: item.host,
        port: item.port,
        databaseName: item.databaseName,
        username: item.username,
        password: "",
        ssl: !!item.ssl,
        active: !!item.active,
        extraText: item.extra ? JSON.stringify(item.extra, null, 2) : "",
        keepPassword: true,
      };
      this.formError = "";
      this.testResult = null;
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
      this.form = emptyForm();
      this.testResult = null;
    },

    parseExtra() {
      const txt = (this.form.extraText || "").trim();
      if (!txt) return null;
      try {
        const v = JSON.parse(txt);
        if (typeof v !== "object" || v === null || Array.isArray(v)) {
          throw new Error("JSON deve ser um objeto");
        }
        return v;
      } catch (e) {
        throw new Error(`Campo "Avançado" inválido: ${e.message}`);
      }
    },

    buildPayload({ requirePassword }) {
      const payload = {
        name: this.form.name.trim(),
        type: this.form.type,
        host: this.form.host.trim(),
        port: Number(this.form.port),
        databaseName: this.form.databaseName.trim(),
        username: this.form.username.trim(),
        ssl: !!this.form.ssl,
        active: !!this.form.active,
      };
      if (!payload.name) throw new Error("Informe o nome");
      if (!payload.host) throw new Error("Informe o servidor (host)");
      if (!Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535) {
        throw new Error("Porta inválida");
      }
      if (!payload.username) throw new Error("Informe o usuário");

      const extra = this.parseExtra();
      if (extra) payload.extra = extra;

      const pwd = this.form.password;
      if (requirePassword && !pwd) {
        throw new Error("Informe a senha");
      }
      if (pwd) payload.password = pwd;

      return payload;
    },

    async testCurrent() {
      this.testResult = null;
      this.formError = "";
      this.testing = true;
      try {
        let pwd = this.form.password;
        if (!pwd && this.form.id && this.form.keepPassword) {
          const r = await apiFetch(`/data-sources/${this.form.id}/test`, {
            method: "POST",
          });
          this.testResult = r;
          return;
        }
        const payload = this.buildPayload({ requirePassword: !this.form.id });
        if (!payload.password) {
          throw new Error(
            "Para testar uma conexão nova/alterada, informe a senha.",
          );
        }
        const r = await apiFetch("/data-sources/test", {
          method: "POST",
          body: JSON.stringify({
            type: payload.type,
            host: payload.host,
            port: payload.port,
            databaseName: payload.databaseName,
            username: payload.username,
            password: payload.password,
            ssl: payload.ssl,
            extra: payload.extra,
          }),
        });
        this.testResult = r;
      } catch (e) {
        this.testResult = { ok: false, error: e.message || String(e) };
      } finally {
        this.testing = false;
      }
    },

    async testRow(item) {
      this.rowTesting = item.id;
      this.rowTestResult = null;
      try {
        const r = await apiFetch(`/data-sources/${item.id}/test`, {
          method: "POST",
        });
        this.rowTestResult = { id: item.id, ...r };
      } catch (e) {
        this.rowTestResult = { id: item.id, ok: false, error: e.message };
      } finally {
        this.rowTesting = "";
      }
    },

    async save() {
      this.formError = "";
      this.saving = true;
      try {
        if (this.form.id) {
          const payload = this.buildPayload({ requirePassword: false });
          await apiFetch(`/data-sources/${this.form.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          const payload = this.buildPayload({ requirePassword: true });
          await apiFetch("/data-sources", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        this.closeForm();
        await this.load();
      } catch (e) {
        this.formError = e.message || "Erro ao guardar";
      } finally {
        this.saving = false;
      }
    },

    askDelete(item) {
      if (!this.canWrite) return;
      this.confirmId = item.id;
      this.confirmLabel = item.name;
    },

    cancelDelete() {
      this.confirmId = "";
      this.confirmLabel = "";
    },

    async confirmDelete() {
      if (!this.confirmId) return;
      try {
        await apiFetch(`/data-sources/${this.confirmId}`, { method: "DELETE" });
        this.cancelDelete();
        await this.load();
      } catch (e) {
        this.error = e.message || "Erro ao excluir";
        this.cancelDelete();
      }
    },
  }));
}
