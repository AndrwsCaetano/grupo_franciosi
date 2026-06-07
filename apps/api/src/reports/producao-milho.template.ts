/**
 * Renderiza o HTML (documento completo e autossuficiente) do relatório
 * "Produção de Milho em Grãos", idêntico ao modelo de referência. Recebe os
 * dados já agregados e a data de geração formatada.
 */
import {
  ProducaoMilhoData,
  ProducaoMilhoVariedade,
} from './producao-milho.aggregator';

const nfKg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nfDec2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function fmtKg(n: number): string {
  return nfKg.format(Math.round(n));
}
function fmtSc(n: number): string {
  return nfDec2.format(n);
}
function fmtDec2(n: number): string {
  return nfDec2.format(n);
}
function fmtInt(n: number): string {
  return nfInt.format(Math.round(n));
}
function fmtPercent(n: number): string {
  return `${Math.round(n)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function filialRow(f: ProducaoMilhoData['filiais'][number]): string {
  return `        <div class="filial-item">
          <div class="filial-name">${escapeHtml(f.name)}</div>
          <div class="filial-peso">${fmtKg(f.kg)}<small>KG</small></div>
          <div class="filial-sc">${fmtSc(f.sc)}<small>SC</small></div>
        </div>`;
}

function talhaoRow(t: ProducaoMilhoData['talhoes'][number]): string {
  const badge = t.finalizado
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;background:rgba(62,176,73,0.14);color:var(--verde-logo);">Finalizado</span>`
    : `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;background:rgba(217,119,6,0.12);color:var(--alerta);">Em andamento</span>`;
  return `          <tr>
            <td class="filial-td">${escapeHtml(t.filial)}</td>
            <td>${escapeHtml(t.talhao)}</td>
            <td>${escapeHtml(t.variedade)}</td>
            <td class="num">${fmtInt(t.cargas)}</td>
            <td class="num">${fmtKg(t.kg)}</td>
            <td class="num">${fmtDec2(t.umidadeMedia)}</td>
            <td class="num">${fmtKg(t.descUmidade)}</td>
            <td class="num">${fmtKg(t.descImpureza)}</td>
            <td class="num">${fmtSc(t.sc)}</td>
            <td class="num">${fmtInt(t.hectares)}</td>
            <td class="num">${fmtDec2(t.scPorHa)}</td>
            <td>${badge}</td>
          </tr>`;
}

function variedadeBar(v: ProducaoMilhoVariedade): string {
  const talhaoLabel = `${fmtInt(v.nTalhoes)} ${
    v.nTalhoes === 1 ? 'talhão' : 'talhões'
  } · ${fmtInt(v.hectares)} ha`;
  return `      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span class="chart-bar-variety">${escapeHtml(v.variedade)}</span>
          <span class="chart-bar-meta">${talhaoLabel}</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${v.widthPercent.toFixed(
            0,
          )}%;">
            <span class="chart-bar-value">${fmtSc(v.sc)} SC</span>
          </div>
        </div>
        <div class="chart-bar-percent">${fmtPercent(v.percent)}</div>
      </div>`;
}

export function renderProducaoMilho(
  data: ProducaoMilhoData,
  generatedAt: string,
): string {
  const filiaisHtml = data.filiais.map(filialRow).join('\n');
  const talhoesHtml = data.talhoes.map(talhaoRow).join('\n');
  const variedadesHtml = data.variedades.map(variedadeBar).join('\n');
  const nTalhoesLabel = `${fmtInt(data.talhoesTotal.nTalhoes)} ${
    data.talhoesTotal.nTalhoes === 1 ? 'talhão' : 'talhões'
  }`;
  const scUnitSpan =
    '<span style="font-size:10px;font-weight:600;color:var(--texto-suave);letter-spacing:1px;">SC 60 KG</span>';

  return `<!DOCTYPE html>
<!-- jarvis-bundled-report:estoque-milho-franciosi -->
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Produção de Milho em Grãos · Grupo Franciosi</title>
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
    --amarelo-milho: #f4c430;
    --amarelo-suave: #fff4cc;
    --creme: #f5f7fa;
    --texto: #1f2937;
    --texto-suave: #6b7280;
    --branco: #ffffff;
    --alerta: #d97706;
    --borda-suave: rgba(30, 95, 168, 0.1);
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
  .container { max-width: 1100px; margin: 0 auto; }

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
  .brand-text-line1 {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .brand-text-line2 {
    font-size: 14px;
    font-weight: 800;
    color: var(--azul-profundo);
    letter-spacing: 0.5px;
    line-height: 1;
    margin-top: 1px;
  }
  .header-title {
    font-size: 22px;
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
    font-size: 12px;
    font-weight: 600;
    line-height: 1.35;
    opacity: 0.95;
  }
  .header-date-label {
    display: block;
    font-size: 9px;
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
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .section-counter {
    font-size: 12px;
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
  .card-atual::before { background: linear-gradient(90deg, var(--verde-medio), var(--verde-logo)); }

  .card-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--texto-suave);
    margin-bottom: 8px;
  }
  .card-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--azul-profundo);
    margin-bottom: 14px;
    line-height: 1.25;
  }
  .card-value-main {
    font-size: 28px;
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1.05;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .card-value-unit {
    font-size: 11px;
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
    font-size: 18px;
    font-weight: 700;
    color: var(--verde-medio);
    font-variant-numeric: tabular-nums;
  }
  .card-cargas {
    margin-top: 8px;
    font-size: 11px;
    color: var(--texto-suave);
    font-weight: 600;
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
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--azul-royal);
    margin-bottom: 14px;
  }
  .summary-big-number {
    font-size: 48px;
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
  }
  .summary-big-label {
    margin-top: 6px;
    font-size: 12px;
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
    font-size: 13px;
    font-weight: 700;
    color: var(--azul-profundo);
  }
  .filial-peso {
    font-size: 16px;
    font-weight: 800;
    color: var(--azul-profundo);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .filial-peso small {
    font-size: 10px;
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 3px;
  }
  .filial-sc {
    font-size: 13px;
    font-weight: 700;
    color: var(--verde-medio);
    font-variant-numeric: tabular-nums;
    text-align: right;
    min-width: 90px;
  }
  .filial-sc small {
    font-size: 10px;
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
    font-size: 18px;
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
    font-size: 12px;
  }
  table.detalhe thead th {
    background: linear-gradient(135deg, var(--azul-profundo), var(--azul-royal));
    color: white;
    padding: 11px 12px;
    text-align: left;
    font-size: 10px;
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
    font-size: 12px;
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
    font-size: 14px;
    font-weight: 800;
    color: var(--azul-profundo);
    letter-spacing: 0.3px;
  }
  .chart-bar-meta {
    font-size: 10px;
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
    font-size: 13px;
    font-weight: 800;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.25);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .chart-bar-percent {
    font-size: 14px;
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
    font-size: 20px;
    font-weight: 800;
    color: var(--azul-profundo);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .chart-legend-label {
    margin-top: 6px;
    font-size: 9px;
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
    font-size: 12px;
    color: var(--texto-suave);
  }
  .footer-meta-item {
    font-size: 10px;
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
    .header-title { font-size: 17px; }
    .header-right { text-align: left; width: 100%; }
    .cards-grid { grid-template-columns: 1fr; gap: 12px; }
    .card { padding: 16px 18px; }
    .card-value-main { font-size: 24px; }
    .summary-row { grid-template-columns: 1fr; }
    .summary-big-number { font-size: 40px; }
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
  }

  @media print {
    body {
      padding: 10px;
      background: white;
      background-image: none;
    }
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
      <div class="header-title">Produção de <em>Milho em Grãos</em></div>
    </div>
    <div class="header-right">
      <span class="header-date-label">Gerado em</span>
      <span class="header-date">${generatedAt}</span>
    </div>
  </header>

  <div class="section-header">
    <span class="section-label">Resumo de Pesagens</span>
    <div class="section-line"></div>
    <span class="section-counter">peso líquido</span>
  </div>

  <div class="cards-grid">
    <div class="card card-total">
      <div class="card-label">Total Geral</div>
      <div class="card-title">Soma de Peso Líquido</div>
      <div class="card-value-main">${fmtKg(
        data.total.kg,
      )}<span class="card-value-unit">KG</span></div>
      <div class="card-value-secondary">${fmtSc(
        data.total.sc,
      )} ${scUnitSpan}</div>
      <div class="card-cargas">${fmtInt(data.total.cargas)} cargas no total</div>
    </div>

    <div class="card card-anterior">
      <div class="card-label">Dia Anterior · ${data.diaAnterior.dateLabel}</div>
      <div class="card-title">Peso Líquido</div>
      <div class="card-value-main">${fmtKg(
        data.diaAnterior.kg,
      )}<span class="card-value-unit">KG</span></div>
      <div class="card-value-secondary">${fmtSc(
        data.diaAnterior.sc,
      )} ${scUnitSpan}</div>
      <div class="card-cargas">${fmtInt(data.diaAnterior.cargas)} cargas</div>
    </div>

    <div class="card card-atual">
      <div class="card-label">Dia Atual · ${data.diaAtual.dateLabel}</div>
      <div class="card-title">Peso Líquido</div>
      <div class="card-value-main">${fmtKg(
        data.diaAtual.kg,
      )}<span class="card-value-unit">KG</span></div>
      <div class="card-value-secondary">${fmtSc(
        data.diaAtual.sc,
      )} ${scUnitSpan}</div>
      <div class="card-cargas">${fmtInt(data.diaAtual.cargas)} cargas</div>
    </div>
  </div>

  <div class="section-header">
    <span class="section-label">Distribuição</span>
    <div class="section-line"></div>
    <span class="section-counter">cargas e filiais</span>
  </div>

  <div class="summary-row">
    <div class="summary-block">
      <div class="summary-block-title">Total de Cargas</div>
      <div class="summary-big-number">${fmtInt(data.total.cargas)}</div>
      <div class="summary-big-label">tickets de pesagem registrados</div>
    </div>

    <div class="summary-block">
      <div class="summary-block-title">Peso Líquido por Filial</div>
      <div class="filial-list">
${filiaisHtml}
      </div>
    </div>
  </div>

  <div class="table-wrapper">
    <h2 class="table-title">Saldo por Talhão e Variedade</h2>
    <div class="table-scroll">
      <table class="detalhe">
        <thead>
          <tr>
            <th>Filial</th>
            <th>Talhão</th>
            <th>Variedade</th>
            <th class="num">Cargas</th>
            <th class="num">P. Líquido (KG)</th>
            <th class="num">% Umidade</th>
            <th class="num">Desc. Umidade</th>
            <th class="num">Desc. Impureza</th>
            <th class="num">SC 60 KG</th>
            <th class="num">Hectares</th>
            <th class="num">SC / HA</th>
            <th>Finalizado</th>
          </tr>
        </thead>
        <tbody>
${talhoesHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">TOTAL · ${nTalhoesLabel}</td>
            <td class="num">${fmtInt(data.talhoesTotal.cargas)}</td>
            <td class="num">${fmtKg(data.talhoesTotal.kg)}</td>
            <td class="num">—</td>
            <td class="num">${fmtKg(data.talhoesTotal.descUmidade)}</td>
            <td class="num">${fmtKg(data.talhoesTotal.descImpureza)}</td>
            <td class="num">${fmtSc(data.talhoesTotal.sc)}</td>
            <td class="num">${fmtInt(data.talhoesTotal.hectares)}</td>
            <td class="num">${fmtDec2(data.talhoesTotal.scPorHa)}</td>
            <td></td>
          </tr>
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
    <p style="font-size:12px;color:var(--texto-suave);margin-bottom:18px;">Soma do peso líquido convertido em sacas de 60 kg, agrupada por variedade cultivada.</p>

    <div class="chart-bars">
${variedadesHtml}
    </div>

    <div class="chart-legend">
      <div class="chart-legend-item">
        <div class="chart-legend-value">${fmtSc(
          data.variedadesTotal.sc,
        )}</div>
        <div class="chart-legend-label">Total SC 60 KG</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${fmtInt(
          data.variedadesTotal.nVariedades,
        )}</div>
        <div class="chart-legend-label">Variedade(s)</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${fmtInt(
          data.variedadesTotal.hectares,
        )}</div>
        <div class="chart-legend-label">Hectares totais</div>
      </div>
      <div class="chart-legend-item">
        <div class="chart-legend-value">${fmtDec2(
          data.variedadesTotal.scPorHaMedia,
        )}</div>
        <div class="chart-legend-label">SC / HA (média)</div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-text"><strong>Relatório de Estoque de Milho em Grãos</strong> · Sistema UNISYSTEM · Grupo Franciosi</div>
    <div>
      <div class="footer-meta-item">Conversão: 1 saca = 60 kg</div>
    </div>
  </footer>

</div>
</body>
</html>`;
}
