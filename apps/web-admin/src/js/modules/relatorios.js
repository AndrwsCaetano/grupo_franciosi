import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const REPORT = {
  slug: "producao-milho",
  name: "Produção de Milho em Grãos",
};

export function registerRelatoriosAlpine() {
  Alpine.data("relatoriosPage", () => ({
    selected: REPORT,
    canExport: false,

    html: "",
    generatedAt: "",
    rowCount: null,
    running: false,
    runError: "",

    async init() {
      this.canExport = userHasPermission("reports.export");
      await this.run();
    },

    async run() {
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
      if (!this.html) {
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
