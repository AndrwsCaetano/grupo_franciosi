/**
 * Agrega linhas do relatório "Estoque de Insumos (Franciosi TGA)".
 * Portado de jarvis_report/estoqueInsumosBlock.ts.
 */

type RawRow = Record<string, unknown>;

export interface EstoqueInsumosData {
  qtdProdutos: number;
  qtdFazendas: number;
  qtdGrupos: number;
  qtdSaldos: number;
  gruposLabel: string;
  linhasLabel: string;
  cardsGruposHtml: string;
  theadFazendasHtml: string;
  tbodyHtml: string;
  tfootHtml: string;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function fmtSaldo(n: number): string {
  if (!Number.isFinite(n) || n === 0) {
    return '0';
  }
  if (Number.isInteger(n)) {
    return n.toLocaleString('pt-BR');
  }
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeUnidade(raw: string): { sigla: string; cssClass: string } {
  const trimmed = (raw ?? '').trim().toUpperCase();
  if (trimmed === 'KG') {
    return { sigla: 'KG', cssClass: 'u-kg' };
  }
  if (
    trimmed === 'LT' ||
    trimmed === 'L' ||
    trimmed === 'LITRO' ||
    trimmed === 'LITROS'
  ) {
    return { sigla: 'LT', cssClass: 'u-lt' };
  }
  if (
    trimmed === 'UN' ||
    trimmed === 'UND' ||
    trimmed === 'PC' ||
    trimmed === 'PCT'
  ) {
    return { sigla: 'UN', cssClass: 'u-un' };
  }
  return { sigla: trimmed || '—', cssClass: 'u-default' };
}

interface GrupoMeta {
  className: string;
  badge: string;
  cardTitle: string;
  iconSvg: string;
}

const GRUPO_DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>`;

function resolveGrupoMeta(codgrupo: string, grupoLabel: string): GrupoMeta {
  const cod = (codgrupo ?? '').trim();
  const label = (grupoLabel ?? '').trim();
  if (cod === '752302') {
    return {
      className: 'defensivos',
      badge: 'DEFENSIVOS',
      cardTitle: label || 'Defensivos',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>`,
    };
  }
  if (cod === '752202') {
    return {
      className: 'fertilizantes',
      badge: 'FERTILIZANTES',
      cardTitle: label || 'Fertilizantes',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5-3 8-7 8-12V5l-8-3-8 3v5c0 5 3 9 8 12z"/><path d="M9 12l2 2 4-4"/></svg>`,
    };
  }
  if (cod === '752402') {
    return {
      className: 'sementes',
      badge: 'SEMENTES',
      cardTitle: label || 'Sementes',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="5" ry="9"/><path d="M12 3v18"/></svg>`,
    };
  }
  return {
    className: 'outros',
    badge: (label || cod || 'OUTROS').toUpperCase(),
    cardTitle: label || `Grupo ${cod}`,
    iconSvg: GRUPO_DEFAULT_ICON,
  };
}

interface ProdutoAgg {
  produto: string;
  codProduto: string;
  unidade: string;
  unidadeRaw: string;
  saldoPorFazenda: Map<string, number>;
}

interface SubGrupoAgg {
  subgrupo: string;
  produtos: Map<string, ProdutoAgg>;
}

interface GrupoAgg {
  codgrupo: string;
  grupo: string;
  meta: GrupoMeta;
  subgrupos: Map<string, SubGrupoAgg>;
  totaisPorUnidade: Map<string, number>;
  produtosUnicos: Set<string>;
}

function aggregateRows(rows: RawRow[]): {
  fazendas: string[];
  grupos: GrupoAgg[];
  totalProdutos: number;
  saldosCount: number;
} {
  const fazendasSet = new Set<string>();
  const gruposMap = new Map<string, GrupoAgg>();
  let saldosCount = 0;
  let totalProdutosCount = 0;

  for (const row of rows) {
    const saldo = toNum(pickCol(row, 'saldo'));
    if (saldo === 0) {
      continue;
    }
    saldosCount++;

    const fazenda = String(pickCol(row, 'fazenda') ?? '').trim();
    if (!fazenda) {
      continue;
    }
    fazendasSet.add(fazenda);

    const codgrupo = String(pickCol(row, 'codgrupo') ?? '').trim();
    const grupoLabel =
      String(pickCol(row, 'grupo') ?? '').trim() || 'Sem grupo';
    const subgrupo = String(pickCol(row, 'subgrupo') ?? '').trim() || '—';
    const produto =
      String(pickCol(row, 'produto') ?? '').trim() || '(sem nome)';
    const codProduto = String(pickCol(row, 'cod_produto') ?? '').trim();
    const unidadeRaw = String(pickCol(row, 'unidade') ?? '').trim();

    const grupoKey = codgrupo || grupoLabel;
    let g = gruposMap.get(grupoKey);
    if (!g) {
      g = {
        codgrupo,
        grupo: grupoLabel,
        meta: resolveGrupoMeta(codgrupo, grupoLabel),
        subgrupos: new Map(),
        totaisPorUnidade: new Map(),
        produtosUnicos: new Set(),
      };
      gruposMap.set(grupoKey, g);
    }

    let sg = g.subgrupos.get(subgrupo);
    if (!sg) {
      sg = { subgrupo, produtos: new Map() };
      g.subgrupos.set(subgrupo, sg);
    }

    const produtoKey = codProduto || produto;
    let p = sg.produtos.get(produtoKey);
    if (!p) {
      p = {
        produto,
        codProduto,
        unidade: normalizeUnidade(unidadeRaw).sigla,
        unidadeRaw,
        saldoPorFazenda: new Map(),
      };
      sg.produtos.set(produtoKey, p);
      g.produtosUnicos.add(produtoKey);
      totalProdutosCount++;
    }
    p.saldoPorFazenda.set(
      fazenda,
      (p.saldoPorFazenda.get(fazenda) ?? 0) + saldo,
    );

    const u = normalizeUnidade(unidadeRaw).sigla;
    g.totaisPorUnidade.set(u, (g.totaisPorUnidade.get(u) ?? 0) + saldo);
  }

  const fazendas = [...fazendasSet].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  const groupOrder: Record<string, number> = {
    '752302': 0,
    '752202': 1,
    '752402': 2,
  };
  const grupos = [...gruposMap.values()].sort((a, b) => {
    const oa = groupOrder[a.codgrupo] ?? 99;
    const ob = groupOrder[b.codgrupo] ?? 99;
    if (oa !== ob) {
      return oa - ob;
    }
    return a.grupo.localeCompare(b.grupo, 'pt-BR');
  });

  return { fazendas, grupos, totalProdutos: totalProdutosCount, saldosCount };
}

function buildCardsGruposHtml(grupos: GrupoAgg[]): string {
  if (grupos.length === 0) {
    return `<div style="grid-column:1/-1;text-align:center;padding:24px;color:#6b7280;font-size:0.9rem">Nenhum saldo de insumo encontrado.</div>`;
  }
  return grupos
    .map((g) => {
      const metrics: string[] = [];
      const unidades = [...g.totaisPorUnidade.keys()].sort((a, b) => {
        const order: Record<string, number> = { KG: 0, LT: 1, UN: 2 };
        const oa = order[a] ?? 9;
        const ob = order[b] ?? 9;
        if (oa !== ob) {
          return oa - ob;
        }
        return a.localeCompare(b);
      });
      for (const u of unidades) {
        const total = g.totaisPorUnidade.get(u) ?? 0;
        if (total === 0) {
          continue;
        }
        metrics.push(
          `<div class="metric-row"><span class="metric-label-sm">Saldo em ${escapeHtml(u)}</span><span class="metric-value-md">${escapeHtml(fmtSaldo(total))}<span class="metric-unit">${escapeHtml(u)}</span></span></div>`,
        );
      }
      metrics.push(
        `<div class="metric-row"><span class="metric-label-sm">Produtos cadastrados</span><span class="metric-value-lg">${escapeHtml(fmtSaldo(g.produtosUnicos.size))}</span></div>`,
      );

      return `<div class="card card-${g.meta.className}">
      <div class="card-icon-wrapper">${g.meta.iconSvg}</div>
      <div class="card-sector">Grupo</div>
      <h3 class="card-title">${escapeHtml(g.meta.cardTitle)}</h3>
      <div class="card-metrics">
        ${metrics.join('\n        ')}
      </div>
    </div>`;
    })
    .join('\n');
}

function shortFazendaLabel(raw: string): string {
  const cleaned = raw.replace(/^FAZ(ENDA)?\b\.?\s*/i, '').trim();
  if (!cleaned) {
    return raw;
  }
  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      if (w.length <= 2) {
        return w.charAt(0).toUpperCase() + w.slice(1) + '.';
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .replace(/\.$/, '');
}

function buildTheadFazendasHtml(fazendas: string[]): string {
  if (fazendas.length === 0) {
    return '';
  }
  return fazendas
    .map(
      (f) =>
        `<th class="th-fazenda" title="${escapeHtml(f)}">${escapeHtml(shortFazendaLabel(f))}</th>`,
    )
    .join('');
}

function buildTbodyHtml(grupos: GrupoAgg[], fazendas: string[]): string {
  if (grupos.length === 0) {
    const colspan = fazendas.length + 3;
    return `<tr><td colspan="${colspan}" style="text-align:center;padding:24px;color:#6b7280">Nenhum saldo encontrado.</td></tr>`;
  }

  const colspan = fazendas.length + 3;
  const parts: string[] = [];

  for (const g of grupos) {
    const grupoBadgeLabel = escapeHtml(g.meta.badge);
    const produtosTotal = g.produtosUnicos.size;
    parts.push(
      `<tr class="row-grupo grupo-${g.meta.className}" data-grupo="${grupoBadgeLabel}"><td colspan="${colspan}"><span class="grupo-badge">${grupoBadgeLabel}</span><span class="grupo-info">${produtosTotal} produto${produtosTotal === 1 ? '' : 's'}</span></td></tr>`,
    );

    const subgruposOrdenados = [...g.subgrupos.values()].sort((a, b) =>
      a.subgrupo.localeCompare(b.subgrupo, 'pt-BR'),
    );

    for (const sg of subgruposOrdenados) {
      const sgLabel = escapeHtml(sg.subgrupo);
      parts.push(
        `<tr class="row-subgrupo" data-grupo="${grupoBadgeLabel}" data-subgrupo="${sgLabel}"><td colspan="${colspan}">${sgLabel}</td></tr>`,
      );

      const produtosOrdenados = [...sg.produtos.values()].sort((a, b) =>
        a.produto.localeCompare(b.produto, 'pt-BR'),
      );

      for (const p of produtosOrdenados) {
        const unInfo = normalizeUnidade(p.unidadeRaw);
        const saldos = fazendas.map((f) => p.saldoPorFazenda.get(f) ?? 0);
        const totalLinha = saldos.reduce((acc, n) => acc + n, 0);
        const cells = saldos
          .map((s) =>
            s === 0
              ? `<td class="c-saldo c-zero">—</td>`
              : `<td class="c-saldo">${escapeHtml(fmtSaldo(s))}</td>`,
          )
          .join('');
        const searchKey = foldKey(
          `${g.meta.badge} ${sg.subgrupo} ${p.produto} ${unInfo.sigla}`,
        );
        parts.push(
          `<tr class="row-prod" data-grupo="${grupoBadgeLabel}" data-subgrupo="${sgLabel}" data-search="${escapeHtml(searchKey)}"><td class="c-produto">${escapeHtml(p.produto)}</td><td class="c-unid"><span class="unid-pill ${unInfo.cssClass}">${escapeHtml(unInfo.sigla)}</span></td>${cells}<td class="c-saldo c-total-linha">${escapeHtml(fmtSaldo(totalLinha))}</td></tr>`,
        );
      }
    }
  }

  return parts.join('\n');
}

function buildTfootHtml(grupos: GrupoAgg[], fazendas: string[]): string {
  if (grupos.length === 0 || fazendas.length === 0) {
    return '';
  }

  const porUnidade = new Map<
    string,
    { porFazenda: Map<string, number>; total: number; cssClass: string }
  >();
  for (const g of grupos) {
    for (const sg of g.subgrupos.values()) {
      for (const p of sg.produtos.values()) {
        const unInfo = normalizeUnidade(p.unidadeRaw);
        const bucket = porUnidade.get(unInfo.sigla) ?? {
          porFazenda: new Map(),
          total: 0,
          cssClass: unInfo.cssClass,
        };
        for (const [fz, s] of p.saldoPorFazenda) {
          bucket.porFazenda.set(fz, (bucket.porFazenda.get(fz) ?? 0) + s);
          bucket.total += s;
        }
        porUnidade.set(unInfo.sigla, bucket);
      }
    }
  }

  const ordemUnidades = [...porUnidade.keys()].sort((a, b) => {
    const order: Record<string, number> = { KG: 0, LT: 1, UN: 2 };
    const oa = order[a] ?? 9;
    const ob = order[b] ?? 9;
    if (oa !== ob) {
      return oa - ob;
    }
    return a.localeCompare(b);
  });

  return ordemUnidades
    .map((u) => {
      const data = porUnidade.get(u)!;
      const cells = fazendas
        .map((f) => {
          const v = data.porFazenda.get(f) ?? 0;
          if (v === 0) {
            return `<td class="c-saldo c-zero">—</td>`;
          }
          return `<td class="c-saldo tf-num">${escapeHtml(fmtSaldo(v))}</td>`;
        })
        .join('');
      return `<tr class="row-total"><td class="tf-label">TOTAL · ${escapeHtml(u)}</td><td class="c-unid"><span class="unid-pill ${data.cssClass}">${escapeHtml(u)}</span></td>${cells}<td class="c-saldo tf-num tf-total-geral">${escapeHtml(fmtSaldo(data.total))}</td></tr>`;
    })
    .join('\n');
}

export function aggregateEstoqueInsumos(rows: RawRow[]): EstoqueInsumosData {
  const { fazendas, grupos, totalProdutos, saldosCount } = aggregateRows(rows);

  return {
    qtdProdutos: totalProdutos,
    qtdFazendas: fazendas.length,
    qtdGrupos: grupos.length,
    qtdSaldos: saldosCount,
    gruposLabel: `${grupos.length} grupo${grupos.length === 1 ? '' : 's'}`,
    linhasLabel: `${totalProdutos} linha${totalProdutos === 1 ? '' : 's'}`,
    cardsGruposHtml: buildCardsGruposHtml(grupos),
    theadFazendasHtml: buildTheadFazendasHtml(fazendas),
    tbodyHtml: buildTbodyHtml(grupos, fazendas),
    tfootHtml: buildTfootHtml(grupos, fazendas),
  };
}
