/**
 * Renderiza o HTML do relatório portado de jarvis_report.
 */
import { EstoqueInsumosData } from './estoque-insumos.aggregator';

export function renderEstoqueInsumos(
  data: EstoqueInsumosData,
  generatedAt: string,
): string {
  return `<!DOCTYPE html>
<!-- jarvis-bundled-report:estoque-insumos-franciosi jarvis-pdf-landscape -->
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Estoque de Insumos · Grupo Franciosi</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --azul-royal: #1e5fa8;
    --azul-profundo: #164a85;
    --azul-medio: #2d8fb8;
    --turquesa: #3ec1c8;
    --turquesa-claro: #7dd3d8;
    --verde-logo: #3eb049;
    --verde-limao: #a8c437;
    --verde-medio: #4eaa6a;
    --verde-suave: #d4e8c2;
    --creme: #f5f7fa;
    --texto: #1f2937;
    --texto-suave: #6b7280;
    --branco: #ffffff;
    --alerta: #d97706;
    --borda-suave: rgba(30, 95, 168, 0.1);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: var(--creme); color: var(--texto);
    min-height: 100vh; padding: 40px 24px;
    background-image:
      radial-gradient(circle at 10% 0%, rgba(62, 193, 200, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 90% 100%, rgba(30, 95, 168, 0.06) 0%, transparent 40%);
  }
  .container { max-width: 1320px; margin: 0 auto; }

  /* HEADER */
  .header {
    position: relative;
    background: linear-gradient(135deg, var(--azul-profundo) 0%, var(--azul-royal) 60%, var(--azul-medio) 100%);
    border-radius: 24px;
    margin-bottom: 48px;
    color: white; overflow: hidden;
    box-shadow: 0 20px 60px -20px rgba(30, 74, 133, 0.5);
  }
  .header-inner { padding: 48px 56px 40px; position: relative; z-index: 2; }
  .header::before {
    content: ''; position: absolute; top: -30%; right: -10%;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(62, 193, 200, 0.25) 0%, transparent 65%);
    border-radius: 50%; z-index: 0;
  }
  .header::after {
    content: ''; position: absolute; bottom: -50%; left: -5%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(168, 196, 55, 0.15) 0%, transparent 60%);
    border-radius: 50%; z-index: 0;
  }
  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 36px; flex-wrap: wrap; gap: 20px;
  }
  .brand {
    display: flex; align-items: center; gap: 16px;
    background: rgba(255, 255, 255, 0.97);
    padding: 14px 22px 14px 18px; border-radius: 14px;
    box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.25);
  }
  .brand-logo { width: 56px; height: 56px; object-fit: contain; }
  .brand-text {
    display: flex; flex-direction: column;
    border-left: 2px solid rgba(30, 95, 168, 0.15);
    padding-left: 16px;
  }
  .brand-text-line1 {
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--azul-royal);
  }
  .brand-text-line2 {
    font-size: 18px; font-weight: 800; color: var(--azul-profundo);
    letter-spacing: 1px; margin-top: 2px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(10px);
    padding: 9px 18px; border-radius: 100px;
    font-size: 11px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase;
    border: 1px solid rgba(255, 255, 255, 0.2); color: white;
  }
  .badge-dot {
    width: 7px; height: 7px;
    background: var(--verde-limao); border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(168, 196, 55, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 4px rgba(168, 196, 55, 0.3); }
    50%      { box-shadow: 0 0 0 9px rgba(168, 196, 55, 0.05); }
  }
  .header h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 54px; font-weight: 500; line-height: 1.05;
    margin-bottom: 14px; letter-spacing: -0.5px;
  }
  .header h1 em { font-style: italic; color: var(--turquesa-claro); font-weight: 400; }
  .header-subtitle {
    font-size: 16px; font-weight: 300; opacity: 0.9;
    max-width: 720px; line-height: 1.6;
  }
  .tag-divider {
    width: 100%; height: 56px; display: block;
    background-image: url('https://vps.metasafra.com.br/grupo_franciosi/tag.png');
    background-size: cover; background-position: center; background-repeat: no-repeat;
  }
  .header-stats-wrapper {
    background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 100%);
    padding: 32px 56px 36px; position: relative; z-index: 2;
  }
  .header-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
  .header-stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 44px; font-weight: 500; line-height: 1;
    color: var(--turquesa-claro);
  }
  .header-stat-label {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 2px; opacity: 0.85; margin-top: 8px; color: white;
  }

  /* SEÇÕES */
  .section-header {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 24px; margin-top: 8px;
  }
  .section-line {
    flex: 1; height: 2px;
    background: linear-gradient(90deg,
      var(--turquesa) 0%, var(--azul-royal) 25%, var(--verde-limao) 50%,
      var(--verde-medio) 75%, transparent 100%);
    border-radius: 2px;
  }
  .section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 3px;
    text-transform: uppercase; color: var(--azul-royal);
  }
  .section-counter {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px; color: var(--texto-suave); font-style: italic;
  }

  /* CARDS POR GRUPO */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
    gap: 24px; margin-bottom: 48px;
  }
  .card {
    background: var(--branco); border-radius: 20px; padding: 32px 28px;
    position: relative; overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 20px -8px rgba(30, 95, 168, 0.1);
  }
  .card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
  }
  .card-defensivos::before    { background: linear-gradient(90deg, #d97706, #f59e0b); }
  .card-fertilizantes::before { background: linear-gradient(90deg, var(--verde-logo), var(--verde-limao)); }
  .card-sementes::before      { background: linear-gradient(90deg, var(--azul-royal), var(--turquesa)); }
  .card-outros::before        { background: linear-gradient(90deg, var(--texto-suave), #9ca3af); }
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px -16px rgba(30, 95, 168, 0.25);
  }
  .card-icon-wrapper {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px;
  }
  .card-defensivos .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(245, 158, 11, 0.1));
    color: var(--alerta);
  }
  .card-fertilizantes .card-icon-wrapper {
    background: linear-gradient(135deg, var(--verde-suave), rgba(168, 196, 55, 0.2));
    color: var(--verde-medio);
  }
  .card-sementes .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.12), rgba(62, 193, 200, 0.15));
    color: var(--azul-royal);
  }
  .card-outros .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(156, 163, 175, 0.1));
    color: var(--texto-suave);
  }
  .card-icon-wrapper svg { width: 24px; height: 24px; }
  .card-sector {
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--texto-suave); margin-bottom: 6px;
  }
  .card-title {
    font-size: 20px; font-weight: 700; color: var(--azul-profundo);
    margin-bottom: 20px; line-height: 1.2;
  }
  .card-metrics {
    display: flex; flex-direction: column; gap: 12px;
    padding-top: 18px; border-top: 1px dashed var(--borda-suave);
  }
  .metric-row {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  }
  .metric-label-sm {
    font-size: 11px; font-weight: 600; color: var(--texto-suave);
    text-transform: uppercase; letter-spacing: 1.5px;
  }
  .metric-value-lg {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 600; color: var(--azul-profundo); line-height: 1;
  }
  .metric-value-md {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px; font-weight: 600; color: var(--verde-medio); line-height: 1;
  }
  .card-defensivos .metric-value-md { color: var(--alerta); }
  .card-sementes .metric-value-md { color: var(--azul-royal); }
  .card-outros .metric-value-md { color: var(--texto-suave); }
  .metric-unit {
    font-size: 10px; font-weight: 700; color: var(--texto-suave);
    margin-left: 4px; letter-spacing: 1px;
  }

  /* TABELA PIVOT */
  .table-wrapper {
    background: var(--branco); border-radius: 20px; padding: 32px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 20px -8px rgba(30, 95, 168, 0.1);
  }

  /* FILTRO */
  .filter-bar {
    display: flex; align-items: center; gap: 14px;
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.04), rgba(62, 193, 200, 0.04));
    border: 1px solid var(--borda-suave); border-radius: 14px;
    padding: 10px 16px; margin-bottom: 24px;
    transition: all 0.2s ease;
  }
  .filter-bar:focus-within {
    border-color: var(--turquesa);
    box-shadow: 0 0 0 4px rgba(62, 193, 200, 0.12);
    background: rgba(255,255,255,0.7);
  }
  .filter-icon {
    width: 20px; height: 20px;
    color: var(--azul-royal); flex-shrink: 0;
  }
  .filter-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-family: 'Inter', sans-serif;
    font-size: 14px; font-weight: 500; color: var(--texto);
    padding: 6px 0;
  }
  .filter-input::placeholder {
    color: var(--texto-suave); font-weight: 400;
  }
  .filter-clear {
    background: rgba(30, 95, 168, 0.08); border: none;
    color: var(--azul-royal); cursor: pointer;
    padding: 6px 12px; border-radius: 100px;
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; transition: all 0.2s;
    display: none;
  }
  .filter-clear:hover { background: rgba(30, 95, 168, 0.15); }
  .filter-clear.visible { display: inline-flex; align-items: center; gap: 6px; }
  .filter-count {
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--texto-suave);
    white-space: nowrap;
  }
  .filter-count strong { color: var(--azul-royal); font-weight: 800; }
  .no-results {
    display: none; padding: 40px 20px; text-align: center;
    color: var(--texto-suave); font-size: 14px;
    background: rgba(30, 95, 168, 0.03);
  }
  .no-results.visible { display: block; }
  .table-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
  }
  .table-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px; font-weight: 600; color: var(--azul-profundo); line-height: 1.2;
  }
  .table-subtitle {
    font-size: 12px; color: var(--texto-suave); margin-top: 4px;
  }
  .table-legend {
    display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
  }
  .legend-item {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; color: var(--texto-suave);
    letter-spacing: 1px; text-transform: uppercase;
  }
  .legend-pill {
    display: inline-block; padding: 3px 9px; border-radius: 6px;
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
  }

  .table-scroll {
    overflow-x: auto; border-radius: 12px;
    border: 1px solid var(--borda-suave);
  }
  table.pivot {
    width: 100%; border-collapse: collapse; font-size: 12.5px;
    min-width: 900px;
  }
  table.pivot thead th {
    background: linear-gradient(135deg, var(--azul-profundo), var(--azul-royal));
    color: white; padding: 13px 14px; text-align: left;
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; white-space: nowrap;
    position: sticky; top: 0; z-index: 2;
  }
  table.pivot thead th.th-fazenda,
  table.pivot thead th.th-total { text-align: right; }
  table.pivot thead th.th-total {
    background: linear-gradient(135deg, var(--verde-medio), var(--verde-logo));
  }

  tr.row-grupo td {
    padding: 14px 16px;
    border-top: 2px solid var(--borda-suave);
    border-bottom: 1px solid var(--borda-suave);
  }
  tr.row-grupo.grupo-defensivos td {
    background: linear-gradient(90deg, rgba(217, 119, 6, 0.1), rgba(217, 119, 6, 0.02));
  }
  tr.row-grupo.grupo-fertilizantes td {
    background: linear-gradient(90deg, rgba(62, 176, 73, 0.1), rgba(62, 176, 73, 0.02));
  }
  tr.row-grupo.grupo-sementes td {
    background: linear-gradient(90deg, rgba(30, 95, 168, 0.1), rgba(30, 95, 168, 0.02));
  }
  tr.row-grupo.grupo-outros td {
    background: linear-gradient(90deg, rgba(107, 114, 128, 0.1), rgba(107, 114, 128, 0.02));
  }
  .grupo-badge {
    font-size: 12px; font-weight: 800; letter-spacing: 2px;
    text-transform: uppercase; margin-right: 14px;
  }
  .grupo-defensivos .grupo-badge    { color: var(--alerta); }
  .grupo-fertilizantes .grupo-badge { color: var(--verde-medio); }
  .grupo-sementes .grupo-badge      { color: var(--azul-royal); }
  .grupo-outros .grupo-badge        { color: var(--texto-suave); }
  .grupo-info {
    font-size: 11px; color: var(--texto-suave); font-weight: 500;
    letter-spacing: 1px; text-transform: uppercase;
  }

  tr.row-subgrupo td {
    background: rgba(30, 95, 168, 0.03);
    padding: 8px 16px 8px 32px;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--azul-royal);
    border-bottom: 1px dashed var(--borda-suave);
  }

  tr.row-prod { transition: background 0.2s; }
  tr.row-prod:hover { background: rgba(62, 193, 200, 0.06); }
  tr.row-prod td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--borda-suave);
    vertical-align: middle;
  }
  .c-produto {
    font-weight: 600; color: var(--azul-profundo);
    padding-left: 32px !important;
    min-width: 220px;
  }
  .c-unid { text-align: center; width: 60px; }
  .unid-pill {
    display: inline-block; padding: 3px 8px; border-radius: 6px;
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
  }
  .u-kg { background: rgba(62, 193, 200, 0.18); color: #0f7682; }
  .u-lt { background: rgba(168, 196, 55, 0.2);  color: #6b7d18; }
  .u-un { background: rgba(217, 119, 6, 0.15);  color: var(--alerta); }
  .u-default { background: rgba(107, 114, 128, 0.15); color: var(--texto-suave); }

  .c-saldo {
    text-align: right; font-variant-numeric: tabular-nums;
    font-weight: 600; color: var(--texto); min-width: 110px;
  }
  .c-zero { color: rgba(107, 114, 128, 0.4); font-weight: 400; }
  .c-total-linha {
    background: rgba(62, 176, 73, 0.06);
    color: var(--verde-medio); font-weight: 700;
    border-left: 2px solid rgba(62, 176, 73, 0.25);
  }

  tr.row-total {
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.08), rgba(62, 193, 200, 0.06));
    border-top: 2px solid var(--azul-royal);
  }
  tr.row-total td {
    padding: 14px; font-weight: 700; color: var(--azul-profundo);
  }
  .tf-label {
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
    text-align: right; padding-right: 16px !important;
    padding-left: 32px !important;
  }
  .tf-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
  }
  .tf-total-geral {
    color: var(--verde-medio); font-size: 20px;
    border-left: 2px solid rgba(62, 176, 73, 0.4);
    background: rgba(62, 176, 73, 0.06);
  }

  .footer {
    margin-top: 56px; padding: 32px 40px;
    background: var(--branco); border-radius: 20px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 20px -8px rgba(30, 95, 168, 0.08);
  }
  .footer-content {
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 16px;
  }
  .footer-text { font-size: 13px; color: var(--texto-suave); }
  .footer-text strong { color: var(--azul-profundo); font-weight: 700; }
  .footer-meta { display: flex; gap: 20px; flex-wrap: wrap; }
  .footer-meta-item {
    font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--texto-suave);
  }

  @media (max-width: 768px) {
    body { padding: 20px 12px; }
    .header-inner { padding: 32px 24px 28px; }
    .header-stats-wrapper { padding: 24px 24px 28px; }
    .header h1 { font-size: 36px; }
    .header-stats { grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .header-stat-value { font-size: 32px; }
    .cards-grid { grid-template-columns: 1fr; }
    .tag-divider { height: 40px; }
    .brand { padding: 10px 16px 10px 14px; }
    .brand-logo { width: 44px; height: 44px; }
    .table-wrapper { padding: 20px 16px; }
    .table-title { font-size: 22px; }
  }

  /* PDF (Gotenberg emulatedMediaType: print) — layout compacto landscape */
  @media print {
    @page { size: A4 landscape; margin: 8mm; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      min-height: auto; padding: 0;
      background: #fff !important; background-image: none !important;
      font-size: 9px;
    }
    .container { max-width: none; width: 100%; }
    .header { margin-bottom: 10px; border-radius: 12px; box-shadow: none; page-break-inside: avoid; break-inside: avoid-page; }
    .header-inner { padding: 14px 18px 10px; }
    .header-top { margin-bottom: 12px; gap: 10px; }
    .brand { padding: 8px 12px; box-shadow: none; }
    .brand-logo { width: 40px; height: 40px; }
    .brand-text-line2 { font-size: 14px; }
    .badge { padding: 5px 10px; font-size: 9px; }
    .header h1 { font-size: 22px; margin-bottom: 6px; line-height: 1.1; }
    .header-subtitle { font-size: 9px !important; line-height: 1.35; max-width: none; margin-top: 4px !important; opacity: 1 !important; }
    .tag-divider { height: 28px; }
    .header-stats-wrapper { padding: 10px 18px 12px; }
    .header-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .header-stat-value { font-size: 20px; }
    .header-stat-label { font-size: 8px; margin-top: 4px; }
    .section-header { margin: 10px 0 8px; gap: 8px; page-break-after: avoid; }
    .section-label { font-size: 9px; letter-spacing: 2px; }
    .section-counter { font-size: 11px; }
    .cards-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid-page; }
    .card { padding: 12px 10px; border-radius: 10px; box-shadow: none; page-break-inside: avoid; break-inside: avoid-page; }
    .card-icon-wrapper { width: 32px; height: 32px; margin-bottom: 8px; }
    .card-icon-wrapper svg { width: 18px; height: 18px; }
    .card-title { font-size: 12px; margin-bottom: 8px; }
    .card-metrics { gap: 6px; padding-top: 8px; }
    .metric-value-lg { font-size: 16px; }
    .metric-value-md { font-size: 14px; }
    .metric-label-sm { font-size: 7px; }
    .table-wrapper { padding: 12px; box-shadow: none; border-radius: 10px; }
    .table-header { margin-bottom: 8px; }
    .table-title { font-size: 16px; }
    .table-subtitle { font-size: 8px; display: none; }
    .filter-bar { display: none !important; }
    .table-scroll { overflow: visible; border: none; }
    table.pivot { font-size: 7.5px; min-width: 0; table-layout: auto; }
    table.pivot thead { display: table-header-group; }
    table.pivot tfoot { display: table-footer-group; }
    table.pivot thead th { padding: 5px 4px; font-size: 6.5px; letter-spacing: 0.5px; line-height: 1.2; white-space: normal; vertical-align: bottom; position: static; }
    table.pivot tbody tr,
    table.pivot tfoot tr { page-break-inside: avoid; break-inside: avoid-page; }
    tr.row-prod td { padding: 4px 4px; }
    tr.row-grupo td { padding: 6px 4px; }
    tr.row-subgrupo td { padding: 4px 4px 4px 12px; font-size: 7px; }
    .c-produto { padding-left: 16px !important; min-width: 0; font-size: 7.5px; }
    .c-saldo { min-width: 0; }
    .unid-pill { font-size: 6.5px; padding: 1px 5px; }
    .grupo-badge { font-size: 8px; letter-spacing: 1px; margin-right: 8px; }
    .grupo-info { font-size: 7px; }
    tr.row-total td { padding: 6px 4px; }
    .tf-label { font-size: 7px; padding-left: 16px !important; padding-right: 8px !important; }
    .tf-num { font-size: 9px; }
    .tf-total-geral { font-size: 10px; }
    .footer { margin-top: 10px; padding: 10px 14px; border-radius: 8px; box-shadow: none; page-break-inside: avoid; }
    .footer-text { font-size: 8px; }
    .footer-meta-item { font-size: 7px; }
  }
</style>
</head>
<body>
<div class="container">

  <header class="header">
    <div class="header-inner">
      <div class="header-top">
        <div class="brand">
          <img src="https://vps.metasafra.com.br/grupo_franciosi/logo4.jpg" alt="Grupo Franciosi" class="brand-logo">
          <div class="brand-text">
            <span class="brand-text-line1">Grupo</span>
            <span class="brand-text-line2">FRANCIOSI</span>
          </div>
        </div>
        <div class="badge">
          <span class="badge-dot"></span>
          Estoque Atualizado
        </div>
      </div>

      <h1>Estoque de <em>Insumos</em><br>por Fazenda</h1>
      <p class="header-subtitle">
        Posição consolidada do estoque de defensivos, fertilizantes e sementes, organizada em tabela pivô com saldo por fazenda.
      </p>
      <p class="header-subtitle" style="margin-top:12px;font-size:14px;opacity:0.85">
        Gerado em ${generatedAt} · Oracle UNISYSTEM · Grupos: Defensivos, Fertilizantes, Sementes
      </p>
    </div>

    <div class="tag-divider" role="img" aria-label="Faixa decorativa Grupo Franciosi"></div>

    <div class="header-stats-wrapper">
      <div class="header-stats">
        <div>
          <div class="header-stat-value">${data.qtdProdutos}</div>
          <div class="header-stat-label">Produtos cadastrados</div>
        </div>
        <div>
          <div class="header-stat-value">${data.qtdFazendas}</div>
          <div class="header-stat-label">Fazendas</div>
        </div>
        <div>
          <div class="header-stat-value">${data.qtdGrupos}</div>
          <div class="header-stat-label">Grupos</div>
        </div>
        <div>
          <div class="header-stat-value">${data.qtdSaldos}</div>
          <div class="header-stat-label">Registros de saldo</div>
        </div>
      </div>
    </div>
  </header>

  <div class="section-header">
    <span class="section-label">Resumo por Grupo</span>
    <div class="section-line"></div>
    <span class="section-counter">${data.gruposLabel}</span>
  </div>

  <div class="cards-grid">
    ${data.cardsGruposHtml}
  </div>

  <div class="section-header">
    <span class="section-label">Tabela Pivô · Saldo por Fazenda</span>
    <div class="section-line"></div>
    <span class="section-counter">${data.linhasLabel}</span>
  </div>

  <div class="table-wrapper">
    <div class="table-header">
      <div>
        <div class="table-title">Estoque Detalhado por Produto e Fazenda</div>
        <div class="table-subtitle">Saldo agrupado por Grupo &gt; Subgrupo &gt; Produto · Cada fazenda em uma coluna</div>
      </div>
      <div class="table-legend">
        <div class="legend-item"><span class="legend-pill u-kg">KG</span> Quilogramas</div>
        <div class="legend-item"><span class="legend-pill u-lt">LT</span> Litros</div>
        <div class="legend-item"><span class="legend-pill u-un">UN</span> Unidades</div>
      </div>
    </div>

    <div class="filter-bar">
      <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" id="produto-filter" class="filter-input" placeholder="Filtrar por produto, grupo, subgrupo ou unidade (ex.: HERBICIDA, ABACUS, KG)..." autocomplete="off">
      <span class="filter-count" id="filter-count"><strong>${data.qtdProdutos}</strong> de ${data.qtdProdutos} produtos</span>
      <button type="button" class="filter-clear" id="filter-clear" title="Limpar filtro">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Limpar
      </button>
    </div>

    <div class="table-scroll">
      <table class="pivot">
        <thead>
          <tr>
            <th>Produto</th>
            <th style="text-align:center">Un.</th>
            ${data.theadFazendasHtml}
            <th class="th-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.tbodyHtml}
        </tbody>
        <tfoot>
          ${data.tfootHtml}
        </tfoot>
      </table>
      <div class="no-results" id="no-results">
        Nenhum produto encontrado com este filtro.
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-content">
      <div class="footer-text">
        <strong>Relatório de Estoque de Insumos</strong> · Sistema UNISYSTEM · Grupo Franciosi
      </div>
      <div class="footer-meta">
        <div class="footer-meta-item">Pivô por Fazenda</div>
        <div class="footer-meta-item">${generatedAt}</div>
      </div>
    </div>
  </footer>

</div>

<script>
(function() {
  const input    = document.getElementById('produto-filter');
  const clearBtn = document.getElementById('filter-clear');
  const counter  = document.getElementById('filter-count');
  const noResults= document.getElementById('no-results');
  const table    = document.querySelector('table.pivot');
  if (!table) return;
  const tbody    = table.querySelector('tbody');
  if (!tbody) return;

  const allProdRows  = Array.from(tbody.querySelectorAll('tr.row-prod'));
  const groupRows    = Array.from(tbody.querySelectorAll('tr.row-grupo'));
  const subgrupoRows = Array.from(tbody.querySelectorAll('tr.row-subgrupo'));
  const totalProdutos = allProdRows.length;

  function normalize(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function applyFilter() {
    const q = normalize(input.value.trim());
    const tokens = q.split(/\s+/).filter(Boolean);
    let visibleCount = 0;
    const visibleGruposSubs = new Set();

    allProdRows.forEach(row => {
      const text = normalize(row.dataset.search || '');
      const match = tokens.length === 0 || tokens.every(t => text.includes(t));
      row.style.display = match ? '' : 'none';
      if (match) {
        visibleCount++;
        visibleGruposSubs.add(row.dataset.grupo);
        visibleGruposSubs.add(row.dataset.grupo + '||' + row.dataset.subgrupo);
      }
    });

    groupRows.forEach(r => {
      r.style.display = visibleGruposSubs.has(r.dataset.grupo) ? '' : 'none';
    });
    subgrupoRows.forEach(r => {
      const key = r.dataset.grupo + '||' + r.dataset.subgrupo;
      r.style.display = visibleGruposSubs.has(key) ? '' : 'none';
    });

    counter.innerHTML = '<strong>' + visibleCount + '</strong> de ' + totalProdutos + ' produtos';
    clearBtn.classList.toggle('visible', q.length > 0);
    noResults.classList.toggle('visible', visibleCount === 0);
  }

  input.addEventListener('input', applyFilter);
  clearBtn.addEventListener('click', function() {
    input.value = '';
    input.focus();
    applyFilter();
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { input.value = ''; applyFilter(); }
  });
})();
</script>

</body>
</html>
`;
}
