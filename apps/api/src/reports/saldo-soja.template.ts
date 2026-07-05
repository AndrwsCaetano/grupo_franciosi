/**
 * Renderiza o HTML do relatório portado de jarvis_report.
 */
import { SaldoSojaData } from './saldo-soja.aggregator';

export function renderSaldoSoja(
  data: SaldoSojaData,
  generatedAt: string,
): string {
  return `<!DOCTYPE html>
<!-- jarvis-bundled-report:saldo-soja-franciosi jarvis-pdf-landscape -->
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Saldo de Soja por Filial · Grupo Franciosi</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
    --creme: #f5f7fa;
    --texto: #1f2937;
    --texto-suave: #6b7280;
    --branco: #ffffff;
    --alerta: #d97706;
    --borda-suave: rgba(30, 95, 168, 0.1);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--creme);
    color: var(--texto);
    min-height: 100vh;
    padding: 20px 16px;
    background-image:
      radial-gradient(circle at 10% 0%, rgba(62, 193, 200, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 90% 100%, rgba(30, 95, 168, 0.06) 0%, transparent 40%);
  }
  .container { max-width: 1320px; margin: 0 auto; }

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
  .brand-logo { width: 42px; height: 42px; object-fit: contain; }
  .brand-text {
    display: flex;
    flex-direction: column;
    border-left: 2px solid rgba(30,95,168,0.15);
    padding-left: 10px;
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
    color: var(--turquesa-claro);
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

  .section-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; margin-top: 8px; }
  .section-line { flex: 1; height: 2px; background: linear-gradient(90deg, var(--turquesa), var(--azul-royal), var(--verde-limao), transparent); }
  .section-label { font-size: calc(12px * var(--fs-scale)); font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--azul-royal); }
  .section-counter { font-size: calc(14px * var(--fs-scale)); color: var(--texto-suave); font-style: italic; }

  .cards-grid-kpi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .card-kpi {
    background: var(--branco);
    border-radius: 16px;
    padding: 20px 22px;
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 16px -8px rgba(30, 95, 168, 0.15);
    position: relative;
    overflow: hidden;
  }
  .card-kpi::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }
  .card-kpi-filiais::before { background: linear-gradient(90deg, var(--azul-medio), var(--azul-royal)); }
  .card-kpi-kg::before { background: linear-gradient(90deg, var(--verde-logo), var(--verde-medio)); }
  .card-kpi-sc::before { background: linear-gradient(90deg, var(--turquesa), var(--verde-limao)); }
  .card-kpi-contratos::before { background: linear-gradient(90deg, var(--verde-limao), var(--verde-logo)); }
  .card-kpi .card-label {
    font-size: calc(12px * var(--fs-scale));
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--texto-suave);
    margin-bottom: 8px;
  }
  .card-kpi .card-title {
    font-size: calc(16px * var(--fs-scale));
    font-weight: 700;
    color: var(--azul-profundo);
    margin-bottom: 14px;
    line-height: 1.25;
  }
  .card-kpi .card-value-main {
    font-size: calc(32px * var(--fs-scale));
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1.05;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .card-kpi .card-value-unit {
    font-size: calc(13px * var(--fs-scale));
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .total-card { background: linear-gradient(135deg, var(--verde-logo), var(--verde-medio), var(--verde-limao)); border-radius: 24px; padding: 40px 44px; color: white; margin-bottom: 32px; box-shadow: 0 20px 50px -18px rgba(62,176,73,0.45); }
  .total-card-label { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px; }
  .total-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .total-metric-value { font-family: 'Cormorant Garamond', serif; font-size: 64px; font-weight: 500; line-height: 1; margin-bottom: 8px; }
  .total-metric-unit { font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9; }
  .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 24px; margin-bottom: 48px; }
  .card { background: var(--branco); border-radius: 20px; padding: 32px 28px; border: 1px solid var(--borda-suave); box-shadow: 0 4px 20px -8px rgba(30,95,168,0.1); position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--verde-logo), var(--verde-limao)); }
  .card-icon-wrapper { width: 48px; height: 48px; background: linear-gradient(135deg, var(--verde-suave), rgba(168,196,55,0.2)); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: var(--verde-medio); }
  .card-sector { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--texto-suave); margin-bottom: 6px; }
  .card-title { font-size: 20px; font-weight: 700; color: var(--azul-profundo); margin-bottom: 20px; }
  .card-armazem { font-size: 12px; color: var(--texto-suave); margin-bottom: 18px; font-style: italic; line-height: 1.4; }
  .card-metrics { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; border-top: 1px dashed var(--borda-suave); }
  .metric-row { display: flex; justify-content: space-between; align-items: baseline; }
  .metric-label-sm { font-size: 11px; font-weight: 600; color: var(--texto-suave); text-transform: uppercase; letter-spacing: 1.5px; }
  .metric-value-lg { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 600; color: var(--azul-profundo); }
  .metric-value-md { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; color: var(--verde-medio); }
  .metric-unit { font-size: 11px; font-weight: 600; color: var(--texto-suave); margin-left: 4px; }
  .table-wrapper { background: var(--branco); border-radius: 20px; padding: 32px; border: 1px solid var(--borda-suave); box-shadow: 0 4px 20px -8px rgba(30,95,168,0.1); overflow: hidden; }
  .table-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
  .table-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; color: var(--azul-profundo); }
  .table-subtitle { font-size: 12px; color: var(--texto-suave); margin-top: 4px; }
  .table-summary { display: flex; gap: 24px; flex-wrap: wrap; }
  .table-summary-value { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: var(--azul-royal); }
  .table-summary-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--texto-suave); margin-top: 4px; }
  .table-scroll { overflow-x: auto; border-radius: 12px; border: 1px solid var(--borda-suave); }
  table.contratos { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.contratos thead th { background: linear-gradient(135deg, var(--azul-profundo), var(--azul-royal)); color: white; padding: 14px 16px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  table.contratos thead th.num { text-align: right; }
  table.contratos tbody tr { border-bottom: 1px solid var(--borda-suave); }
  table.contratos td { padding: 14px 16px; }
  table.contratos td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  table.contratos td.cliente { font-weight: 600; color: var(--azul-profundo); }
  table.contratos td.contrato { font-family: monospace; color: var(--texto-suave); font-size: 12px; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .pill-ok { background: rgba(62,176,73,0.12); color: var(--verde-medio); }
  .pill-pending { background: rgba(217,119,6,0.12); color: var(--alerta); }
  .pill-partial { background: rgba(30,95,168,0.12); color: var(--azul-royal); }
  table.contratos tfoot tr { background: linear-gradient(135deg, rgba(30,95,168,0.06), rgba(62,193,200,0.06)); border-top: 2px solid var(--azul-royal); }
  table.contratos tfoot td { padding: 16px; font-weight: 700; color: var(--azul-profundo); }
  .footer { margin-top: 56px; padding: 32px 40px; background: var(--branco); border-radius: 20px; border: 1px solid var(--borda-suave); }
  .footer-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
  .footer-text { font-size: 13px; color: var(--texto-suave); }
  .footer-meta-item { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--texto-suave); }
  /* HTML / celular — não afeta PDF (@media print abaixo) */
  @media screen and (max-width: 900px) {
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
    .cards-grid-kpi { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .total-card { padding: 28px 24px; }
    .total-metric-value { font-size: clamp(2rem, 10vw, 3.5rem); }
    .table-wrapper { padding: 20px 16px; }
    .table-header { flex-direction: column; align-items: stretch; }
    .table-summary { justify-content: space-between; width: 100%; }
  }

  @media screen and (max-width: 560px) {
    body { padding: 16px 12px; }
    .cards-grid-kpi { grid-template-columns: 1fr; gap: 12px; }
    .card-kpi { padding: 16px 18px; }
    .card-kpi .card-value-main { font-size: calc(30px * var(--fs-scale)); }
    .cards-grid { grid-template-columns: 1fr; gap: 16px; }
    .card { padding: 20px 18px; }
    .total-card-grid { grid-template-columns: 1fr; gap: 20px; }
    .table-summary {
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    table.contratos { font-size: 11px; min-width: 520px; }
    .footer { padding: 20px 16px; margin-top: 32px; }
    .footer-content { flex-direction: column; align-items: flex-start; }
  }

  /* PDF (Gotenberg emulatedMediaType: print) — layout compacto, tabela sem quebra feia */
  @media print {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      min-height: auto;
      padding: 0;
      background: #fff !important;
      background-image: none !important;
      font-size: 9px;
    }
    .container { max-width: none; width: 100%; }
    .header {
      margin-bottom: 10px;
      border-radius: 12px;
      box-shadow: none;
      max-height: none;
      padding: 10px 14px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .brand { padding: 6px 10px; box-shadow: none; }
    .brand-logo { width: 36px; height: 36px; }
    .brand-text-line2 { font-size: 12px; }
    .header-title { font-size: 18px; }
    .header-date { font-size: 11px; }
    .header-date-label { font-size: 8px; }
    .cards-grid-kpi {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .card-kpi {
      padding: 10px 12px;
      border-radius: 10px;
      box-shadow: none;
    }
    .card-kpi .card-label { font-size: 8px; margin-bottom: 4px; }
    .card-kpi .card-title { font-size: 10px; margin-bottom: 6px; }
    .card-kpi .card-value-main { font-size: 18px; }
    .section-header {
      margin: 10px 0 8px;
      gap: 8px;
      page-break-after: avoid;
    }
    .section-label { font-size: 9px; letter-spacing: 2px; }
    .section-counter { font-size: 11px; }
    .total-card {
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 12px;
      box-shadow: none;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .total-metric-value { font-size: 26px; margin-bottom: 4px; }
    .total-metric-unit { font-size: 9px; }
    .total-card-grid { gap: 16px; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .card {
      padding: 12px 10px;
      border-radius: 10px;
      box-shadow: none;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .card-icon-wrapper {
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
    }
    .card-icon-wrapper svg { width: 18px; height: 18px; }
    .card-title { font-size: 11px; margin-bottom: 8px; }
    .card-armazem { font-size: 8px; margin-bottom: 8px; }
    .card-metrics { gap: 6px; padding-top: 8px; }
    .metric-value-lg { font-size: 16px; }
    .metric-value-md { font-size: 14px; }
    .metric-label-sm { font-size: 7px; }
    .table-wrapper {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 10px;
      box-shadow: none;
      page-break-before: auto;
    }
    .table-header {
      margin-bottom: 8px;
      flex-direction: row;
      align-items: center;
    }
    .table-title { font-size: 16px; }
    .table-subtitle { font-size: 8px; display: none; }
    .table-summary { gap: 12px; }
    .table-summary-value { font-size: 14px; }
    .table-summary-label { font-size: 7px; }
    .table-scroll {
      overflow: visible;
      border: none;
    }
    table.contratos {
      width: 100%;
      table-layout: fixed;
      font-size: 7.5px;
      border-collapse: collapse;
    }
    table.contratos thead {
      display: table-header-group;
    }
    table.contratos tfoot {
      display: table-footer-group;
    }
    table.contratos thead th {
      padding: 5px 4px;
      font-size: 6.5px;
      letter-spacing: 0.5px;
      line-height: 1.2;
      white-space: normal;
      vertical-align: bottom;
    }
    table.contratos tbody tr,
    table.contratos tfoot tr {
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    table.contratos td {
      padding: 5px 4px;
      line-height: 1.25;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    table.contratos td.cliente { font-size: 7px; }
    table.contratos td.contrato { font-size: 7px; }
    table.contratos col.col-cliente { width: 18%; }
    table.contratos col.col-contrato { width: 10%; }
    table.contratos col.col-produto { width: 10%; }
    table.contratos col.col-num { width: 9%; }
    table.contratos col.col-status { width: 8%; }
    table.contratos tfoot td { font-size: 8px; padding: 6px 4px; }
    .pill { font-size: 6px; padding: 2px 5px; }
    .footer {
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      box-shadow: none;
      page-break-inside: avoid;
    }
    .footer-text { font-size: 8px; }
    .footer-meta-item { font-size: 7px; }
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
      <div class="header-title">Saldo de <em>Soja em Grãos</em></div>
    </div>
    <div class="header-right">
      <span class="header-date-label">Gerado em</span>
      <span class="header-date">${generatedAt}</span>
    </div>
  </header>

  <div class="section-header">
    <span class="section-label">Resumo Geral</span>
    <div class="section-line"></div>
    <span class="section-counter">${data.produtoLabel} · ${data.codProduto}</span>
  </div>

  <div class="cards-grid-kpi">
    <div class="card-kpi card-kpi-filiais">
      <div class="card-label">Operação</div>
      <div class="card-title">Filiais Ativas</div>
      <div class="card-value-main">${data.qtdFiliais}</div>
    </div>
    <div class="card-kpi card-kpi-kg">
      <div class="card-label">Estoque</div>
      <div class="card-title">KG em Estoque</div>
      <div class="card-value-main">${data.totalKg}<span class="card-value-unit">KG</span></div>
    </div>
    <div class="card-kpi card-kpi-sc">
      <div class="card-label">Conversão</div>
      <div class="card-title">Sacas de 60 kg</div>
      <div class="card-value-main">${data.totalSc}<span class="card-value-unit">SC</span></div>
    </div>
    <div class="card-kpi card-kpi-contratos">
      <div class="card-label">Comercial</div>
      <div class="card-title">Contratos Vigentes</div>
      <div class="card-value-main">${data.qtdContratos}</div>
    </div>
  </div>

  <div class="section-header">
    <span class="section-label">Total Consolidado</span>
    <div class="section-line"></div>
    <span class="section-counter">soja em grãos</span>
  </div>

  <div class="total-card">
    <div class="total-card-label">Saldo Total · Todas as Filiais</div>
    <div class="total-card-grid">
      <div>
        <div class="total-metric-value">${data.totalKg}</div>
        <div class="total-metric-unit">Quilogramas (KG)</div>
      </div>
      <div>
        <div class="total-metric-value">${data.totalSc}</div>
        <div class="total-metric-unit">Sacas de 60 kg</div>
      </div>
    </div>
  </div>

  <div class="section-header">
    <span class="section-label">Saldo por Fazenda</span>
    <div class="section-line"></div>
    <span class="section-counter">${data.fazendasCountLabel}</span>
  </div>

  <div class="cards-grid">
    ${data.fazendasCardsHtml}
  </div>

  <div class="section-header">
    <span class="section-label">Contratos Firmados</span>
    <div class="section-line"></div>
    <span class="section-counter">soja em grãos</span>
  </div>

  <div class="table-wrapper">
    <div class="table-header">
      <div>
        <div class="table-title">Contratos de Venda · Soja em Grãos</div>
        <div class="table-subtitle">Volumes contratados, entregues e quantidade de notas fiscais emitidas por contrato</div>
      </div>
      <div class="table-summary">
        <div>
          <div class="table-summary-value">${data.contratosTotalKg}</div>
          <div class="table-summary-label">KG Contratado</div>
        </div>
        <div>
          <div class="table-summary-value">${data.contratosEntregueKg}</div>
          <div class="table-summary-label">KG Entregue</div>
        </div>
        <div>
          <div class="table-summary-value">${data.contratosQtdNf}</div>
          <div class="table-summary-label">Notas Emitidas</div>
        </div>
      </div>
    </div>
    <div class="table-scroll">
      <table class="contratos">
        <colgroup>
          <col class="col-cliente">
          <col class="col-contrato">
          <col class="col-produto">
          <col class="col-num">
          <col class="col-num">
          <col class="col-num">
          <col class="col-num">
          <col class="col-num">
          <col class="col-status">
        </colgroup>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Nº Contrato</th>
            <th>Produto</th>
            <th class="num">Contr. KG</th>
            <th class="num">Contr. SC</th>
            <th class="num">Entr. KG</th>
            <th class="num">Entr. SC</th>
            <th class="num">NF</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.contratosTbodyHtml}
        </tbody>
        <tfoot>
          ${data.contratosTfootHtml}
        </tfoot>
      </table>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-content">
      <div class="footer-text"><strong>Relatório de Saldo de Soja</strong> · Sistema UNISYSTEM · Grupo Franciosi</div>
      <div class="footer-meta">
        <div class="footer-meta-item">Conversão: 1 saca = 60 kg</div>
        <div class="footer-meta-item">${generatedAt}</div>
      </div>
    </div>
  </footer>

</div>
</body>
</html>
`;
}
