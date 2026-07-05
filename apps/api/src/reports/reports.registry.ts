/**
 * Registro estático dos relatórios disponíveis. Cada relatório aponta para uma
 * fonte de dados (conexão) fixa e contém o SELECT que será executado nela.
 */
export interface ReportDefinition {
  slug: string;
  name: string;
  description: string;
  /**
   * Código da permissão específica deste relatório (uma por relatório).
   * Deve existir em packages/shared/src/permissions.ts como "reports.<slug>"
   * para aparecer nas liberações de acesso e na montagem de perfil.
   */
  permission: string;
  /** Id estável da DataSource Oracle (ver prisma/seed.ts). */
  dataSourceId: string;
  query: string;
}

/** Id estável da conexão Oracle do UNISYSTEM (criada no seed). */
export const ORACLE_UNISYSTEM_DATASOURCE_ID = 'oracle-unisystem';

const MILHO_TIPO_CULTURA_SEQ = 2353301;
const MILHO_SAFRA_DESCRICAO = '2025/2026';

export const PRODUCAO_MILHO_QUERY = `SELECT f.DESCRICAO_FILIAL filial,
       f2.DESC_FAZENDA fazenda,
       t.NUMERO_TALHAO talhao,
       uv.DESC_VARIEDADE variedade,
       count(c.SEQ_PLA_ENTRADA) qtd_carga,
       sum(vtr.SUB_TOTAL - vtr.des_umidade - vtr.des_impureza - vtr.des_avariado - vtr.des_ardido - vtr.des_outros - vtr.des_graos_verdes - vtr.des_quebrados) peso_liquido,
       sum(c.DES_UMIDADE) desc_umidade,
       AVG(CASE
             WHEN c.PER_UMIDADE < 14 THEN 14
             ELSE c.PER_UMIDADE
           END) AS perc_umidade,
       sum(c.DES_IMPUREZA) desc_impureza,
       SUM(C.DES_AVARIADO) desc_avariado,
       sum(c.PESO_LIQUIDO) / 60 QTD_SC60,
       TS.QTDE_HA HECTARES,
       ROUND(sum(vtr.SUB_TOTAL - vtr.des_umidade - vtr.des_impureza - vtr.des_avariado - vtr.des_ardido - vtr.des_outros - vtr.des_graos_verdes - vtr.des_quebrados) / ((SELECT sum(cc.area_apontada) FROM APONT_AREA_TAL_OS cc WHERE cc.seq_pla_variedade = ts.SEQ_PLA_VARIEDADE AND cc.seq_pla_talhao = ts.SEQ_PLA_TALHAO AND cc.seq_pla_fazenda = t.SEQ_PLA_FAZENDA)) / 60, 2) QTD_SC_HECTARES,
       (SELECT sum(cc.area_apontada) FROM APONT_AREA_TAL_OS cc WHERE cc.seq_pla_variedade = ts.SEQ_PLA_VARIEDADE AND cc.seq_pla_talhao = ts.SEQ_PLA_TALHAO AND cc.seq_pla_fazenda = t.SEQ_PLA_FAZENDA) hectares_colhidos,
       TS.FINALIZADO,
       ts.SEQ_PLA_VARIEDADE,
       ts.SEQ_PLA_TALHAO,
       t.SEQ_PLA_FAZENDA
  FROM est_entradas_rom c
  JOIN est_entradas ee ON ee.SEQ_PLA_ENTRADA = c.SEQ_PLA_ENTRADA
  JOIN EST_ENTRADAS_ITENS eei ON eei.SEQ_PLA_ENTRADA = ee.SEQ_PLA_ENTRADA
  JOIN FILIAIS f ON f.COD_FILIAL = ee.COD_FILIAL
                AND f.COD_EMPRESA = ee.COD_EMPRESA
  JOIN PRODUTOS p ON p.SEQ_PLA_PRODUTO = eei.SEQ_PLA_PRODUTO
  LEFT JOIN VINCULA_TALHAO_ROMANEIO vtr ON vtr.seq_pla_entrada = ee.seq_pla_entrada
  LEFT JOIN TALHOES_SAFRA ts ON ts.SEQ_PLA_TALHAO_SAFRA = vtr.SEQ_PLA_TALHAO_SAFRA
  LEFT JOIN UBS_VARIEDADES uv ON uv.SEQ_PLA_VARIEDADE = ts.SEQ_PLA_VARIEDADE
  LEFT JOIN TALHOES t ON t.SEQ_PLA_TALHAO = ts.SEQ_PLA_TALHAO
  LEFT JOIN FAZENDAS f2 ON f2.SEQ_PLA_FAZENDA = t.SEQ_PLA_FAZENDA
  LEFT JOIN ORDEM_SERVICO os ON os.SEQ_PLA_ORDEM = vtr.SEQ_PLA_ORDEM
 WHERE c.CANCELADO IS NULL
   AND p.DESCRICAO_PRODUTO = 'MILHO EM GRAOS'
 GROUP BY f.DESCRICAO_FILIAL, t.NUMERO_TALHAO, uv.DESC_VARIEDADE, TS.FINALIZADO, TS.QTDE_HA, f2.DESC_FAZENDA, ts.SEQ_PLA_VARIEDADE,
       ts.SEQ_PLA_TALHAO,
       t.SEQ_PLA_FAZENDA
 ORDER BY 1, 2, 3`;

export const PRODUCAO_MILHO_DIA_ANTERIOR_QUERY = `SELECT COUNT(DISTINCT c.SEQ_PLA_ENTRADA) qtd_carga,
       SUM(vtr.SUB_TOTAL - vtr.des_umidade - vtr.des_impureza - vtr.des_avariado - vtr.des_ardido - vtr.des_outros - vtr.des_graos_verdes - vtr.des_quebrados) peso_liquido
  FROM est_entradas_rom c
  JOIN est_entradas ee ON ee.SEQ_PLA_ENTRADA = c.SEQ_PLA_ENTRADA
  JOIN EST_ENTRADAS_ITENS eei ON eei.SEQ_PLA_ENTRADA = ee.SEQ_PLA_ENTRADA
  JOIN PRODUTOS p ON p.SEQ_PLA_PRODUTO = eei.SEQ_PLA_PRODUTO
  LEFT JOIN VINCULA_TALHAO_ROMANEIO vtr ON vtr.seq_pla_entrada = ee.seq_pla_entrada
 WHERE c.CANCELADO IS NULL
   AND p.DESCRICAO_PRODUTO = 'MILHO EM GRAOS'
   AND TRUNC(ee.DATA_ENTRADA) = TRUNC(SYSDATE) - 1`;

const GRUPOS_SOJA = [
  '   1355302',
  '    752402',
  '   4411002',
  '    752302',
  '    752202',
  '   1355302',
];
const COD_PRODUTO_SOJA = '   5966702';
const PRODUTO_CONTRATO_SOJA = 'SOJA EM GRAOS';
const GRUPOS_INSUMOS = ['    752302', '    752202', '    752402'];

export const SALDO_SOJA_ESTOQUE_QUERY = `SELECT filial, fazenda, armazem, codgrupo, grupo, subgrupo, cod_produto, produto, endereco, unidade, saldo
FROM (
  SELECT f.DESCRICAO_FILIAL filial,
         f2.DESC_FAZENDA fazenda,
         a.DESC_ARMAZEM armazem,
         g.SEQ_PLA_GRUPO codgrupo,
         g.DESCRICAO_GRUPO grupo,
         sg.DESC_SUB_GRUPO subgrupo,
         p.SEQ_PLA_PRODUTO cod_produto,
         p.DESCRICAO_PRODUTO produto,
         cc.NOME_CLIENTE||' - '||ce.DESC_ENDERECO endereco,
         upp.SIGLA_UNIDADE unidade,
         NVL(ef.QUANT_INICIAL,0)+ NVL(ef.QUANT_ENTRADA,0) - NVL(ef.QUANT_SAIDA,0) saldo,
         ROW_NUMBER() OVER (
           PARTITION BY ef.COD_FILIAL, ef.SEQ_PLA_ARMAZEM, ef.SEQ_PLA_PRODUTO
           ORDER BY ef.data DESC
         ) rn
    FROM ESTOQUE_FISICO ef
    LEFT JOIN FILIAIS f ON f.COD_FILIAL = ef.COD_FILIAL AND f.COD_EMPRESA = ef.COD_EMPRESA
    LEFT JOIN FAZENDAS f2 ON f2.SEQ_PLA_FAZENDA = ef.SEQ_PLA_FAZENDA
    LEFT JOIN ARMAZENS a ON a.SEQ_PLA_ARMAZEM = ef.SEQ_PLA_ARMAZEM
    LEFT JOIN produtos p ON p.SEQ_PLA_PRODUTO = ef.SEQ_PLA_PRODUTO
    LEFT JOIN SUB_GRUPO sg ON sg.SEQ_PLA_SUB_GRUPO = p.SEQ_PLA_SUB_GRUPO
    LEFT JOIN GRUPO g ON g.SEQ_PLA_GRUPO = sg.SEQ_PLA_GRUPO
    LEFT JOIN UNIDADE_PRODUTO upp ON upp.SEQ_PLA_UNIDADE = p.SEQ_PLA_UNIDADE
    LEFT JOIN CLIENTES_ENDERECOS ce ON ce.SEQ_PLA_ENDERECO = ef.SEQ_PLA_ENDERECO
    LEFT JOIN clientes cc ON cc.SEQ_PLA_CLIENTE = ce.SEQ_PLA_CLIENTE
   WHERE g.SEQ_PLA_GRUPO IN (${GRUPOS_SOJA.map((g) => `'${g}'`).join(', ')})
) q
WHERE q.saldo <> 0
  AND q.rn = 1
  AND q.cod_produto = '${COD_PRODUTO_SOJA}'
ORDER BY 1, 3, 5, 6, 8`;

export const SALDO_SOJA_CONTRATOS_QUERY = `SELECT cl.NOME_CLIENTE cliente,
       cp.NR_CONTRATO nr_contrato,
       p.DESCRICAO_PRODUTO produto,
       DECODE(upp.SIGLA_UNIDADE, NULL, upp2.SIGLA_UNIDADE, '', upp2.SIGLA_UNIDADE, upp.SIGLA_UNIDADE) unid,
       ci.QUANTIDADE qtd_contrato,
       (SELECT SUM(esi.QUANTIDADE)
          FROM EST_SAIDAS es
          JOIN EST_SAIDAS_ITENS esi ON esi.SEQ_PLA_SAIDA = es.SEQ_PLA_SAIDA
         WHERE es.SEQ_PLA_CONTRATO = cp.SEQ_PLA_CONTRATO
           AND NVL(es.cancelado,'N') <> 'S') entregue,
       (SELECT COUNT(es.SEQ_PLA_SAIDA)
          FROM EST_SAIDAS es
         WHERE es.SEQ_PLA_CONTRATO = cp.SEQ_PLA_CONTRATO
           AND NVL(es.cancelado,'N') <> 'S') qtd_nf
  FROM CONT_PRINCIPAL cp
  LEFT JOIN CONT_ITENS ci ON ci.SEQ_PLA_CONTRATO = cp.SEQ_PLA_CONTRATO
  LEFT JOIN produtos p ON p.SEQ_PLA_PRODUTO = ci.SEQ_PLA_PRODUTO
  LEFT JOIN CLIENTES_ENDERECOS ce ON ce.SEQ_PLA_ENDERECO = cp.SEQ_PLA_ENDERECO
  LEFT JOIN clientes cl ON cl.SEQ_PLA_CLIENTE = ce.SEQ_PLA_CLIENTE
  LEFT JOIN UNIDADE_PRODUTO upp ON upp.SEQ_PLA_UNIDADE = cp.SEQ_PLA_UNIDADE
  LEFT JOIN UNIDADE_PRODUTO upp2 ON upp2.SEQ_PLA_UNIDADE = p.SEQ_PLA_UNIDADE
 WHERE p.DESCRICAO_PRODUTO = '${PRODUTO_CONTRATO_SOJA}'
 ORDER BY 1, 2`;

export const ESTOQUE_INSUMOS_QUERY = `SELECT filial, fazenda, armazem, codgrupo, grupo, subgrupo, cod_produto, produto, endereco, unidade, saldo
FROM (
  SELECT f.DESCRICAO_FILIAL filial,
         f2.DESC_FAZENDA fazenda,
         a.DESC_ARMAZEM armazem,
         g.SEQ_PLA_GRUPO codgrupo,
         g.DESCRICAO_GRUPO grupo,
         sg.DESC_SUB_GRUPO subgrupo,
         p.SEQ_PLA_PRODUTO cod_produto,
         p.DESCRICAO_PRODUTO produto,
         cc.NOME_CLIENTE||' - '||ce.DESC_ENDERECO endereco,
         upp.SIGLA_UNIDADE unidade,
         NVL(ef.QUANT_INICIAL,0)+ NVL(ef.QUANT_ENTRADA,0) - NVL(ef.QUANT_SAIDA,0) saldo,
         ROW_NUMBER() OVER (
           PARTITION BY ef.COD_FILIAL, ef.SEQ_PLA_ARMAZEM, ef.SEQ_PLA_PRODUTO
           ORDER BY ef.data DESC
         ) rn
    FROM ESTOQUE_FISICO ef
    LEFT JOIN FILIAIS f ON f.COD_FILIAL = ef.COD_FILIAL AND f.COD_EMPRESA = ef.COD_EMPRESA
    LEFT JOIN FAZENDAS f2 ON f2.SEQ_PLA_FAZENDA = ef.SEQ_PLA_FAZENDA
    LEFT JOIN ARMAZENS a ON a.SEQ_PLA_ARMAZEM = ef.SEQ_PLA_ARMAZEM
    LEFT JOIN produtos p ON p.SEQ_PLA_PRODUTO = ef.SEQ_PLA_PRODUTO
    LEFT JOIN SUB_GRUPO sg ON sg.SEQ_PLA_SUB_GRUPO = p.SEQ_PLA_SUB_GRUPO
    LEFT JOIN GRUPO g ON g.SEQ_PLA_GRUPO = sg.SEQ_PLA_GRUPO
    LEFT JOIN UNIDADE_PRODUTO upp ON upp.SEQ_PLA_UNIDADE = p.SEQ_PLA_UNIDADE
    LEFT JOIN CLIENTES_ENDERECOS ce ON ce.SEQ_PLA_ENDERECO = ef.SEQ_PLA_ENDERECO
    LEFT JOIN clientes cc ON cc.SEQ_PLA_CLIENTE = ce.SEQ_PLA_CLIENTE
   WHERE g.SEQ_PLA_GRUPO IN (${GRUPOS_INSUMOS.map((g) => `'${g}'`).join(', ')})
) q
WHERE q.saldo <> 0
  AND q.rn = 1
ORDER BY 1, 3, 5, 6, 8`;

export const IMPLANTACAO_ERP_QUERY = `SELECT
  m.*,
  (NVL(m.CLIENTE_FORNECEDOR, 0)
    + NVL(m.QTD_PRODUTOS, 0)
    + NVL(m.QTD_NF_ENTRADA, 0)
    + NVL(m.QTD_NF_SAIDA, 0)
    + NVL(m.QTD_PEDIDO_COMPRA, 0)
    + NVL(m.QTD_SOLICITACAO_COMPRA, 0)
    + NVL(m.QTD_TITULOS_CP, 0)
    + NVL(m.QTD_TITULOS_RECEBER, 0)
    + NVL(m.QTD_ITENS_SOLICITADOS, 0)) AS REGISTROS_TOTAIS,
  CASE
    WHEN NVL(m.TOTAL_CONTAS_PAGAR, 0) > 0 THEN ROUND(100 * NVL(m.TOTAL_PAGO, 0) / m.TOTAL_CONTAS_PAGAR, 0)
    ELSE 0
  END AS PCT_PAGO,
  CASE
    WHEN NVL(m.VALOR_RECEBER, 0) > 0 THEN ROUND(100 * NVL(m.VALOR_RECEBIDO, 0) / m.VALOR_RECEBER, 0)
    ELSE 0
  END AS PCT_RECEBIDO
FROM (
SELECT
    (SELECT COUNT(*) FROM CLIENTES) cliente_fornecedor,
    (SELECT SUM(cp.VALOR_DOCUM)
       FROM CONTAS_PAGAR cp
      WHERE cp.CANCELADO IS NULL) total_contas_pagar,
    (SELECT COUNT(*)
       FROM CONTAS_PAGAR cp
      WHERE cp.CANCELADO IS NULL) qtd_titulos_cp,
    (SELECT SUM(NVL(cp.VALOR_PAGO,0))
       FROM CONTAS_PAGAR cp
      WHERE cp.CANCELADO IS NULL) total_pago,
    (SELECT COUNT(*) FROM PRODUTOS) qtd_produtos,
    (SELECT COUNT(*)
       FROM EST_ENTRADAS ee
      WHERE ee.CANCELADO IS NULL) qtd_nf_entrada,
    (SELECT SUM(ee.VALOR_TOTAL)
       FROM EST_ENTRADAS ee
      WHERE ee.CANCELADO IS NULL) valor_nf_entrada,
    (SELECT COUNT(*)
       FROM EST_SAIDAS es
      WHERE es.CANCELADO IS NULL) qtd_nf_saida,
    (SELECT SUM(es.VALOR_TOTAL)
       FROM EST_SAIDAS es
      WHERE es.CANCELADO IS NULL) valor_nf_saida,
    (SELECT COUNT(*)
       FROM PEDIDO_COMPRAS pc
      WHERE pc.CANCELADO = 'N') qtd_pedido_compra,
    (SELECT SUM(pci.VALOR)
       FROM PEDIDO_COMPRA_ITENS pci) valor_pedido,
    (SELECT COUNT(*)
       FROM ALM_SOLICITACAO as2
      WHERE as2.CANCELADO IS NULL) qtd_solicitacao_compra,
    (SELECT COUNT(*)
       FROM ALM_SOLICITACAO_PRODUTOS asp) qtd_itens_solicitados,
    (SELECT SUM(NVL(cr.VALOR_DOCUM,0))
       FROM CONTAS_RECEBER cr
      WHERE cr.CANCELADO IS NULL) valor_receber,
    (SELECT SUM(NVL(cr.VALOR_RECEBIDO,0))
       FROM CONTAS_RECEBER cr
      WHERE cr.CANCELADO IS NULL) valor_recebido,
    (SELECT COUNT(*)
       FROM CONTAS_RECEBER cr
      WHERE cr.CANCELADO IS NULL) qtd_titulos_receber
FROM dual
) m`;

export const PRODUCAO_MILHO_AREA_FAZENDA_QUERY = `SELECT ff.DESC_FAZENDA fazenda,
       sum(ts.QTDE_HA) hectares,
       s.DESCRICAO_SAFRA safra
  FROM TALHOES_SAFRA ts
  JOIN TALHOES t ON t.SEQ_PLA_TALHAO = ts.SEQ_PLA_TALHAO
  JOIN FAZENDAS ff ON ff.SEQ_PLA_FAZENDA = t.SEQ_PLA_FAZENDA
  JOIN UBS_VARIEDADES uv ON uv.SEQ_PLA_VARIEDADE = ts.seq_pla_variedade
  JOIN TIPO_CULTURA tc ON tc.SEQ_PLA_TIPO_CULT = uv.SEQ_PLA_TIPO_CULT
  JOIN SAFRAS s ON s.COD_SAFRA = ts.COD_SAFRA
 WHERE uv.SEQ_PLA_TIPO_CULT = ${MILHO_TIPO_CULTURA_SEQ}
   AND s.DESCRICAO_SAFRA = '${MILHO_SAFRA_DESCRICAO}'
 GROUP BY ff.DESC_FAZENDA, s.DESCRICAO_SAFRA
 ORDER BY ff.DESC_FAZENDA`;

export const REPORTS: ReportDefinition[] = [
  {
    slug: 'producao-milho',
    name: 'Produção de Milho (Franciosi TGA)',
    description:
      'Produção de milho em grãos por talhão e variedade: cards de peso líquido (total, dia anterior e média SC/ha), cards por fazenda (área, colheita e produtividade), cargas por fazenda, detalhamento por talhão e gráfico por variedade. Oracle UNISYSTEM.',
    permission: 'reports.producao-milho',
    dataSourceId: ORACLE_UNISYSTEM_DATASOURCE_ID,
    query: PRODUCAO_MILHO_QUERY,
  },
  {
    slug: 'saldo-soja',
    name: 'Saldo de Soja em Grãos (Franciosi TGA)',
    description:
      'Estoque de soja em grãos por fazenda e contratos firmados. Oracle UNISYSTEM.',
    permission: 'reports.saldo-soja',
    dataSourceId: ORACLE_UNISYSTEM_DATASOURCE_ID,
    query: SALDO_SOJA_ESTOQUE_QUERY,
  },
  {
    slug: 'estoque-insumos',
    name: 'Estoque de Insumos (Franciosi TGA)',
    description:
      'Posição consolidada do estoque de defensivos, fertilizantes e sementes por fazenda (tabela pivô). Oracle UNISYSTEM.',
    permission: 'reports.estoque-insumos',
    dataSourceId: ORACLE_UNISYSTEM_DATASOURCE_ID,
    query: ESTOQUE_INSUMOS_QUERY,
  },
  {
    slug: 'implantacao-erp',
    name: 'Implantação ERP COMPASS (Franciosi TGA)',
    description:
      'Painel de implantação UNISYSTEM/COMPASS: cadastros, compras, fiscal, almoxarifado e financeiro. Oracle UNISYSTEM.',
    permission: 'reports.implantacao-erp',
    dataSourceId: ORACLE_UNISYSTEM_DATASOURCE_ID,
    query: IMPLANTACAO_ERP_QUERY,
  },
];

export function findReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
