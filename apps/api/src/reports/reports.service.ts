import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSourcesService } from '../data-sources/data-sources.service';
import { PermissionsResolutionService } from '../permissions/permissions-resolution.service';
import { aggregateProducaoMilho } from './producao-milho.aggregator';
import {
  formatGeneratedAt,
  renderProducaoMilho,
} from './producao-milho.template';
import { findReport, REPORTS } from './reports.registry';

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
    this.assertSelectOnly(report.query);

    const rows = await this.dataSources.runQueryById(
      report.dataSourceId,
      report.query,
    );

    const now = new Date();
    const generatedAt = formatGeneratedAt(now);
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
      case 'producao-milho': {
        const data = aggregateProducaoMilho(rows);
        return renderProducaoMilho(data, generatedAt);
      }
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
