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
       ee.NR_DOCUMENTO,
       c.TIKET_BALANCA,
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
       t.SEQ_PLA_FAZENDA,
       c.TIKET_BALANCA,
       ee.NR_DOCUMENTO
 ORDER BY 1, 2, 3`;

export const PRODUCAO_MILHO_DIA_ANTERIOR_QUERY = `SELECT COUNT(c.SEQ_PLA_ENTRADA) qtd_carga,
       SUM(c.PESO_LIQUIDO) peso_liquido
  FROM est_entradas_rom c
  JOIN est_entradas ee ON ee.SEQ_PLA_ENTRADA = c.SEQ_PLA_ENTRADA
  JOIN EST_ENTRADAS_ITENS eei ON eei.SEQ_PLA_ENTRADA = ee.SEQ_PLA_ENTRADA
  JOIN PRODUTOS p ON p.SEQ_PLA_PRODUTO = eei.SEQ_PLA_PRODUTO
 WHERE c.CANCELADO IS NULL
   AND p.DESCRICAO_PRODUTO = 'MILHO EM GRAOS'
   AND TRUNC(ee.DATA_ENTRADA) = TRUNC(SYSDATE) - 1`;

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
];

export function findReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
