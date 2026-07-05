/**
 * Formata a linha única do relatório "Implantação ERP COMPASS (Franciosi TGA)".
 */
type RawRow = Record<string, unknown>;

export interface ImplantacaoErpData {
  registrosTotais: string;
  clienteFornecedor: string;
  qtdProdutos: string;
  qtdPedidoCompra: string;
  valorPedido: string;
  qtdNfEntrada: string;
  valorNfEntrada: string;
  qtdNfSaida: string;
  valorNfSaida: string;
  qtdItensSolicitados: string;
  qtdSolicitacaoCompra: string;
  qtdTitulosCp: string;
  totalContasPagar: string;
  totalPago: string;
  pctPago: string;
  qtdTitulosReceber: string;
  valorReceber: string;
  valorRecebido: string;
  pctRecebido: string;
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

function fmtInt(val: unknown): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) {
    return '0';
  }
  return Math.round(n).toLocaleString('pt-BR');
}

function fmtCurrency(val: unknown): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) {
    return '0,00';
  }
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(val: unknown): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) {
    return '0';
  }
  return String(Math.round(n));
}

export function aggregateImplantacaoErp(rows: RawRow[]): ImplantacaoErpData {
  const row = rows[0] ?? {};

  return {
    registrosTotais: fmtInt(pickCol(row, 'registros_totais')),
    clienteFornecedor: fmtInt(pickCol(row, 'cliente_fornecedor')),
    qtdProdutos: fmtInt(pickCol(row, 'qtd_produtos')),
    qtdPedidoCompra: fmtInt(pickCol(row, 'qtd_pedido_compra')),
    valorPedido: fmtCurrency(pickCol(row, 'valor_pedido')),
    qtdNfEntrada: fmtInt(pickCol(row, 'qtd_nf_entrada')),
    valorNfEntrada: fmtCurrency(pickCol(row, 'valor_nf_entrada')),
    qtdNfSaida: fmtInt(pickCol(row, 'qtd_nf_saida')),
    valorNfSaida: fmtCurrency(pickCol(row, 'valor_nf_saida')),
    qtdItensSolicitados: fmtInt(pickCol(row, 'qtd_itens_solicitados')),
    qtdSolicitacaoCompra: fmtInt(pickCol(row, 'qtd_solicitacao_compra')),
    qtdTitulosCp: fmtInt(pickCol(row, 'qtd_titulos_cp')),
    totalContasPagar: fmtCurrency(pickCol(row, 'total_contas_pagar')),
    totalPago: fmtCurrency(pickCol(row, 'total_pago')),
    pctPago: fmtPct(pickCol(row, 'pct_pago')),
    qtdTitulosReceber: fmtInt(pickCol(row, 'qtd_titulos_receber')),
    valorReceber: fmtCurrency(pickCol(row, 'valor_receber')),
    valorRecebido: fmtCurrency(pickCol(row, 'valor_recebido')),
    pctRecebido: fmtPct(pickCol(row, 'pct_recebido')),
  };
}
