import Alpine from "alpinejs";
import { apiFetch, userHasPermission } from "../auth/http.js";

const DEFAULT_SLUG = "producao-milho";

export function slugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug")?.trim() || DEFAULT_SLUG;
}

function reportMetaFromList(reports, slug) {
  return reports.find((r) => r.slug === slug) || null;
}

function syncPageTitle(name) {
  const title = name ? `${name} | Relatórios | Agrigestão` : "Relatórios | Agrigestão";
  document.title = title;
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
      const slug = slugFromUrl();
      try {
        this.reports = await apiFetch("/reports");
      } catch {
        this.reports = [];
      }
      const meta = reportMetaFromList(this.reports, slug);
      this.selected = meta || { slug, name: slug };
      syncPageTitle(meta?.name);
      await this.run();
    },

    async run() {
      const slug = slugFromUrl();
      if (!slug) {
        this.runError = "Nenhum relatório disponível para o seu perfil.";
        return;
      }
      const meta = reportMetaFromList(this.reports, slug);
      this.selected = { slug, name: meta?.name || this.selected?.name || slug };
      syncPageTitle(this.selected.name);

      this.running = true;
      this.runError = "";
      this.html = "";
      try {
        const res = await apiFetch(
          `/reports/${encodeURIComponent(slug)}/run`,
          { method: "POST" },
        );
        this.html = res.html || "";
        this.generatedAt = res.generatedAt || "";
        this.rowCount = typeof res.rowCount === "number" ? res.rowCount : null;
        if (res.name) {
          this.selected = { slug: res.slug || slug, name: res.name };
          syncPageTitle(res.name);
        }
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
