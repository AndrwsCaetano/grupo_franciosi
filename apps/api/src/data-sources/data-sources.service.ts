import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSourceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConnectionTesterService,
  ConnectionTestResult,
} from './connection-tester.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { UpdateDataSourceDto } from './dto/update-data-source.dto';

function omitSecret<T extends { passwordEnc: string }>(
  row: T,
): Omit<T, 'passwordEnc'> & { hasSecret: boolean } {
  const { passwordEnc, ...rest } = row;
  return { ...rest, hasSecret: passwordEnc.length > 0 };
}

@Injectable()
export class DataSourcesService {
  constructor(
    private prisma: PrismaService,
    private tester: ConnectionTesterService,
  ) {}

  findAll() {
    return this.prisma.dataSource
      .findMany({ orderBy: { name: 'asc' } })
      .then((rows) => rows.map(omitSecret));
  }

  async findOne(id: string) {
    const row = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Fonte de dados não encontrada');
    }
    return omitSecret(row);
  }

  create(dto: CreateDataSourceDto) {
    const { password, extra, active, ...data } = dto;
    return this.prisma.dataSource
      .create({
        data: {
          ...data,
          passwordEnc: password,
          ...(active === undefined ? {} : { active }),
          extra:
            extra === undefined ? undefined : (extra as Prisma.InputJsonValue),
        },
      })
      .then(omitSecret);
  }

  async update(id: string, dto: UpdateDataSourceDto) {
    await this.ensure(id);
    const data: Prisma.DataSourceUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }
    if (dto.host !== undefined) {
      data.host = dto.host;
    }
    if (dto.port !== undefined) {
      data.port = dto.port;
    }
    if (dto.databaseName !== undefined) {
      data.databaseName = dto.databaseName;
    }
    if (dto.username !== undefined) {
      data.username = dto.username;
    }
    if (dto.password !== undefined) {
      data.passwordEnc = dto.password;
    }
    if (dto.ssl !== undefined) {
      data.ssl = dto.ssl;
    }
    if (dto.extra !== undefined) {
      data.extra = dto.extra as Prisma.InputJsonValue;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    return this.prisma.dataSource
      .update({ where: { id }, data })
      .then(omitSecret);
  }

  async remove(id: string) {
    await this.ensure(id);
    const inUse = await this.prisma.dashboard.count({
      where: { dataSourceId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Conexão em uso por ${inUse} dashboard(s). Remova ou troque a fonte de dados primeiro.`,
      );
    }
    await this.prisma.dataSource.delete({ where: { id } });
    return { ok: true };
  }

  async testFromInput(dto: TestConnectionDto): Promise<ConnectionTestResult> {
    return this.tester.test({
      type: dto.type,
      host: dto.host,
      port: dto.port,
      databaseName: dto.databaseName ?? '',
      username: dto.username,
      password: dto.password,
      ssl: dto.ssl ?? false,
      extra: dto.extra ?? null,
    });
  }

  async testById(id: string): Promise<ConnectionTestResult> {
    const row = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Fonte de dados não encontrada');
    }
    return this.tester.test({
      type: row.type,
      host: row.host,
      port: row.port,
      databaseName: row.databaseName,
      username: row.username,
      password: row.passwordEnc,
      ssl: row.ssl,
      extra: (row.extra as Record<string, unknown> | null) ?? null,
    });
  }

  /**
   * Executa um SELECT em uma fonte de dados Oracle cadastrada e devolve as
   * linhas como objetos. Usado pelo módulo de Relatórios.
   */
  async runQueryById(
    id: string,
    sql: string,
  ): Promise<Record<string, unknown>[]> {
    const row = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Fonte de dados não encontrada');
    }
    if (!row.active) {
      throw new BadRequestException('Fonte de dados inativa');
    }
    if (row.type !== DataSourceType.ORACLE) {
      throw new BadRequestException(
        `Execução de relatórios suportada apenas para Oracle (recebido: ${row.type}).`,
      );
    }
    try {
      return await this.tester.runOracleSelect(
        {
          type: row.type,
          host: row.host,
          port: row.port,
          databaseName: row.databaseName,
          username: row.username,
          password: row.passwordEnc,
          ssl: row.ssl,
          extra: (row.extra as Record<string, unknown> | null) ?? null,
        },
        sql,
      );
    } catch (err) {
      throw new BadRequestException(
        `Falha ao consultar a fonte de dados "${row.name}": ${(err as Error).message}`,
      );
    }
  }

  private async ensure(id: string) {
    const r = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException('Fonte de dados não encontrada');
    }
  }
}
