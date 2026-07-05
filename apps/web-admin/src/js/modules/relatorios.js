import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const DEFAULT_SLUG = "producao-milho";

function slugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug")?.trim() || DEFAULT_SLUG;
}

export function registerRelatoriosAlpine() {
  Alpine.data("relatoriosPage", () => ({
    reports: [],
    selected: null,
    canExport: false,

    html: "",
    generatedAt: "",
    rowCount: null,
    running: false,
    runError: "",

    async init() {
      this.canExport = userHasPermission("reports.export");
      const wantedSlug = slugFromUrl();
      try {
        this.reports = await apiFetch("/reports");
      } catch {
        this.reports = [];
      }
      this.selected =
        this.reports.find((r) => r.slug === wantedSlug) ||
        this.reports[0] ||
        null;
      if (this.selected) {
        await this.run();
      }
    },

    async run() {
      if (!this.selected) {
        this.runError = "Nenhum relatório disponível para o seu perfil.";
        return;
      }
      this.running = true;
      this.runError = "";
      try {
        const res = await apiFetch(
          `/reports/${encodeURIComponent(this.selected.slug)}/run`,
          { method: "POST" },
        );
        this.html = res.html || "";
        this.generatedAt = res.generatedAt || "";
        this.rowCount = typeof res.rowCount === "number" ? res.rowCount : null;
      } catch (e) {
        this.runError = e.message || "Erro ao gerar o relatório";
      } finally {
        this.running = false;
      }
    },

    exportHtml() {
      if (!this.html || !this.selected) {
        return;
      }
      const blob = new Blob([this.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${this.selected.slug}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  }));
}
