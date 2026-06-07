/**
 * Agrega as linhas brutas da query Oracle de "Produção de Milho em Grãos" nas
 * estruturas que alimentam o template HTML (cards, filiais, tabela por talhão e
 * gráfico por variedade). Cada linha de entrada equivale a uma carga/ticket.
 */

const SACA_KG = 60;

export interface ProducaoMilhoTotais {
  kg: number;
  sc: number;
  cargas: number;
}

export interface ProducaoMilhoDia {
  /** Rótulo dd/mm/aaaa do dia (ou '—' quando não há dia anterior). */
  dateLabel: string;
  kg: number;
  sc: number;
  cargas: number;
}

export interface ProducaoMilhoFilial {
  name: string;
  kg: number;
  sc: number;
}

export interface ProducaoMilhoTalhao {
  filial: string;
  talhao: string;
  variedade: string;
  cargas: number;
  kg: number;
  umidadeMedia: number;
  descUmidade: number;
  descImpureza: number;
  sc: number;
  hectares: number;
  scPorHa: number;
  finalizado: boolean;
}

export interface ProducaoMilhoTalhoesTotal {
  nTalhoes: number;
  cargas: number;
  kg: number;
  descUmidade: number;
  descImpureza: number;
  sc: number;
  hectares: number;
  scPorHa: number;
}

export interface ProducaoMilhoVariedade {
  variedade: string;
  sc: number;
  nTalhoes: number;
  hectares: number;
  /** Largura da barra: percentual relativo à variedade de maior SC. */
  widthPercent: number;
  /** Rótulo: participação no total de SC (soma 100% entre variedades). */
  percent: number;
}

export interface ProducaoMilhoVariedadesTotal {
  sc: number;
  nVariedades: number;
  hectares: number;
  scPorHaMedia: number;
}

export interface ProducaoMilhoData {
  total: ProducaoMilhoTotais;
  diaAtual: ProducaoMilhoDia;
  diaAnterior: ProducaoMilhoDia;
  filiais: ProducaoMilhoFilial[];
  talhoes: ProducaoMilhoTalhao[];
  talhoesTotal: ProducaoMilhoTalhoesTotal;
  variedades: ProducaoMilhoVariedade[];
  variedadesTotal: ProducaoMilhoVariedadesTotal;
}

type RawRow = Record<string, unknown>;

function pick(row: RawRow, key: string): unknown {
  if (key in row) {
    return row[key];
  }
  // Acesso case-insensitive (oracledb devolve as colunas em MAIÚSCULAS).
  const upper = key.toUpperCase();
  for (const k of Object.keys(row)) {
    if (k.toUpperCase() === upper) {
      return row[k];
    }
  }
  return undefined;
}

function num(v: unknown): number {
  if (v == null) {
    return 0;
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0;
  }
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  if (v == null) {
    return '';
  }
  return String(v).trim();
}

function isFinalizado(v: unknown): boolean {
  const s = str(v).toUpperCase();
  return s === 'S' || s === '1' || s === 'SIM' || s === 'T' || s === 'Y';
}

/** Componentes de calendário (ano-mês-dia) usados para agrupar por dia. */
function dayParts(v: unknown): { key: string; label: string } | null {
  if (v == null) {
    return null;
  }
  let d: Date | null = null;
  if (v instanceof Date) {
    d = v;
  } else {
    const s = String(v);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      // Tenta formato dd/mm/aaaa
      const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        return {
          key: `${m[3]}-${m[2]}-${m[1]}`,
          label: `${m[1]}/${m[2]}/${m[3]}`,
        };
      }
    }
  }
  if (!d) {
    return null;
  }
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    key: `${y}-${pad(mo)}-${pad(da)}`,
    label: `${pad(da)}/${pad(mo)}/${y}`,
  };
}

function toSc(kg: number): number {
  return kg / SACA_KG;
}

const EMPTY_DIA: ProducaoMilhoDia = {
  dateLabel: '—',
  kg: 0,
  sc: 0,
  cargas: 0,
};

export function aggregateProducaoMilho(rows: RawRow[]): ProducaoMilhoData {
  // --- Totais e por dia ---
  let totalKg = 0;
  const totalCargas = rows.length;
  const porDia = new Map<
    string,
    { label: string; kg: number; cargas: number }
  >();

  // --- Por filial ---
  const filialMap = new Map<string, { kg: number }>();

  // --- Por talhão (filial + talhão + variedade) ---
  interface TalhaoAcc {
    filial: string;
    talhao: string;
    variedade: string;
    cargas: number;
    kg: number;
    umidadeSoma: number;
    descUmidade: number;
    descImpureza: number;
    hectares: number;
    finalizado: boolean;
  }
  const talhaoMap = new Map<string, TalhaoAcc>();

  for (const row of rows) {
    const peso = num(pick(row, 'PESO_LIQUIDO'));
    totalKg += peso;

    const dp = dayParts(pick(row, 'DT_ENTRADA'));
    if (dp) {
      const cur = porDia.get(dp.key) ?? { label: dp.label, kg: 0, cargas: 0 };
      cur.kg += peso;
      cur.cargas += 1;
      porDia.set(dp.key, cur);
    }

    const filial = str(pick(row, 'FILIAL')) || '—';
    const fil = filialMap.get(filial) ?? { kg: 0 };
    fil.kg += peso;
    filialMap.set(filial, fil);

    const talhao = str(pick(row, 'TALHAO')) || '—';
    const variedade = str(pick(row, 'VARIEDADE')) || '—';
    const key = `${filial}||${talhao}||${variedade}`;
    const acc =
      talhaoMap.get(key) ??
      ({
        filial,
        talhao,
        variedade,
        cargas: 0,
        kg: 0,
        umidadeSoma: 0,
        descUmidade: 0,
        descImpureza: 0,
        hectares: 0,
        finalizado: false,
      } as TalhaoAcc);
    acc.cargas += 1;
    acc.kg += peso;
    acc.umidadeSoma += num(pick(row, 'PERC_UMIDADE'));
    acc.descUmidade += num(pick(row, 'DES_UMIDADE'));
    acc.descImpureza += num(pick(row, 'DES_IMPUREZA'));
    // Hectares é propriedade do talhão (não soma por carga): usa primeiro valor.
    const ha = num(pick(row, 'HECTARES'));
    if (acc.hectares === 0 && ha > 0) {
      acc.hectares = ha;
    }
    if (isFinalizado(pick(row, 'FINALIZADO'))) {
      acc.finalizado = true;
    }
    talhaoMap.set(key, acc);
  }

  // --- Dia atual / dia anterior (datas com dados, mais recentes) ---
  const diasOrdenados = [...porDia.entries()].sort((a, b) =>
    a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0,
  );
  const diaAtual: ProducaoMilhoDia = diasOrdenados[0]
    ? {
        dateLabel: diasOrdenados[0][1].label,
        kg: diasOrdenados[0][1].kg,
        sc: toSc(diasOrdenados[0][1].kg),
        cargas: diasOrdenados[0][1].cargas,
      }
    : { ...EMPTY_DIA };
  const diaAnterior: ProducaoMilhoDia = diasOrdenados[1]
    ? {
        dateLabel: diasOrdenados[1][1].label,
        kg: diasOrdenados[1][1].kg,
        sc: toSc(diasOrdenados[1][1].kg),
        cargas: diasOrdenados[1][1].cargas,
      }
    : { ...EMPTY_DIA };

  // --- Filiais ---
  const filiais: ProducaoMilhoFilial[] = [...filialMap.entries()]
    .map(([name, v]) => ({ name, kg: v.kg, sc: toSc(v.kg) }))
    .sort((a, b) => b.kg - a.kg);

  // --- Talhões ---
  const talhoes: ProducaoMilhoTalhao[] = [...talhaoMap.values()]
    .map((a) => ({
      filial: a.filial,
      talhao: a.talhao,
      variedade: a.variedade,
      cargas: a.cargas,
      kg: a.kg,
      umidadeMedia: a.cargas > 0 ? a.umidadeSoma / a.cargas : 0,
      descUmidade: a.descUmidade,
      descImpureza: a.descImpureza,
      sc: toSc(a.kg),
      hectares: a.hectares,
      scPorHa: a.hectares > 0 ? toSc(a.kg) / a.hectares : 0,
      finalizado: a.finalizado,
    }))
    .sort(
      (a, b) =>
        a.filial.localeCompare(b.filial) ||
        a.talhao.localeCompare(b.talhao) ||
        a.variedade.localeCompare(b.variedade),
    );

  const talhoesHectaresTotal = talhoes.reduce((s, t) => s + t.hectares, 0);
  const talhoesTotal: ProducaoMilhoTalhoesTotal = {
    nTalhoes: talhoes.length,
    cargas: talhoes.reduce((s, t) => s + t.cargas, 0),
    kg: totalKg,
    descUmidade: talhoes.reduce((s, t) => s + t.descUmidade, 0),
    descImpureza: talhoes.reduce((s, t) => s + t.descImpureza, 0),
    sc: toSc(totalKg),
    hectares: talhoesHectaresTotal,
    scPorHa: talhoesHectaresTotal > 0 ? toSc(totalKg) / talhoesHectaresTotal : 0,
  };

  // --- Variedades (gráfico) ---
  const variedadeMap = new Map<
    string,
    { kg: number; nTalhoes: number; hectares: number }
  >();
  for (const t of talhoes) {
    const v = variedadeMap.get(t.variedade) ?? {
      kg: 0,
      nTalhoes: 0,
      hectares: 0,
    };
    v.kg += t.kg;
    v.nTalhoes += 1;
    v.hectares += t.hectares;
    variedadeMap.set(t.variedade, v);
  }
  const variedadesRaw = [...variedadeMap.entries()]
    .map(([variedade, v]) => ({
      variedade,
      sc: toSc(v.kg),
      nTalhoes: v.nTalhoes,
      hectares: v.hectares,
    }))
    .sort((a, b) => b.sc - a.sc);
  const maxSc = variedadesRaw.length > 0 ? variedadesRaw[0].sc : 0;
  const totalSc = toSc(totalKg);
  const variedades: ProducaoMilhoVariedade[] = variedadesRaw.map((v) => ({
    ...v,
    widthPercent: maxSc > 0 ? (v.sc / maxSc) * 100 : 0,
    percent: totalSc > 0 ? (v.sc / totalSc) * 100 : 0,
  }));

  const variedadesHectaresTotal = variedades.reduce(
    (s, v) => s + v.hectares,
    0,
  );
  const variedadesTotal: ProducaoMilhoVariedadesTotal = {
    sc: toSc(totalKg),
    nVariedades: variedades.length,
    hectares: variedadesHectaresTotal,
    scPorHaMedia:
      variedadesHectaresTotal > 0 ? toSc(totalKg) / variedadesHectaresTotal : 0,
  };

  return {
    total: { kg: totalKg, sc: toSc(totalKg), cargas: totalCargas },
    diaAtual,
    diaAnterior,
    filiais,
    talhoes,
    talhoesTotal,
    variedades,
    variedadesTotal,
  };
}
