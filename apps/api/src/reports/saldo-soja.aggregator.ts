/**
 * Agrega estoque + contratos do relatório "Saldo de Soja em Grãos (Franciosi TGA)".
 * Portado de jarvis_report/saldoSojaBlock.ts.
 */

const COD_PRODUTO_SOJA = '   5966702';
const PRODUTO_CONTRATO = 'SOJA EM GRAOS';
const KG_POR_SACA = 60;

type RawRow = Record<string, unknown>;

export interface SaldoSojaData {
  qtdFiliais: number;
  totalKg: string;
  totalSc: string;
  qtdContratos: number;
  produtoLabel: string;
  codProduto: string;
  fazendasCountLabel: string;
  contratosTotalKg: string;
  contratosEntregueKg: string;
  contratosQtdNf: string;
  fazendasCardsHtml: string;
  contratosTbodyHtml: string;
  contratosTfootHtml: string;
}

function foldKey(s: string): string {
  return String(s)
    .trim()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

function pickCol(row: RawRow, logical: string): unknown {
  const target = foldKey(logical);
  for (const k of Object.keys(row)) {
    if (foldKey(k) === target) {
      return row[k];
    }
  }
  return undefined;
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') {
    return 0;
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

function fmtDec(n: number, digits = 2): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtKgSc(kg: number): { kg: string; sc: string } {
  return { kg: fmtInt(kg), sc: fmtDec(kg / KG_POR_SACA) };
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function contratoStatus(
  qtdContrato: number,
  entregue: number,
): { label: string; className: string } {
  if (qtdContrato <= 0) {
    return { label: '—', className: 'pill-pending' };
  }
  if (entregue <= 0) {
    return { label: 'Pendente', className: 'pill-pending' };
  }
  const pct = Math.round((100 * entregue) / qtdContrato);
  if (pct >= 100) {
    return { label: 'Concluído', className: 'pill-ok' };
  }
  return { label: `Parcial ${pct}%`, className: 'pill-partial' };
}

function buildFazendasCardsHtml(
  grupos: Array<{
    fazenda: string;
    armazem: string;
    endereco: string;
    saldoKg: number;
  }>,
): string {
  if (grupos.length === 0) {
    return `<div style="text-align:center;padding:24px;color:#6b7280;font-size:0.9rem">Nenhum saldo de estoque encontrado para o produto filtrado.</div>`;
  }

  const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/>
    <path d="M9 9h.01"/><path d="M9 13h.01"/><path d="M9 17h.01"/>
    <path d="M15 9h.01"/><path d="M15 13h.01"/><path d="M15 17h.01"/>
  </svg>`;

  return grupos
    .map((g) => {
      const { kg, sc } = fmtKgSc(g.saldoKg);
      const armHtml = [g.armazem, g.endereco]
        .filter(Boolean)
        .map((x) => escapeHtml(x))
        .join('<br>');
      return `<div class="card">
      <div class="card-icon-wrapper">${iconSvg}</div>
      <div class="card-sector">Fazenda</div>
      <h3 class="card-title">${escapeHtml(g.fazenda)}</h3>
      <div class="card-armazem">${armHtml || '—'}</div>
      <div class="card-metrics">
        <div class="metric-row">
          <span class="metric-label-sm">Em quilos</span>
          <span class="metric-value-lg">${kg}<span class="metric-unit">KG</span></span>
        </div>
        <div class="metric-row">
          <span class="metric-label-sm">Em sacas (60kg)</span>
          <span class="metric-value-md">${sc}<span class="metric-unit">SC</span></span>
        </div>
      </div>
    </div>`;
    })
    .join('\n');
}

function buildContratosRowsHtml(rows: RawRow[]): {
  tbody: string;
  tfoot: string;
} {
  if (rows.length === 0) {
    return {
      tbody: `<tr><td colspan="9" style="text-align:center;padding:20px;color:#6b7280">Nenhum contrato encontrado para ${escapeHtml(PRODUTO_CONTRATO)}.</td></tr>`,
      tfoot: '',
    };
  }

  let sumContrato = 0;
  let sumEntregue = 0;
  let sumNf = 0;

  const body = rows
    .map((r) => {
      const qtd = toNum(pickCol(r, 'qtd_contrato'));
      const ent = toNum(pickCol(r, 'entregue'));
      const nf = toNum(pickCol(r, 'qtd_nf'));
      sumContrato += qtd;
      sumEntregue += ent;
      sumNf += nf;
      const { kg: kgC, sc: scC } = fmtKgSc(qtd);
      const entFmt = ent > 0 ? fmtKgSc(ent) : null;
      const st = contratoStatus(qtd, ent);
      return `<tr>
        <td class="cliente">${escapeHtml(String(pickCol(r, 'cliente') ?? '—'))}</td>
        <td class="contrato">${escapeHtml(String(pickCol(r, 'nr_contrato') ?? '—'))}</td>
        <td>${escapeHtml(String(pickCol(r, 'produto') ?? PRODUTO_CONTRATO))}</td>
        <td class="num">${kgC}</td>
        <td class="num">${scC}</td>
        <td class="num">${entFmt ? entFmt.kg : '—'}</td>
        <td class="num">${entFmt ? entFmt.sc : '—'}</td>
        <td class="num">${fmtInt(nf)}</td>
        <td><span class="pill ${st.className}">${escapeHtml(st.label)}</span></td>
      </tr>`;
    })
    .join('\n');

  const tot = fmtKgSc(sumContrato);
  const totE = fmtKgSc(sumEntregue);
  const tfoot = `<tr>
    <td colspan="3">TOTAL · ${rows.length} contrato(s)</td>
    <td class="num">${tot.kg}</td>
    <td class="num">${tot.sc}</td>
    <td class="num">${sumEntregue > 0 ? totE.kg : '—'}</td>
    <td class="num">${sumEntregue > 0 ? totE.sc : '—'}</td>
    <td class="num">${fmtInt(sumNf)}</td>
    <td></td>
  </tr>`;

  return { tbody: body, tfoot };
}

export function aggregateSaldoSoja(
  estoqueRows: RawRow[],
  contratoRows: RawRow[],
): SaldoSojaData {
  const byFazenda = new Map<
    string,
    { fazenda: string; armazem: string; endereco: string; saldoKg: number }
  >();

  const filiais = new Set<string>();
  let totalKg = 0;
  let produtoLabel = PRODUTO_CONTRATO;

  for (const row of estoqueRows) {
    const saldo = toNum(pickCol(row, 'saldo'));
    if (saldo === 0) {
      continue;
    }
    totalKg += saldo;
    const filial = String(pickCol(row, 'filial') ?? '').trim();
    if (filial) {
      filiais.add(filial);
    }
    const fazenda =
      String(pickCol(row, 'fazenda') ?? '— Sem fazenda').trim() ||
      '— Sem fazenda';
    const armazem = String(pickCol(row, 'armazem') ?? '').trim();
    const endereco = String(pickCol(row, 'endereco') ?? '').trim();
    const prod = String(pickCol(row, 'produto') ?? '').trim();
    if (prod) {
      produtoLabel = prod;
    }

    const cur = byFazenda.get(fazenda) ?? {
      fazenda,
      armazem,
      endereco,
      saldoKg: 0,
    };
    cur.saldoKg += saldo;
    if (!cur.armazem && armazem) {
      cur.armazem = armazem;
    }
    if (!cur.endereco && endereco) {
      cur.endereco = endereco;
    }
    byFazenda.set(fazenda, cur);
  }

  const fazendas = [...byFazenda.values()].sort((a, b) =>
    a.fazenda.localeCompare(b.fazenda, 'pt-BR'),
  );

  let contratosTotalKg = 0;
  let contratosEntregueKg = 0;
  let contratosQtdNf = 0;
  for (const r of contratoRows) {
    contratosTotalKg += toNum(pickCol(r, 'qtd_contrato'));
    contratosEntregueKg += toNum(pickCol(r, 'entregue'));
    contratosQtdNf += toNum(pickCol(r, 'qtd_nf'));
  }

  const { tbody, tfoot } = buildContratosRowsHtml(contratoRows);

  return {
    qtdFiliais: filiais.size,
    totalKg: fmtInt(totalKg),
    totalSc: fmtDec(totalKg / KG_POR_SACA),
    qtdContratos: contratoRows.length,
    produtoLabel,
    codProduto: COD_PRODUTO_SOJA.trim(),
    fazendasCountLabel: `${String(fazendas.length).padStart(2, '0')} localizações`,
    contratosTotalKg: fmtInt(contratosTotalKg),
    contratosEntregueKg: fmtInt(contratosEntregueKg),
    contratosQtdNf: fmtInt(contratosQtdNf),
    fazendasCardsHtml: buildFazendasCardsHtml(fazendas),
    contratosTbodyHtml: tbody,
    contratosTfootHtml: tfoot,
  };
}
