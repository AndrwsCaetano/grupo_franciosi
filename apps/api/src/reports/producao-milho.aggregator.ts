/**
 * Agrega as linhas das 3 queries Oracle de "Produção de Milho (Franciosi TGA)"
 * nas estruturas que alimentam o template HTML (cards, fazendas, tabela por
 * talhão e gráfico por variedade). Portado de jarvis_report/estoqueMilhoBlock.ts.
 */

const KG_POR_SACA = 60;
const MILHO_SAFRA_DESCRICAO = '2025/2026';

type RawRow = Record<string, unknown>;

export interface ProducaoMilhoDiaAnteriorStats {
  kg: number;
  cargas: number;
}

export interface ProducaoMilhoData {
  totalKg: string;
  totalSc: string;
  totalCargas: string;
  anteriorDataBr: string;
  anteriorKg: string;
  anteriorSc: string;
  anteriorCargas: string;
  mediaScHa: string;
  mediaScHaHectares: string;
  qtdCargas: string;
  fazendaCardsHtml: string;
  fazendaListHtml: string;
  talhaoTbodyHtml: string;
  talhaoTfootHtml: string;
  chartBarsHtml: string;
  chartTotalSc: string;
  chartQtdVariedades: string;
  chartHectaresTotal: string;
  chartScHaMedia: string;
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

function ymdToBr(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function getYesterdayYmdSp(): string {
  const todaySp = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
  const [y, m, d] = todaySp.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isFinalizado(val: unknown): boolean {
  const f = foldKey(String(val ?? ''));
  return (
    f === 's' ||
    f === 'sim' ||
    f === 'y' ||
    f === 'yes' ||
    f === '1' ||
    f === 'finalizado'
  );
}

function finalizadoBadge(allFinalizado: boolean): string {
  if (allFinalizado) {
    return `<span class="badge-status badge-status--ok">Finalizado</span>`;
  }
  return `<span class="badge-status badge-status--pending">Em andamento</span>`;
}

function cargasLabel(n: number): string {
  return n === 1 ? '1 carga' : `${fmtInt(n)} cargas`;
}

function talhaoLabel(n: number): string {
  return n === 1 ? '1 talhão' : `${fmtInt(n)} talhões`;
}

function hectaresLabel(n: number): string {
  return n === 1 ? '1 hectare colhido' : `${fmtDec(n)} hectares colhidos`;
}

function parseAreaFazendaRows(rows: RawRow[]): Map<string, number> {
  const byFazenda = new Map<string, number>();
  for (const row of rows) {
    const fazenda = String(pickCol(row, 'fazenda') ?? '').trim();
    if (!fazenda) {
      continue;
    }
    byFazenda.set(fazenda, toNum(pickCol(row, 'hectares')));
  }
  return byFazenda;
}

export function parseProducaoMilhoDiaAnteriorStats(
  rows: RawRow[],
): ProducaoMilhoDiaAnteriorStats {
  const row = rows[0];
  if (!row) {
    return { kg: 0, cargas: 0 };
  }
  return {
    kg: toNum(pickCol(row, 'peso_liquido')),
    cargas: toNum(pickCol(row, 'qtd_carga')),
  };
}

interface TalhaoRow {
  fazenda: string;
  talhao: string;
  variedade: string;
  cargas: number;
  pesoLiquido: number;
  percUmidade: number;
  desUmidade: number;
  desImpureza: number;
  sc60: number;
  hectares: number;
  hectaresColhidos: number;
  scHa: number;
  allFinalizado: boolean;
}

interface VariedadeAgg {
  variedade: string;
  sc: number;
  talhoes: Set<string>;
  hectaresColhidosByTalhao: Map<string, number>;
}

export function aggregateProducaoMilho(
  rows: RawRow[],
  anteriorStats: ProducaoMilhoDiaAnteriorStats = { kg: 0, cargas: 0 },
  areaFazendaRows: RawRow[] = [],
): ProducaoMilhoData {
  const yesterdayBr = ymdToBr(getYesterdayYmdSp());
  const areaByFazenda = parseAreaFazendaRows(areaFazendaRows);

  let totalKg = 0;
  let totalCargas = 0;
  let totalSc60 = 0;
  let totalHectaresColhidos = 0;

  const byFazenda = new Map<string, number>();
  const byFazendaSc60 = new Map<string, number>();
  // Sum hectares_colhidos across all talhão+variedade rows (SQL is already
  // per variedade; MAX-by-talhão undercounted shared talhões with 2+ varieties).
  const byFazendaHaColhidos = new Map<string, number>();
  const talhoes: TalhaoRow[] = [];
  const byVariedade = new Map<string, VariedadeAgg>();

  for (const row of rows) {
    const fazenda =
      String(pickCol(row, 'fazenda') ?? '— Sem fazenda').trim() ||
      '— Sem fazenda';
    const talhao = String(pickCol(row, 'talhao') ?? '—').trim() || '—';
    const variedade =
      String(pickCol(row, 'variedade') ?? '— Sem variedade').trim() ||
      '— Sem variedade';
    const cargas = toNum(pickCol(row, 'qtd_carga'));
    const peso = toNum(pickCol(row, 'peso_liquido'));
    const percUmidade = toNum(pickCol(row, 'perc_umidade'));
    const desUmidade = toNum(pickCol(row, 'desc_umidade'));
    const desImpureza = toNum(pickCol(row, 'desc_impureza'));
    const sc60 = toNum(pickCol(row, 'qtd_sc60')) || peso / KG_POR_SACA;
    const hectares = toNum(pickCol(row, 'hectares'));
    const hectaresColhidos = toNum(pickCol(row, 'hectares_colhidos'));
    const scHa = toNum(pickCol(row, 'qtd_sc_hectares'));
    const fin = isFinalizado(pickCol(row, 'finalizado'));

    totalKg += peso;
    totalCargas += cargas;
    totalSc60 += sc60;
    totalHectaresColhidos += hectaresColhidos;
    byFazenda.set(fazenda, (byFazenda.get(fazenda) ?? 0) + peso);
    byFazendaSc60.set(fazenda, (byFazendaSc60.get(fazenda) ?? 0) + sc60);

    if (talhao !== '—' && hectaresColhidos > 0) {
      byFazendaHaColhidos.set(
        fazenda,
        (byFazendaHaColhidos.get(fazenda) ?? 0) + hectaresColhidos,
      );
    }

    talhoes.push({
      fazenda,
      talhao,
      variedade,
      cargas,
      pesoLiquido: peso,
      percUmidade,
      desUmidade,
      desImpureza,
      sc60,
      hectares,
      hectaresColhidos,
      scHa,
      allFinalizado: fin,
    });

    const curVar = byVariedade.get(variedade) ?? {
      variedade,
      sc: 0,
      talhoes: new Set<string>(),
      hectaresColhidosByTalhao: new Map<string, number>(),
    };
    curVar.sc += sc60;
    if (talhao !== '—') {
      curVar.talhoes.add(`${fazenda}\0${talhao}`);
    }
    const haKey = `${fazenda}\0${talhao}`;
    const prevHa = curVar.hectaresColhidosByTalhao.get(haKey) ?? 0;
    if (hectaresColhidos > prevHa) {
      curVar.hectaresColhidosByTalhao.set(haKey, hectaresColhidos);
    }
    byVariedade.set(variedade, curVar);
  }

  const totalFmt = fmtKgSc(totalKg);
  const anteriorFmt = fmtKgSc(anteriorStats.kg);
  const mediaScHa =
    totalHectaresColhidos > 0 ? totalSc60 / totalHectaresColhidos : 0;

  const allFazendaNames = new Set<string>([
    ...areaByFazenda.keys(),
    ...byFazendaSc60.keys(),
  ]);
  const fazendasCardsSorted = [...allFazendaNames].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  const fazendaCardsHtml =
    fazendasCardsSorted.length === 0
      ? `<div class="empty-state-msg">Nenhuma fazenda cadastrada na safra ${MILHO_SAFRA_DESCRICAO}.</div>`
      : fazendasCardsSorted
          .map((nome) => {
            const haTotal = areaByFazenda.get(nome) ?? 0;
            const haColhidos = byFazendaHaColhidos.get(nome) ?? 0;
            const sc60Fazenda = byFazendaSc60.get(nome) ?? 0;
            const pctColheita =
              haTotal > 0
                ? Math.round((100 * haColhidos) / haTotal)
                : haColhidos > 0
                  ? 100
                  : 0;
            const mediaScHaFazenda =
              haColhidos > 0 ? fmtDec(sc60Fazenda / haColhidos) : '—';
            const pctLabel = haTotal > 0 ? `${pctColheita}%` : '—';

            return `<div class="card card-fazenda">
          <div class="card-label">Fazenda</div>
          <div class="card-title">${escapeHtml(nome)}</div>
          <div class="card-fazenda-stat">
            <span class="card-fazenda-stat-label">Área total</span>
            <span class="card-fazenda-stat-value">${fmtDec(haTotal)} <span class="text-unit-small">ha</span></span>
          </div>
          <div class="card-fazenda-stat">
            <span class="card-fazenda-stat-label">Colhido</span>
            <span class="card-fazenda-stat-value">${haColhidos > 0 ? fmtDec(haColhidos) : '0,00'} <span class="text-unit-small">ha</span> <span class="card-fazenda-pct">(${pctLabel})</span></span>
          </div>
          <div class="card-fazenda-stat card-fazenda-stat--media">
            <span class="card-fazenda-stat-label">Média SC 60 / ha</span>
            <span class="card-fazenda-stat-value card-fazenda-media">${mediaScHaFazenda}${mediaScHaFazenda !== '—' ? ' <span class="text-unit-small">SC/ha</span>' : ''}</span>
          </div>
        </div>`;
          })
          .join('\n');

  const fazendasSorted = [...byFazenda.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'pt-BR'),
  );
  const fazendaListHtml =
    fazendasSorted.length === 0
      ? `<div class="empty-state-msg">Nenhuma pesagem registrada.</div>`
      : fazendasSorted
          .map(([nome, kg]) => {
            const { kg: kgS, sc } = fmtKgSc(kg);
            return `<div class="filial-item">
          <div class="filial-name">${escapeHtml(nome)}</div>
          <div class="filial-peso">${kgS}<small>KG</small></div>
          <div class="filial-sc">${sc}<small>SC</small></div>
        </div>`;
          })
          .join('\n');

  talhoes.sort((a, b) => {
    const c = a.fazenda.localeCompare(b.fazenda, 'pt-BR');
    if (c !== 0) {
      return c;
    }
    const d = a.talhao.localeCompare(b.talhao, 'pt-BR');
    if (d !== 0) {
      return d;
    }
    return a.variedade.localeCompare(b.variedade, 'pt-BR');
  });

  let footCargas = 0;
  let footPeso = 0;
  let footDesUmidade = 0;
  let footDesImpureza = 0;
  let footSc = 0;
  let footHa = 0;
  let footHaColhidos = 0;

  const talhaoTbodyHtml =
    talhoes.length === 0
      ? `<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--texto-suave);">Nenhum talhão com pesagem registrada.</td></tr>`
      : talhoes
          .map((t) => {
            footCargas += t.cargas;
            footPeso += t.pesoLiquido;
            footDesUmidade += t.desUmidade;
            footDesImpureza += t.desImpureza;
            footSc += t.sc60;
            footHa += t.hectares;
            footHaColhidos += t.hectaresColhidos;
            return `<tr>
            <td class="filial-td">${escapeHtml(t.fazenda)}</td>
            <td>${escapeHtml(t.talhao)}</td>
            <td>${escapeHtml(t.variedade)}</td>
            <td class="num">${fmtInt(t.cargas)}</td>
            <td class="num">${fmtInt(t.pesoLiquido)}</td>
            <td class="num">${fmtDec(t.percUmidade)}</td>
            <td class="num">${fmtInt(t.desUmidade)}</td>
            <td class="num">${fmtInt(t.desImpureza)}</td>
            <td class="num">${fmtDec(t.sc60)}</td>
            <td class="num">${fmtInt(t.hectares)}</td>
            <td class="num">${t.hectaresColhidos > 0 ? fmtDec(t.hectaresColhidos) : '—'}</td>
            <td class="num">${t.hectaresColhidos > 0 ? fmtDec(t.scHa) : '—'}</td>
            <td>${finalizadoBadge(t.allFinalizado)}</td>
          </tr>`;
          })
          .join('\n');

  const scHaMediaFoot =
    footHaColhidos > 0 ? fmtDec(footSc / footHaColhidos) : '—';
  const talhaoTfootHtml =
    talhoes.length === 0
      ? ''
      : `<tr>
            <td colspan="3">TOTAL · ${talhaoLabel(talhoes.length)}</td>
            <td class="num">${fmtInt(footCargas)}</td>
            <td class="num">${fmtInt(footPeso)}</td>
            <td class="num">—</td>
            <td class="num">${fmtInt(footDesUmidade)}</td>
            <td class="num">${fmtInt(footDesImpureza)}</td>
            <td class="num">${fmtDec(footSc)}</td>
            <td class="num">${fmtInt(footHa)}</td>
            <td class="num">${footHaColhidos > 0 ? fmtDec(footHaColhidos) : '—'}</td>
            <td class="num">${scHaMediaFoot}</td>
            <td></td>
          </tr>`;

  const variedades = [...byVariedade.values()].sort((a, b) => b.sc - a.sc);
  const maxSc = variedades.length > 0 ? variedades[0].sc : 0;
  let chartTotalSc = 0;
  let chartHectaresColhidos = 0;

  for (const v of variedades) {
    chartTotalSc += v.sc;
    chartHectaresColhidos += [
      ...v.hectaresColhidosByTalhao.values(),
    ].reduce((a, b) => a + b, 0);
  }

  const chartBarsHtml =
    variedades.length === 0
      ? `<div class="empty-state-msg" style="padding:20px;">Nenhuma variedade registrada.</div>`
      : variedades
          .map((v) => {
            const haTotal = [...v.hectaresColhidosByTalhao.values()].reduce(
              (a, b) => a + b,
              0,
            );
            const pct = maxSc > 0 ? Math.round((100 * v.sc) / maxSc) : 0;
            const width = Math.max(pct, v.sc > 0 ? 8 : 0);
            const pctTotal =
              chartTotalSc > 0 ? Math.round((100 * v.sc) / chartTotalSc) : 0;
            return `<div class="chart-bar-row">
        <div class="chart-bar-label">
          <span class="chart-bar-variety">${escapeHtml(v.variedade)}</span>
          <span class="chart-bar-meta">${talhaoLabel(v.talhoes.size)} · ${fmtDec(haTotal)} ha colhidos</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${width}%;">
            <span class="chart-bar-value">${fmtDec(v.sc)} SC</span>
          </div>
        </div>
        <div class="chart-bar-percent">${pctTotal}%</div>
      </div>`;
          })
          .join('\n');

  const chartScHaMedia =
    chartHectaresColhidos > 0 ? chartTotalSc / chartHectaresColhidos : 0;

  return {
    totalKg: totalFmt.kg,
    totalSc: totalFmt.sc,
    totalCargas: cargasLabel(totalCargas),
    anteriorDataBr: yesterdayBr,
    anteriorKg: anteriorFmt.kg,
    anteriorSc: anteriorFmt.sc,
    anteriorCargas: cargasLabel(anteriorStats.cargas),
    mediaScHa: totalHectaresColhidos > 0 ? fmtDec(mediaScHa) : '—',
    mediaScHaHectares:
      totalHectaresColhidos > 0
        ? hectaresLabel(totalHectaresColhidos)
        : 'Sem hectares colhidos',
    qtdCargas: fmtInt(totalCargas),
    fazendaCardsHtml,
    fazendaListHtml,
    talhaoTbodyHtml,
    talhaoTfootHtml,
    chartBarsHtml,
    chartTotalSc: fmtDec(chartTotalSc),
    chartQtdVariedades: fmtInt(variedades.length),
    chartHectaresTotal: fmtDec(chartHectaresColhidos),
    chartScHaMedia:
      chartHectaresColhidos > 0 ? fmtDec(chartScHaMedia) : '—',
  };
}
