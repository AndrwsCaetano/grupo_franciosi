/**
 * Renderiza o HTML do relatório portado de jarvis_report.
 */
import { ImplantacaoErpData } from './implantacao-erp.aggregator';

export function renderImplantacaoErp(
  data: ImplantacaoErpData,
  generatedAt: string,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Implantação ERP COMPASS · UNISYSTEM | Grupo Franciosi</title>
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
    --creme-claro: #ffffff;
    --texto: #1f2937;
    --texto-suave: #6b7280;
    --branco: #ffffff;
    --alerta: #d97706;
    --borda-suave: rgba(30, 95, 168, 0.1);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: var(--creme);
    color: var(--texto);
    min-height: 100vh;
    padding: 40px 24px;
    background-image:
      radial-gradient(circle at 10% 0%, rgba(62, 193, 200, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 90% 100%, rgba(30, 95, 168, 0.06) 0%, transparent 40%);
  }
  .container { max-width: 1320px; margin: 0 auto; }
  .header {
    position: relative;
    background: linear-gradient(135deg, var(--azul-profundo) 0%, var(--azul-royal) 60%, var(--azul-medio) 100%);
    border-radius: 24px;
    padding: 0;
    margin-bottom: 48px;
    color: white;
    overflow: hidden;
    box-shadow: 0 20px 60px -20px rgba(30, 74, 133, 0.5);
  }
  .header-inner { padding: 48px 56px 40px; position: relative; z-index: 2; }
  .header::before {
    content: '';
    position: absolute;
    top: -30%; right: -10%;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(62, 193, 200, 0.25) 0%, transparent 65%);
    border-radius: 50%;
    z-index: 0;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -50%; left: -5%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(168, 196, 55, 0.15) 0%, transparent 60%);
    border-radius: 50%;
    z-index: 0;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 36px;
    flex-wrap: wrap;
    gap: 20px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.97);
    padding: 14px 22px 14px 18px;
    border-radius: 14px;
    box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.25);
  }
  .brand-logo { width: 56px; height: 56px; object-fit: contain; }
  .brand-text {
    display: flex;
    flex-direction: column;
    border-left: 2px solid rgba(30, 95, 168, 0.15);
    padding-left: 16px;
  }
  .brand-text-line1 {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .brand-text-line2 {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--azul-profundo);
    letter-spacing: 1px;
    margin-top: 2px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(10px);
    padding: 9px 18px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
  }
  .badge-dot {
    width: 7px; height: 7px;
    background: var(--verde-limao);
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(168, 196, 55, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 4px rgba(168, 196, 55, 0.3); }
    50% { box-shadow: 0 0 0 9px rgba(168, 196, 55, 0.05); }
  }
  .header h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 54px;
    font-weight: 500;
    line-height: 1.05;
    margin-bottom: 14px;
    letter-spacing: -0.5px;
  }
  .header h1 em { font-style: italic; color: var(--turquesa-claro); font-weight: 400; }
  .header-subtitle {
    font-size: 16px;
    font-weight: 300;
    opacity: 0.9;
    max-width: 640px;
    line-height: 1.6;
  }
  .tag-divider {
    width: 100%;
    height: 56px;
    display: block;
    background-image: url('https://vps.metasafra.com.br/grupo_franciosi/tag.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .header-stats-wrapper {
    background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 100%);
    padding: 32px 56px 36px;
    position: relative;
    z-index: 2;
  }
  .header-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
  .header-stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 44px;
    font-weight: 500;
    line-height: 1;
    color: var(--turquesa-claro);
  }
  .header-stat-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.85;
    margin-top: 8px;
    color: white;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    margin-top: 8px;
  }
  .section-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg,
      var(--turquesa) 0%,
      var(--azul-royal) 25%,
      var(--verde-limao) 50%,
      var(--verde-medio) 75%,
      transparent 100%);
    border-radius: 2px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--azul-royal);
  }
  .section-counter {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px;
    color: var(--texto-suave);
    font-style: italic;
  }
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
  }
  .card {
    background: var(--branco);
    border-radius: 20px;
    padding: 32px 28px;
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid var(--borda-suave);
    box-shadow: 0 4px 20px -8px rgba(30, 95, 168, 0.1);
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.4s ease;
  }
  .card-cadastros::before { background: linear-gradient(90deg, var(--turquesa), var(--turquesa-claro)); }
  .card-compras::before   { background: linear-gradient(90deg, var(--azul-royal), var(--azul-medio)); }
  .card-fiscal::before    { background: linear-gradient(90deg, var(--verde-limao), var(--verde-medio)); }
  .card-almox::before     { background: linear-gradient(90deg, var(--verde-medio), var(--verde-logo)); }
  .card-financeiro::before { background: linear-gradient(90deg, var(--turquesa), var(--azul-royal), var(--verde-limao), var(--verde-medio)); }
  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 50px -12px rgba(30, 95, 168, 0.18);
    border-color: rgba(30, 95, 168, 0.2);
  }
  .card:hover::before { transform: scaleX(1); }
  .card-icon-wrapper {
    width: 56px; height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    position: relative;
  }
  .card-cadastros .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(62, 193, 200, 0.15) 0%, rgba(62, 193, 200, 0.3) 100%);
  }
  .card-cadastros .card-icon-wrapper svg { color: var(--turquesa); }
  .card-compras .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.12) 0%, rgba(30, 95, 168, 0.25) 100%);
  }
  .card-compras .card-icon-wrapper svg { color: var(--azul-royal); }
  .card-fiscal .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(168, 196, 55, 0.18) 0%, rgba(168, 196, 55, 0.35) 100%);
  }
  .card-fiscal .card-icon-wrapper svg { color: #7a9325; }
  .card-almox .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(78, 170, 106, 0.15) 0%, rgba(78, 170, 106, 0.3) 100%);
  }
  .card-almox .card-icon-wrapper svg { color: var(--verde-medio); }
  .card-financeiro .card-icon-wrapper {
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.12) 0%, rgba(62, 193, 200, 0.2) 100%);
  }
  .card-financeiro .card-icon-wrapper svg { color: var(--azul-royal); }
  .card-icon-wrapper svg { width: 28px; height: 28px; }
  .card-sector {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--texto-suave);
    margin-bottom: 6px;
  }
  .card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 600;
    color: var(--azul-profundo);
    line-height: 1.2;
    margin-bottom: 24px;
    letter-spacing: -0.3px;
  }
  .card-metrics { display: flex; flex-direction: column; gap: 16px; }
  .metric {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 14px;
    border-bottom: 1px dashed rgba(30, 95, 168, 0.15);
  }
  .metric:last-child { border-bottom: none; padding-bottom: 0; }
  .metric-label {
    font-size: 13px;
    color: var(--texto-suave);
    font-weight: 400;
    line-height: 1.4;
    flex: 1;
    padding-right: 12px;
  }
  .metric-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 38px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -1px;
  }
  .metric-value-sm { font-size: 26px; }
  .card-cadastros .metric-value { color: var(--turquesa); }
  .card-compras   .metric-value { color: var(--azul-royal); }
  .card-fiscal    .metric-value { color: #7a9325; }
  .card-almox     .metric-value { color: var(--verde-medio); }
  .card-wide { grid-column: 1 / -1; }
  .financial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 8px; }
  .financial-block {
    padding: 26px;
    border-radius: 16px;
    position: relative;
  }
  .financial-block.pagar {
    background: linear-gradient(135deg, rgba(30, 95, 168, 0.04) 0%, rgba(62, 193, 200, 0.08) 100%);
    border: 1px solid rgba(30, 95, 168, 0.12);
  }
  .financial-block.receber {
    background: linear-gradient(135deg, rgba(168, 196, 55, 0.06) 0%, rgba(78, 170, 106, 0.1) 100%);
    border: 1px solid rgba(78, 170, 106, 0.15);
  }
  .financial-block-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .financial-block-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--branco);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(30, 95, 168, 0.1);
  }
  .pagar .financial-block-icon { color: var(--azul-royal); border: 1px solid rgba(30, 95, 168, 0.15); }
  .receber .financial-block-icon { color: var(--verde-medio); border: 1px solid rgba(78, 170, 106, 0.2); }
  .financial-block-icon svg { width: 18px; height: 18px; }
  .financial-block-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .pagar .financial-block-title { color: var(--azul-royal); }
  .receber .financial-block-title { color: var(--verde-medio); }
  .financial-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 0;
    border-bottom: 1px dashed rgba(30, 95, 168, 0.12);
  }
  .financial-row:last-of-type { border-bottom: none; }
  .financial-row-label { font-size: 12.5px; color: var(--texto-suave); }
  .financial-row-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .pagar .financial-row-value { color: var(--azul-royal); }
  .receber .financial-row-value { color: var(--verde-medio); }
  .financial-row-value.currency { font-size: 20px; }
  .progress-wrapper {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(30, 95, 168, 0.12);
  }
  .progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 8px;
    color: var(--texto-suave);
    font-weight: 500;
  }
  .progress-label strong { font-weight: 700; }
  .pagar .progress-label strong { color: var(--azul-royal); }
  .receber .progress-label strong { color: var(--verde-medio); }
  .progress-bar {
    height: 6px;
    background: rgba(30, 95, 168, 0.12);
    border-radius: 100px;
    overflow: hidden;
  }
  .progress-fill { height: 100%; border-radius: 100px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
  .pagar .progress-fill { background: linear-gradient(90deg, var(--azul-royal), var(--turquesa)); }
  .receber .progress-fill { background: linear-gradient(90deg, var(--verde-medio), var(--verde-limao)); }
  .footer {
    margin-top: 40px;
    padding: 0;
    background: var(--branco);
    border-radius: 16px;
    border: 1px solid var(--borda-suave);
    overflow: hidden;
    box-shadow: 0 4px 20px -8px rgba(30, 95, 168, 0.08);
  }
  .footer-tag {
    width: 100%;
    height: 8px;
    background-image: url('https://vps.metasafra.com.br/grupo_franciosi/tag.png');
    background-size: cover;
    background-position: center;
  }
  .footer-content {
    padding: 28px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .footer-text { font-size: 13px; color: var(--texto-suave); }
  .footer-text strong { color: var(--azul-royal); font-weight: 700; }
  .footer-meta { display: flex; gap: 24px; font-size: 12px; color: var(--texto-suave); }
  .footer-meta-item { display: flex; align-items: center; gap: 6px; }
  .footer-meta-item::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--turquesa);
    border-radius: 50%;
  }
  .footer-meta-item:nth-child(2)::before { background: var(--verde-limao); }
  @media (max-width: 768px) {
    body { padding: 20px 16px; }
    .header-inner { padding: 32px 24px 28px; }
    .header-stats-wrapper { padding: 24px 24px 28px; }
    .header h1 { font-size: 36px; }
    .header-stats { grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .header-stat-value { font-size: 36px; }
    .cards-grid { grid-template-columns: 1fr; }
    .financial-grid { grid-template-columns: 1fr; gap: 20px; }
    .tag-divider { height: 40px; }
    .brand { padding: 10px 16px 10px 14px; }
    .brand-logo { width: 44px; height: 44px; }
  }
</style>
</head>
<body>
<!-- jarvis-bundled-report:implantacao-franciosi-tga -->
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
          Em andamento
        </div>
      </div>

      <h1>Implantação <em>ERP COMPASS</em><br>UNISYSTEM</h1>
      <p class="header-subtitle">
        Acompanhamento do quadro atual de cadastros e movimentações por setor durante o processo de implantação do sistema de gestão.
      </p>
      <p class="header-subtitle" style="margin-top:12px;font-size:14px;opacity:0.85">
        Gerado em ${generatedAt} · Oracle UNISYSTEM
      </p>
    </div>

    <div class="tag-divider" role="img" aria-label="Faixa decorativa Grupo Franciosi"></div>

    <div class="header-stats-wrapper">
      <div class="header-stats">
        <div>
          <div class="header-stat-value">5</div>
          <div class="header-stat-label">Setores ativos</div>
        </div>
        <div>
          <div class="header-stat-value">${data.registrosTotais}</div>
          <div class="header-stat-label">Registros (aprox.)</div>
        </div>
        <div>
          <div class="header-stat-value">11</div>
          <div class="header-stat-label">Indicadores</div>
        </div>
        <div>
          <div class="header-stat-value">100%</div>
          <div class="header-stat-label">Em operação</div>
        </div>
      </div>
    </div>
  </header>

  <div class="section-header">
    <span class="section-label">Quadro Atual por Setor</span>
    <div class="section-line"></div>
    <span class="section-counter">05 setores</span>
  </div>

  <div class="cards-grid">

    <div class="card card-cadastros">
      <div class="card-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="card-sector">Setor</div>
      <h3 class="card-title">Cadastros</h3>
      <div class="card-metrics">
        <div class="metric">
          <div class="metric-label">Cliente / Fornecedor</div>
          <div class="metric-value">${data.clienteFornecedor}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Produtos</div>
          <div class="metric-value">${data.qtdProdutos}</div>
        </div>
      </div>
    </div>

    <div class="card card-compras">
      <div class="card-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      </div>
      <div class="card-sector">Setor</div>
      <h3 class="card-title">Compras</h3>
      <div class="card-metrics">
        <div class="metric">
          <div class="metric-label">Pedidos de compra (não cancelados)</div>
          <div class="metric-value">${data.qtdPedidoCompra}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Valor soma itens (pedido compra)</div>
          <div class="metric-value metric-value-sm">R$ ${data.valorPedido}</div>
        </div>
      </div>
    </div>

    <div class="card card-fiscal">
      <div class="card-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div class="card-sector">Setor</div>
      <h3 class="card-title">Fiscal</h3>
      <div class="card-metrics">
        <div class="metric">
          <div class="metric-label">NF entrada (qtd / valor)</div>
          <div class="metric-value metric-value-sm">${data.qtdNfEntrada} · R$ ${data.valorNfEntrada}</div>
        </div>
        <div class="metric">
          <div class="metric-label">NF saída (qtd / valor)</div>
          <div class="metric-value metric-value-sm">${data.qtdNfSaida} · R$ ${data.valorNfSaida}</div>
        </div>
      </div>
    </div>

    <div class="card card-almox">
      <div class="card-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 4 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l3-1.71"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </div>
      <div class="card-sector">Setor</div>
      <h3 class="card-title">Almoxarifado</h3>
      <div class="card-metrics">
        <div class="metric">
          <div class="metric-label">Itens em solicitações (produtos)</div>
          <div class="metric-value">${data.qtdItensSolicitados}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Solicitações de compra</div>
          <div class="metric-value">${data.qtdSolicitacaoCompra}</div>
        </div>
      </div>
    </div>

    <div class="card card-financeiro card-wide">
      <div class="card-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
      <div class="card-sector">Setor</div>
      <h3 class="card-title">Financeiro</h3>

      <div class="financial-grid">

        <div class="financial-block pagar">
          <div class="financial-block-header">
            <div class="financial-block-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </div>
            <div class="financial-block-title">Contas à Pagar</div>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Títulos lançados</span>
            <span class="financial-row-value">${data.qtdTitulosCp}</span>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Valor total à pagar</span>
            <span class="financial-row-value currency">R$ ${data.totalContasPagar}</span>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Valor pago</span>
            <span class="financial-row-value currency">R$ ${data.totalPago}</span>
          </div>
          <div class="progress-wrapper">
            <div class="progress-label">
              <span>Pagamento concluído</span>
              <strong>${data.pctPago}%</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${data.pctPago}%"></div>
            </div>
          </div>
        </div>

        <div class="financial-block receber">
          <div class="financial-block-header">
            <div class="financial-block-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
            </div>
            <div class="financial-block-title">Contas à Receber</div>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Títulos lançados</span>
            <span class="financial-row-value">${data.qtdTitulosReceber}</span>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Valor total à receber</span>
            <span class="financial-row-value currency">R$ ${data.valorReceber}</span>
          </div>
          <div class="financial-row">
            <span class="financial-row-label">Valor recebido</span>
            <span class="financial-row-value currency">R$ ${data.valorRecebido}</span>
          </div>
          <div class="progress-wrapper">
            <div class="progress-label">
              <span>Recebimento concluído</span>
              <strong>${data.pctRecebido}%</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${data.pctRecebido}%"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>

  <footer class="footer">
    <div class="footer-tag"></div>
    <div class="footer-content">
      <div class="footer-text">
        <strong>Implantação ERP COMPASS</strong> · Sistema UNISYSTEM · Grupo Franciosi
      </div>
      <div class="footer-meta">
        <div class="footer-meta-item">Dados ao vivo do ERP</div>
        <div class="footer-meta-item">${generatedAt}</div>
      </div>
    </div>
  </footer>

</div>
</body>
</html>
`;
}
