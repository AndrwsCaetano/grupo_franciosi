import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSourceType, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.dashboard.findMany({
      orderBy: { name: 'asc' },
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            type: true,
            host: true,
            active: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const d = await this.prisma.dashboard.findUnique({
      where: { id },
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            type: true,
            host: true,
            active: true,
          },
        },
      },
    });
    if (!d) {
      throw new NotFoundException('Dashboard não encontrado');
    }
    return d;
  }

  create(dto: CreateDashboardDto) {
    return this.prisma.dashboard.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        definition: dto.definition as Prisma.InputJsonValue,
        dataSourceId: dto.dataSourceId ?? undefined,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDashboardDto) {
    await this.ensure(id);
    if (dto.slug) {
      const clash = await this.prisma.dashboard.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) {
        throw new BadRequestException('Slug já em uso');
      }
    }
    const data: Prisma.DashboardUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.slug !== undefined) {
      data.slug = dto.slug;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.definition !== undefined) {
      data.definition = dto.definition as Prisma.InputJsonValue;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.dataSourceId !== undefined) {
      data.dataSource =
        dto.dataSourceId === null
          ? { disconnect: true }
          : { connect: { id: dto.dataSourceId } };
    }
    return this.prisma.dashboard.update({
      where: { id },
      data,
    });
  }

  listAssignedForUser(userId: string) {
    return this.prisma.userDashboard.findMany({
      where: { userId, dashboard: { active: true } },
      include: {
        dashboard: {
          include: {
            dataSource: {
              select: { id: true, name: true, type: true, active: true },
            },
          },
        },
      },
    });
  }

  async runDashboardForUser(userId: string, slug: string) {
    const assignment = await this.prisma.userDashboard.findFirst({
      where: {
        userId,
        dashboard: { slug, active: true },
      },
      include: {
        dashboard: {
          include: { dataSource: true },
        },
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Dashboard não liberado para este usuário');
    }
    const { dashboard: dash } = assignment;
    if (!dash.dataSourceId || !dash.dataSource) {
      throw new BadRequestException('Dashboard sem fonte de dados configurada');
    }
    const ds = dash.dataSource;
    if (!ds.active) {
      throw new BadRequestException('Fonte de dados inativa');
    }

    const def = dash.definition as { query?: unknown };
    if (!def?.query || typeof def.query !== 'string') {
      throw new BadRequestException('definition.query ausente ou inválido');
    }
    this.assertSelectOnly(def.query);

    return this.executeExternalQuery(ds.type, ds, def.query);
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

  private async executeExternalQuery(
    type: DataSourceType,
    ds: {
      host: string;
      port: number;
      databaseName: string;
      username: string;
      passwordEnc: string;
      ssl: boolean;
    },
    query: string,
  ) {
    if (type !== DataSourceType.POSTGRES) {
      throw new BadRequestException(
        `Execução remota para ${type} será habilitada em versão futura (use exportação ou worker dedicado).`,
      );
    }
    const encUser = encodeURIComponent(ds.username);
    const encPass = encodeURIComponent(ds.passwordEnc);
    const encDb = encodeURIComponent(ds.databaseName);
    const q = ds.ssl ? '?sslmode=require' : '';
    const connectionString = `postgresql://${encUser}:${encPass}@${ds.host}:${ds.port}/${encDb}${q}`;
    const pool = new Pool({ connectionString, max: 1 });
    try {
      const res = await pool.query(query);
      return {
        rows: res.rows,
        rowCount: res.rowCount,
      };
    } finally {
      await pool.end();
    }
  }

  private async ensure(id: string) {
    const d = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!d) {
      throw new NotFoundException('Dashboard não encontrado');
    }
  }
}
