/**
 * Renderiza o HTML (documento completo e autossuficiente) do relatório
 * "Produção de Milho (Franciosi TGA)", alinhado ao jarvis_report.
 */
import { ProducaoMilhoData } from './producao-milho.aggregator';

/** Formata a data de geração no padrão pt-BR (America/Sao_Paulo). */
export function formatGeneratedAt(date: Date): string {
  const dateFmt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const timeFmt = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}

export function renderProducaoMilho(
  data: ProducaoMilhoData,
  generatedAt: string,
): string {
  return `<!DOCTYPE html>
<!-- jarvis-bundled-report:estoque-milho-franciosi -->
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Produção de Milho · Grupo Franciosi</title>
<style>
  :root {
    --fs-scale: 1;
    --azul-royal: #1e5fa8;
    --azul-profundo: #164a85;
    --azul-medio: #2d8fb8;
    --turquesa: #3ec1c8;
    --turquesa-claro: #7dd3d8;
    --verde-logo: #3eb049;
    --verde-limao: #a8c437;
    --verde-medio: #4eaa6a;
    --verde-suave: #d4e8c2;
    --amarelo-milho: #f4c430;
    --amarelo-suave: #fff4cc;
    --creme: #f5f7fa;
    --texto: #1f2937;
    --texto-suave: #6b7280;
    --branco: #ffffff;
    --alerta: #d97706;
    --borda-suave: rgba(30, 95, 168, 0.1);
  }
  body:has(#fs-large:checked) { --fs-scale: 1.15; }
  body:has(#fs-xlarge:checked) { --fs-scale: 1.3; }

  .font-size-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: var(--branco);
    border: 1px solid var(--borda-suave);
    border-radius: 10px;
    box-shadow: 0 2px 8px -4px rgba(30, 95, 168, 0.12);
  }
  .font-size-controls-label {
    font-size: calc(13px * var(--fs-scale));
    font-weight: 700;
    color: var(--azul-profundo);
    margin-right: 4px;
  }
  .font-size-controls input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .font-size-controls label {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--borda-suave);
    background: var(--creme);
    font-size: calc(13px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .font-size-controls input:checked + label {
    background: var(--azul-royal);
    border-color: var(--azul-royal);
    color: white;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--creme);
    color: var(--texto);
    min-height: 100vh;
    padding: 20px 16px;
    background-image:
      radial-gradient(circle at 10% 0%, rgba(244, 196, 48, 0.10) 0%, transparent 40%),
      radial-gradient(circle at 90% 100%, rgba(30, 95, 168, 0.06) 0%, transparent 40%);
    -webkit-text-size-adjust: 100%;
  }
  .container { max-width: 1280px; margin: 0 auto; }

  .header {
    background: linear-gradient(135deg, var(--azul-profundo) 0%, var(--azul-royal) 60%, var(--azul-medio) 100%);
    border-radius: 14px;
    padding: 14px 22px;
    margin-bottom: 24px;
    color: white;
    box-shadow: 0 10px 30px -12px rgba(30, 74, 133, 0.45);
    max-height: 113px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.97);
    padding: 6px 12px 6px 8px;
    border-radius: 10px;
    box-shadow: 0 4px 12px -4px rgba(0,0,0,0.2);
    flex-shrink: 0;
  }
  .brand-logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    border-left: 2px solid rgba(30,95,168,0.15);
    padding-left: 10px;
  }
  .text-unit-small {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    letter-spacing: 1px;
  }
  .chart-desc {
    font-size: calc(14px * var(--fs-scale));
    color: var(--texto-suave);
    margin-bottom: 18px;
  }
  .empty-state-msg {
    text-align: center;
    padding: 16px;
    color: var(--texto-suave);
    font-size: calc(15px * var(--fs-scale));
  }
  .badge-status {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: calc(12px * var(--fs-scale));
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-status--ok {
    background: rgba(78, 170, 106, 0.15);
    color: var(--verde-medio);
  }
  .badge-status--pending {
    background: rgba(217, 119, 6, 0.12);
    color: var(--alerta);
  }

  .brand-text-line1 {
    font-size: calc(10px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .brand-text-line2 {
    font-size: calc(16px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    letter-spacing: 0.5px;
    line-height: 1;
    margin-top: 1px;
  }
  .header-title {
    font-size: calc(26px * var(--fs-scale));
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.3px;
  }
  .header-title em {
    font-style: normal;
    color: var(--amarelo-milho);
  }
  .header-right {
    text-align: right;
    flex-shrink: 0;
  }
  .header-date {
    font-size: calc(14px * var(--fs-scale));
    font-weight: 600;
    line-height: 1.35;
    opacity: 0.95;
  }
  .header-date-label {
    display: block;
    font-size: calc(11px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 2px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
    margin-top: 8px;
  }
  .section-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, var(--amarelo-milho), var(--azul-royal), var(--verde-limao), transparent);
  }
  .section-label {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .section-counter {
    font-size: calc(14px * var(--fs-scale));
    color: var(--texto-suave);
    font-style: italic;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .card {
    background: var(--branco);
    border-radius: 16px;
    padding: 20px 22px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 16px -8px rgba(30, 95, 168, 0.15);
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }
  .card-total::before { background: linear-gradient(90deg, var(--amarelo-milho), var(--verde-limao)); }
  .card-anterior::before { background: linear-gradient(90deg, var(--azul-medio), var(--azul-royal)); }
  .card-media-ha::before { background: linear-gradient(90deg, var(--verde-medio), var(--verde-logo)); }

  .card-label {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--texto-suave);
    margin-bottom: 8px;
  }
  .card-title {
    font-size: calc(16px * var(--fs-scale));
    font-weight: 700;
    color: var(--azul-profundo);
    margin-bottom: 14px;
    line-height: 1.25;
  }
  .card-value-main {
    font-size: calc(32px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1.05;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .card-value-unit {
    font-size: calc(13px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .card-value-secondary {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--borda-suave);
    font-size: calc(20px * var(--fs-scale));
    font-weight: 700;
    color: var(--verde-medio);
    font-variant-numeric: tabular-nums;
  }
  .card-cargas {
    margin-top: 8px;
    font-size: calc(13px * var(--fs-scale));
    color: var(--texto-suave);
    font-weight: 600;
  }

  .cards-grid-fazendas {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 28px;
  }
  .card-fazenda {
    padding: 16px 14px;
    min-width: 0;
  }
  .card-fazenda .card-title {
    font-size: calc(14px * var(--fs-scale));
    margin-bottom: 10px;
    line-height: 1.2;
    word-break: break-word;
  }
  .card-fazenda::before {
    background: linear-gradient(90deg, var(--azul-medio), var(--verde-limao));
  }
  .card-fazenda-stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
    padding: 6px 0;
    border-bottom: 1px dashed var(--borda-suave);
    font-size: calc(12px * var(--fs-scale));
  }
  .card-fazenda-stat:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .card-fazenda-stat--media {
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--borda-suave);
    border-bottom: none;
  }
  .card-fazenda-stat-label {
    color: var(--texto-suave);
    font-weight: 600;
    flex-shrink: 0;
    font-size: calc(11px * var(--fs-scale));
  }
  .card-fazenda-stat-value {
    font-weight: 700;
    color: var(--azul-profundo);
    text-align: right;
    font-variant-numeric: tabular-nums;
    min-width: 0;
  }
  .card-fazenda-pct {
    color: var(--verde-medio);
    font-weight: 600;
    font-size: calc(13px * var(--fs-scale));
  }
  .card-fazenda-media {
    font-size: calc(15px * var(--fs-scale));
    color: var(--verde-medio);
  }

  @media screen and (max-width: 1024px) and (min-width: 781px) {
    .cards-grid-fazendas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  .summary-row {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 2fr;
    gap: 16px;
    margin-bottom: 28px;
  }
  .summary-block {
    background: var(--branco);
    border-radius: 16px;
    padding: 20px 22px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 16px -8px rgba(30, 95, 168, 0.15);
  }
  .summary-block-title {
    font-size: calc(13px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--azul-royal);
    margin-bottom: 14px;
  }
  .summary-big-number {
    font-size: calc(52px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
  }
  .summary-big-label {
    margin-top: 6px;
    font-size: calc(14px * var(--fs-scale));
    color: var(--texto-suave);
    font-weight: 600;
  }

  .filial-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .filial-item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 16px;
    align-items: center;
    padding: 12px 14px;
    background: linear-gradient(135deg, rgba(244,196,48,0.08), rgba(168,196,55,0.05));
    border-radius: 10px;
    border-left: 4px solid var(--amarelo-milho);
  }
  .filial-name {
    font-size: calc(15px * var(--fs-scale));
    font-weight: 700;
    color: var(--azul-profundo);
  }
  .filial-peso {
    font-size: calc(18px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .filial-peso small {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 3px;
  }
  .filial-sc {
    font-size: calc(15px * var(--fs-scale));
    font-weight: 700;
    color: var(--verde-medio);
    font-variant-numeric: tabular-nums;
    text-align: right;
    min-width: 90px;
  }
  .filial-sc small {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 3px;
  }

  .table-wrapper {
    background: var(--branco);
    border-radius: 16px;
    padding: 22px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 16px -8px rgba(30, 95, 168, 0.15);
    margin-bottom: 24px;
  }
  .table-title {
    font-size: calc(20px * var(--fs-scale));
    font-weight: 700;
    color: var(--azul-profundo);
    margin-bottom: 14px;
  }
  .table-scroll {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid var(--borda-suave);
    -webkit-overflow-scrolling: touch;
  }
  table.detalhe {
    width: 100%;
    border-collapse: collapse;
    font-size: calc(14px * var(--fs-scale));
  }
  table.detalhe thead th {
    background: linear-gradient(135deg, var(--azul-profundo), var(--azul-royal));
    color: white;
    padding: 11px 12px;
    text-align: left;
    font-size: calc(12px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  table.detalhe thead th.num { text-align: right; }
  table.detalhe tbody tr { border-bottom: 1px solid var(--borda-suave); }
  table.detalhe tbody tr:nth-child(even) { background: rgba(244, 196, 48, 0.03); }
  table.detalhe td {
    padding: 10px 12px;
    white-space: nowrap;
  }
  table.detalhe td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  table.detalhe td.filial-td {
    font-weight: 600;
    color: var(--azul-profundo);
  }
  table.detalhe tfoot tr {
    background: linear-gradient(135deg, rgba(30,95,168,0.06), rgba(244,196,48,0.08));
    border-top: 2px solid var(--azul-royal);
  }
  table.detalhe tfoot td {
    padding: 13px 12px;
    font-weight: 700;
    color: var(--azul-profundo);
    font-size: calc(14px * var(--fs-scale));
  }

  .chart-wrapper {
    background: var(--branco);
    border-radius: 16px;
    padding: 22px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 16px -8px rgba(30, 95, 168, 0.15);
    margin-bottom: 24px;
  }
  .chart-bars {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 24px;
  }
  .chart-bar-row {
    display: grid;
    grid-template-columns: 180px 1fr 60px;
    gap: 14px;
    align-items: center;
  }
  .chart-bar-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .chart-bar-variety {
    font-size: calc(16px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    letter-spacing: 0.3px;
  }
  .chart-bar-meta {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .chart-bar-track {
    background: rgba(30, 95, 168, 0.06);
    border-radius: 8px;
    height: 36px;
    overflow: hidden;
    position: relative;
  }
  .chart-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--amarelo-milho) 0%, var(--verde-limao) 60%, var(--verde-medio) 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
    box-shadow: inset 0 -2px 0 rgba(0,0,0,0.08);
    min-width: 80px;
  }
  .chart-bar-value {
    font-size: calc(15px * var(--fs-scale));
    font-weight: 800;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.25);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .chart-bar-percent {
    font-size: calc(16px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .chart-legend {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    padding-top: 18px;
    border-top: 1px dashed var(--borda-suave);
  }
  .chart-legend-item {
    text-align: center;
    padding: 10px 6px;
    background: linear-gradient(135deg, rgba(244,196,48,0.06), rgba(168,196,55,0.04));
    border-radius: 10px;
  }
  .chart-legend-value {
    font-size: calc(22px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .chart-legend-label {
    margin-top: 6px;
    font-size: calc(11px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--texto-suave);
  }

  .footer {
    margin-top: 24px;
    padding: 18px 22px;
    background: var(--branco);
    border-radius: 14px;
    border: 1px solid var(--borda-suave);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .footer-text {
    font-size: calc(14px * var(--fs-scale));
    color: var(--texto-suave);
  }
  .footer-meta-item {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--texto-suave);
  }

  @media screen and (max-width: 780px) {
    body { padding: 12px 10px; }
    .header {
      max-height: none;
      padding: 12px 14px;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .header-left { width: 100%; }
    .header-title { font-size: calc(24px * var(--fs-scale)); }
    .header-right { text-align: left; width: 100%; }
    .cards-grid { grid-template-columns: 1fr; gap: 12px; }
    .cards-grid-fazendas { grid-template-columns: 1fr; gap: 12px; }
    .card { padding: 16px 18px; }
    .card-value-main { font-size: calc(30px * var(--fs-scale)); }
    .summary-row { grid-template-columns: 1fr; }
    .summary-big-number { font-size: calc(48px * var(--fs-scale)); }
    table.detalhe { font-size: calc(15px * var(--fs-scale)); }
    table.detalhe thead th { font-size: calc(13px * var(--fs-scale)); }
    .filial-item { grid-template-columns: 1fr; gap: 6px; }
    .filial-peso, .filial-sc { text-align: left; }
    .table-wrapper { padding: 14px; }
    .chart-wrapper { padding: 16px; }
    .chart-bar-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .chart-bar-percent { text-align: left; }
    .chart-legend { grid-template-columns: repeat(2, 1fr); }
    .footer { padding: 14px 16px; }
    .font-size-controls { margin-bottom: 12px; }
  }

  @media print {
    body {
      padding: 10px;
      background: white;
      background-image: none;
    }
    .no-print { display: none !important; }
    .header { box-shadow: none; }
    .card, .summary-block, .table-wrapper, .footer { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="container">

  <header class="header">
    <div class="header-left">
      <div class="brand">
        <img src="https://vps.metasafra.com.br/grupo_franciosi/logo4.jpg" alt="Grupo Franciosi" class="brand-logo">
        <div class="brand-text">
          <span class="brand-text-line1">Grupo</span>
          <span class="brand-text-line2">FRANCIOSI</span>
        </div>
      </div>
      <div class="header-title">Produção de <em>Milho</em></div>
    </div>
    <div class="header-right">
      <span class="header-date-label">Gerado em</span>
      <span class="header-date">${generatedAt}</span>
    </div>
  </header>

  <div class="font-size-controls no-print">
    <span class="font-size-controls-label">Texto:</span>
    <input type="radio" name="font-scale" id="fs-normal" checked>
    <label for="fs-normal">Normal</label>
    <input type="radio" name="font-scale" id="fs-large">
    <label for="fs-large">Grande</label>
    <input type="radio" name="font-scale" id="fs-xlarge">
    <label for="fs-xlarge">Extra</label>
  </div>

  <div class="section-header">
    <span class="section-label">Resumo de Pesagens</span>
    <div class="section-line"></div>
    <span class="section-counter">peso líquido</span>
  </div>

  <div class="cards-grid">
    <div class="card card-total">
      <div class="card-label">Total Geral</div>
      <div class="card-title">Soma de Peso Líquido</div>
      <div class="card-value-main">${data.totalKg}<span class="card-value-unit">KG</span></div>
      <div class="card-value-secondary">${data.totalSc} <span class="text-unit-small">SC 60 KG</span></div>
      <div class="card-cargas">${data.totalCargas} no total</div>
    </div>

    <div class="card card-anterior">
      <div class="card-label">Dia Anterior · ${data.anteriorDataBr}</div>
      <div class="card-title">Peso Líquido</div>
      <div class="card-value-main">${data.anteriorKg}<span class="card-value-unit">KG</span></div>
      <div class="card-value-secondary">${data.anteriorSc} <span class="text-unit-small">SC 60 KG</span></div>
      <div class="card-cargas">${data.anteriorCargas}</div>
    </div>

    <div class="card card-media-ha">
      <div class="card-label">Produtividade</div>
      <div class="card-title">Média SC 60 / Hectare</div>
      <div class="card-value-main">${data.mediaScHa}<span class="card-value-unit">SC/HA</span></div>
      <div class="card-cargas">${data.mediaScHaHectares}</div>
    </div>
  </div>

  <div class="section-header">
    <span class="section-label">Por Fazenda</span>
    <div class="section-line"></div>
    <span class="section-counter">área · colheita · produtividade</span>
  </div>

  <div class="cards-grid-fazendas">
    ${data.fazendaCardsHtml}
  </div>

  <div class="section-header">
    <span class="section-label">Distribuição</span>
    <div class="section-line"></div>
    <span class="section-counter">cargas e fazendas</span>
  </div>

  <div class="summary-row">
    <div class="summary-block">
      <div class="summary-block-title">Total de Cargas</div>
      <div class="summary-big-number">${data.qtdCargas}</div>
      <div class="summary-big-label">tickets de pesagem registrados</div>
    </div>

    <div class="summary-block">
      <div class="summary-block-title">Peso Líquido por Fazenda</div>
      <div class="filial-list">
        ${data.fazendaListHtml}
      </div>
    </div>
  </div>

  <div class="table-wrapper">
    <h2 class="table-title">Produção por Talhão e Variedade</h2>
    <div class="table-scroll">
      <table class="detalhe">
        <thead>
          <tr>
            <th>Fazenda</th>
            <th>Talhão</th>
            <th>Variedade</th>
            <th class="num">Cargas</th>
            <th class="num">P. Líquido (KG)</th>
            <th class="num">% Umidade</th>
            <th class="num">Desc. Umidade</th>
            <th class="num">Desc. Impureza</th>
            <th class="num">SC 60 KG</th>
            <th class="num">Hectares</th>
            <th class="num">Ha. Colhidos</th>
            <th class="num">SC / HA</th>
            <th>Finalizado</th>
          </tr>
        </thead>
        <tbody>
          ${data.talhaoTbodyHtml}
        </tbody>
        <tfoot>
          ${data.talhaoTfootHtml}
        </tfoot>
      </table>
    </div>
  </div>

  <div class="section-header">
    <span class="section-label">Distribuição por Variedade</span>
    <div class="section-line"></div>
    <span class="section-counter">sacas de 60 kg</span>
  </div>

  <div class="chart-wrapper">
    <h2 class="table-title">Sacas de 60 KG por Variedade</h2>
    <p class="chart-desc">Soma do peso líquido convertido em sacas de 60 kg, agrupada por variedade cultivada.</p>

    <div class="chart-bars">
      ${data.chartBarsHtml}
    </div>

    <div class="chart-legend">
      <div class="chart-legend-item">
        <div class="chart-legend-value">${data.chartTotalSc}</div>
        <div class="chart-legend-label">Total SC 60 KG</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${data.chartQtdVariedades}</div>
        <div class="chart-legend-label">Variedade(s)</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${data.chartHectaresTotal}</div>
        <div class="chart-legend-label">Hectares colhidos</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${data.chartScHaMedia}</div>
        <div class="chart-legend-label">SC / HA (média)</div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-text"><strong>Relatório de Produção de Milho</strong> · Sistema UNISYSTEM · Grupo Franciosi</div>
    <div>
      <div class="footer-meta-item">Conversão: 1 saca = 60 kg</div>
    </div>
  </footer>

</div>
</body>
</html>`;
}
