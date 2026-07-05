import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSourcesService } from '../data-sources/data-sources.service';
import { PermissionsResolutionService } from '../permissions/permissions-resolution.service';
import { aggregateEstoqueInsumos } from './estoque-insumos.aggregator';
import { renderEstoqueInsumos } from './estoque-insumos.template';
import { aggregateImplantacaoErp } from './implantacao-erp.aggregator';
import { renderImplantacaoErp } from './implantacao-erp.template';
import {
  aggregateProducaoMilho,
  parseProducaoMilhoDiaAnteriorStats,
} from './producao-milho.aggregator';
import {
  formatGeneratedAt,
  renderProducaoMilho,
} from './producao-milho.template';
import { aggregateSaldoSoja } from './saldo-soja.aggregator';
import { renderSaldoSoja } from './saldo-soja.template';
import {
  ESTOQUE_INSUMOS_QUERY,
  findReport,
  IMPLANTACAO_ERP_QUERY,
  PRODUCAO_MILHO_AREA_FAZENDA_QUERY,
  PRODUCAO_MILHO_DIA_ANTERIOR_QUERY,
  REPORTS,
  SALDO_SOJA_CONTRATOS_QUERY,
  SALDO_SOJA_ESTOQUE_QUERY,
} from './reports.registry';

export interface RunReportResult {
  slug: string;
  name: string;
  html: string;
  generatedAt: string;
  rowCount: number;
}

@Injectable()
export class ReportsService {
  constructor(
    private dataSources: DataSourcesService,
    private permissions: PermissionsResolutionService,
  ) {}

  /** Lista apenas os relatórios que o usuário tem permissão de acessar. */
  async list(userId: string) {
    const codes = await this.permissions.getEffectiveCodes(userId);
    return REPORTS.filter((r) => codes.has(r.permission)).map((r) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
    }));
  }

  async run(slug: string, userId: string): Promise<RunReportResult> {
    const report = findReport(slug);
    if (!report) {
      throw new NotFoundException('Relatório não encontrado');
    }
    const ok = await this.permissions.userHasAll(userId, [report.permission]);
    if (!ok) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este relatório',
      );
    }

    const now = new Date();
    const generatedAt = formatGeneratedAt(now);

    if (slug === 'producao-milho') {
      this.assertSelectOnly(report.query);
      this.assertSelectOnly(PRODUCAO_MILHO_DIA_ANTERIOR_QUERY);
      this.assertSelectOnly(PRODUCAO_MILHO_AREA_FAZENDA_QUERY);

      const [rows, diaAnteriorRows, areaFazendaRows] = await Promise.all([
        this.dataSources.runQueryById(report.dataSourceId, report.query),
        this.dataSources.runQueryById(
          report.dataSourceId,
          PRODUCAO_MILHO_DIA_ANTERIOR_QUERY,
        ),
        this.dataSources.runQueryById(
          report.dataSourceId,
          PRODUCAO_MILHO_AREA_FAZENDA_QUERY,
        ),
      ]);

      const anteriorStats = parseProducaoMilhoDiaAnteriorStats(diaAnteriorRows);
      const data = aggregateProducaoMilho(
        rows,
        anteriorStats,
        areaFazendaRows,
      );
      const html = renderProducaoMilho(data, generatedAt);

      return {
        slug: report.slug,
        name: report.name,
        html,
        generatedAt,
        rowCount: rows.length,
      };
    }

    if (slug === 'saldo-soja') {
      this.assertSelectOnly(SALDO_SOJA_ESTOQUE_QUERY);
      this.assertSelectOnly(SALDO_SOJA_CONTRATOS_QUERY);

      const [estoqueRows, contratoRows] = await Promise.all([
        this.dataSources.runQueryById(
          report.dataSourceId,
          SALDO_SOJA_ESTOQUE_QUERY,
        ),
        this.dataSources.runQueryById(
          report.dataSourceId,
          SALDO_SOJA_CONTRATOS_QUERY,
        ),
      ]);

      const data = aggregateSaldoSoja(estoqueRows, contratoRows);
      const html = renderSaldoSoja(data, generatedAt);

      return {
        slug: report.slug,
        name: report.name,
        html,
        generatedAt,
        rowCount: estoqueRows.length,
      };
    }

    if (slug === 'estoque-insumos') {
      this.assertSelectOnly(ESTOQUE_INSUMOS_QUERY);

      const rows = await this.dataSources.runQueryById(
        report.dataSourceId,
        ESTOQUE_INSUMOS_QUERY,
      );
      const data = aggregateEstoqueInsumos(rows);
      const html = renderEstoqueInsumos(data, generatedAt);

      return {
        slug: report.slug,
        name: report.name,
        html,
        generatedAt,
        rowCount: rows.length,
      };
    }

    if (slug === 'implantacao-erp') {
      this.assertSelectOnly(IMPLANTACAO_ERP_QUERY);

      const rows = await this.dataSources.runQueryById(
        report.dataSourceId,
        IMPLANTACAO_ERP_QUERY,
      );
      const data = aggregateImplantacaoErp(rows);
      const html = renderImplantacaoErp(data, generatedAt);

      return {
        slug: report.slug,
        name: report.name,
        html,
        generatedAt,
        rowCount: rows.length,
      };
    }

    this.assertSelectOnly(report.query);
    const rows = await this.dataSources.runQueryById(
      report.dataSourceId,
      report.query,
    );
    const html = this.render(slug, rows, generatedAt);

    return {
      slug: report.slug,
      name: report.name,
      html,
      generatedAt,
      rowCount: rows.length,
    };
  }

  private render(
    slug: string,
    rows: Record<string, unknown>[],
    generatedAt: string,
  ): string {
    switch (slug) {
      default:
        throw new NotFoundException('Renderizador do relatório não encontrado');
    }
  }

  private assertSelectOnly(sql: string) {
    const trimmed = sql.trim().replace(/^\uFEFF/, '');
    if (!/^select\b/is.test(trimmed)) {
      throw new BadRequestException('Somente SELECT é permitido');
    }
    const withoutStrings = trimmed.replace(/'[^']*'/g, "''");
    if (withoutStrings.includes(';')) {
      throw new BadRequestException('Múltiplas instruções não são permitidas');
    }
  }
}
