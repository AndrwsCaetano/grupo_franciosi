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

const PRODUCAO_MILHO_QUERY = `SELECT f.DESCRICAO_FILIAL filial,
       c.TIKET_BALANCA ticket,
       (ee.DATA_ENTRADA) dt_entrada ,
       p.DESCRICAO_PRODUTO produto,
       c.PESO_BRUTO,
       c.PESO_TARA ,
       c.PESO_LIQUIDO,
       ( CASE
            WHEN c.PER_UMIDADE < 14 THEN 14
           ELSE c.PER_UMIDADE
          END) AS  perc_umidade ,
       c.DES_UMIDADE ,
       c.PER_IMPUREZA,
       c.DES_IMPUREZA,
       c.PER_AVARIADO,
       c.DES_AVARIADO,
       uv.DESC_VARIEDADE variedade,
       t.NUMERO_TALHAO talhao,
       os.NR_CONTROLE os,
       ts.QTDE_HA hectares,
       ts.FINALIZADO
  FROM est_entradas_rom c
  JOIN est_entradas ee ON ee.SEQ_PLA_ENTRADA = c.SEQ_PLA_ENTRADA
  JOIN EST_ENTRADAS_ITENS eei ON eei.SEQ_PLA_ENTRADA = ee.SEQ_PLA_ENTRADA
  JOIN FILIAIS f ON f.COD_FILIAL = ee.COD_FILIAL
                AND f.COD_EMPRESA  = ee.COD_EMPRESA
  JOIN PRODUTOS p ON p.SEQ_PLA_PRODUTO = eei.SEQ_PLA_PRODUTO
  LEFT JOIN VINCULA_TALHAO_ROMANEIO vtr ON vtr.seq_pla_entrada = ee.seq_pla_entrada
  LEFT JOIN TALHOES_SAFRA ts ON ts.SEQ_PLA_TALHAO_SAFRA  = vtr.SEQ_PLA_TALHAO_SAFRA
  LEFT JOIN UBS_VARIEDADES uv ON uv.SEQ_PLA_VARIEDADE = ts.SEQ_PLA_VARIEDADE
  LEFT JOIN TALHOES t ON t.SEQ_PLA_TALHAO = ts.SEQ_PLA_TALHAO
  LEFT JOIN ORDEM_SERVICO os ON os.SEQ_PLA_ORDEM = vtr.SEQ_PLA_ORDEM
 WHERE c.CANCELADO IS NULL
   AND p.DESCRICAO_PRODUTO ='MILHO EM GRAOS'
ORDER BY 3,2`;

export const REPORTS: ReportDefinition[] = [
  {
    slug: 'producao-milho',
    name: 'Produção de Milho em Grãos',
    description:
      'Resumo de pesagens, saldo por talhão/variedade e distribuição por variedade (base Oracle UNISYSTEM).',
    permission: 'reports.producao-milho',
    dataSourceId: ORACLE_UNISYSTEM_DATASOURCE_ID,
    query: PRODUCAO_MILHO_QUERY,
  },
];

export function findReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
