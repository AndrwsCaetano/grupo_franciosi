import Alpine from "alpinejs";
import ApexCharts from "apexcharts";
import flatpickr from "flatpickr";
import { Portuguese } from "flatpickr/dist/esm/l10n/pt.js";
import { apiFetch } from "../auth/http.js";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/** Datas locais em YYYY-MM-DD (evita deslocamento UTC de toISOString). */
function toIsoDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const today = new Date();
  const to = toIsoDateLocal(today);
  const from = toIsoDateLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  return { from, to };
}

function formatIsoToBr(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatMonthLabel(iso) {
  // iso = "YYYY-MM"
  const [y, m] = iso.split("-");
  const mIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTH_LABELS[mIdx]}/${y.slice(2)}`;
}

function plateLabel(v) {
  const meta = [v.brand, v.model].filter(Boolean).join(" ");
  return meta ? `${v.plate} (${meta})` : v.plate;
}

export function registerFuelingDashboardAlpine() {
  Alpine.data("fuelingDashboardPage", () => ({
    loading: false,
    error: "",

    drivers: [],
    vehicles: [],

    filters: {
      from: "",
      to: "",
      driverId: "",
      vehicleId: "",
    },

    kpis: {
      totalLiters: 0,
      count: 0,
      avgLitersPerFueling: 0,
      uniqueDrivers: 0,
      uniqueVehicles: 0,
      totalKm: 0,
    },
    monthly: [],
    topVehicles: [],
    topDrivers: [],

    _charts: {
      monthly: null,
      topVehicles: null,
      topDrivers: null,
    },
    _fpFrom: null,
    _fpTo: null,

    openFromPicker() {
      this._fpFrom?.open();
    },

    openToPicker() {
      this._fpTo?.open();
    },

    mountDatePickers() {
      if (this._fpFrom) {
        this._fpFrom.destroy();
        this._fpFrom = null;
      }
      if (this._fpTo) {
        this._fpTo.destroy();
        this._fpTo = null;
      }
      const fromEl = this.$refs.dashDateFrom;
      const toEl = this.$refs.dashDateTo;
      if (!fromEl || !toEl) return;

      const altInputClass =
        "dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-4 pr-11 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

      const base = {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d/m/Y",
        altInputPlaceholder: "dd/mm/aaaa",
        altInputClass,
        locale: Portuguese,
        allowInput: true,
        disableMobile: true,
        clickOpens: true,
        monthSelectorType: "dropdown",
        appendTo: document.body,
      };

      this._fpFrom = flatpickr(fromEl, {
        ...base,
        defaultDate: this.filters.from,
        onChange: (_dates, str) => {
          this.filters.from = str;
        },
      });

      this._fpTo = flatpickr(toEl, {
        ...base,
        defaultDate: this.filters.to,
        onChange: (_dates, str) => {
          this.filters.to = str;
        },
      });
    },

    async init() {
      const range = defaultRange();
      this.filters.from = range.from;
      this.filters.to = range.to;
      try {
        const [vRes, dRes] = await Promise.all([
          apiFetch("/vehicles?take=500&sort=plate&order=asc"),
          apiFetch("/drivers?take=500&sort=name&order=asc"),
        ]);
        this.vehicles = vRes.items || [];
        this.drivers = dRes.items || [];
      } catch (e) {
        this.error = e.message || "Erro ao carregar listas de filtro";
      }
      await this.$nextTick();
      this.mountDatePickers();
      await this.loadStats();
    },

    resetFilters() {
      const range = defaultRange();
      this.filters = {
        from: range.from,
        to: range.to,
        driverId: "",
        vehicleId: "",
      };
      if (this._fpFrom) this._fpFrom.setDate(range.from, false);
      if (this._fpTo) this._fpTo.setDate(range.to, false);
      this.loadStats();
    },

    async loadStats() {
      this.loading = true;
      this.error = "";
      try {
        const params = new URLSearchParams();
        if (this.filters.from) params.set("from", this.filters.from);
        if (this.filters.to) params.set("to", this.filters.to);
        if (this.filters.driverId) params.set("driverId", this.filters.driverId);
        if (this.filters.vehicleId) params.set("vehicleId", this.filters.vehicleId);

        const data = await apiFetch(`/fuelings/stats?${params.toString()}`);
        this.kpis = data.kpis;
        this.monthly = data.monthly || [];
        this.topVehicles = data.topVehicles || [];
        this.topDrivers = data.topDrivers || [];
        this.$nextTick(() => this.renderCharts());
      } catch (e) {
        this.error = e.message || "Erro ao carregar estatísticas";
      } finally {
        this.loading = false;
      }
    },

    renderCharts() {
      this.renderMonthlyChart();
      this.renderTopVehiclesChart();
      this.renderTopDriversChart();
    },

    renderMonthlyChart() {
      const el = document.querySelector("#chart-monthly");
      if (!el) return;
      if (this._charts.monthly) {
        this._charts.monthly.destroy();
        this._charts.monthly = null;
      }
      if (!this.monthly.length) {
        el.innerHTML = "";
        return;
      }
      const categories = this.monthly.map((m) => formatMonthLabel(m.month));
      const liters = this.monthly.map((m) => Number(m.liters || 0));
      const counts = this.monthly.map((m) => Number(m.count || 0));

      const options = {
        series: [
          { name: "Litros", type: "column", data: liters },
          { name: "Abastecimentos", type: "line", data: counts },
        ],
        chart: {
          height: 340,
          type: "line",
          fontFamily: "Outfit, sans-serif",
          toolbar: { show: false },
        },
        colors: ["#465fff", "#10b981"],
        stroke: { width: [0, 3], curve: "smooth" },
        plotOptions: {
          bar: { columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" },
        },
        dataLabels: { enabled: false },
        xaxis: { categories },
        yaxis: [
          {
            seriesName: "Litros",
            title: { text: "Litros" },
            labels: { formatter: (v) => formatNumberShort(v) + " L" },
          },
          {
            seriesName: "Abastecimentos",
            opposite: true,
            title: { text: "Abast." },
            labels: { formatter: (v) => Math.round(v) },
          },
        ],
        legend: {
          position: "top",
          horizontalAlign: "left",
          fontFamily: "Outfit",
          markers: { radius: 99 },
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (val, { seriesIndex }) => {
              if (seriesIndex === 0) return formatNumber(val) + " L";
              return Math.round(val);
            },
          },
        },
        grid: { borderColor: "rgba(148, 163, 184, 0.18)" },
      };
      this._charts.monthly = new ApexCharts(el, options);
      this._charts.monthly.render();
    },

    renderTopVehiclesChart() {
      const el = document.querySelector("#chart-top-vehicles");
      if (!el) return;
      if (this._charts.topVehicles) {
        this._charts.topVehicles.destroy();
        this._charts.topVehicles = null;
      }
      if (!this.topVehicles.length) {
        el.innerHTML = "";
        return;
      }
      const ordered = [...this.topVehicles].sort((a, b) => a.liters - b.liters);
      const options = {
        series: [{ name: "Litros", data: ordered.map((v) => Number(v.liters || 0)) }],
        chart: {
          height: 380,
          type: "bar",
          fontFamily: "Outfit, sans-serif",
          toolbar: { show: false },
        },
        colors: ["#465fff"],
        plotOptions: {
          bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
        },
        dataLabels: { enabled: true, formatter: (v) => formatNumberShort(v) + " L" },
        xaxis: { categories: ordered.map(plateLabel) },
        yaxis: { labels: { style: { fontSize: "12px" } } },
        legend: { show: false },
        tooltip: {
          y: { formatter: (val) => formatNumber(val) + " L" },
        },
        grid: { borderColor: "rgba(148, 163, 184, 0.18)" },
      };
      this._charts.topVehicles = new ApexCharts(el, options);
      this._charts.topVehicles.render();
    },

    renderTopDriversChart() {
      const el = document.querySelector("#chart-top-drivers");
      if (!el) return;
      if (this._charts.topDrivers) {
        this._charts.topDrivers.destroy();
        this._charts.topDrivers = null;
      }
      if (!this.topDrivers.length) {
        el.innerHTML = "";
        return;
      }
      const ordered = [...this.topDrivers].sort((a, b) => a.liters - b.liters);
      const options = {
        series: [{ name: "Litros", data: ordered.map((d) => Number(d.liters || 0)) }],
        chart: {
          height: 380,
          type: "bar",
          fontFamily: "Outfit, sans-serif",
          toolbar: { show: false },
        },
        colors: ["#10b981"],
        plotOptions: {
          bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
        },
        dataLabels: { enabled: true, formatter: (v) => formatNumberShort(v) + " L" },
        xaxis: { categories: ordered.map((d) => d.name) },
        yaxis: { labels: { style: { fontSize: "12px" } } },
        legend: { show: false },
        tooltip: {
          y: { formatter: (val) => formatNumber(val) + " L" },
        },
        grid: { borderColor: "rgba(148, 163, 184, 0.18)" },
      };
      this._charts.topDrivers = new ApexCharts(el, options);
      this._charts.topDrivers.render();
    },

    formatLiters(v) {
      const n = Number(v || 0);
      return formatNumber(n) + " L";
    },
    formatKm(v) {
      const n = Number(v || 0);
      return formatNumber(Math.round(n)) + " km";
    },
    formatInt(v) {
      return formatNumber(Number(v || 0), 0);
    },
    periodLabel() {
      const f = formatIsoToBr(this.filters.from);
      const t = formatIsoToBr(this.filters.to);
      return `${f} → ${t}`;
    },
  }));
}

function formatNumber(value, fractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value || 0));
}

function formatNumberShort(value) {
  const v = Number(value || 0);
  if (v >= 1000) {
    return formatNumber(v / 1000, 1) + "k";
  }
  return formatNumber(v, 0);
}
