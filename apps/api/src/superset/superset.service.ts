import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { CreateSupersetDashboardDto } from './dto/create-superset-dashboard.dto';
import { UpdateSupersetDashboardDto } from './dto/update-superset-dashboard.dto';
import { SupersetClientService } from './superset-client.service';

@Injectable()
export class SupersetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: SupersetClientService,
  ) {}

  /** URL pública do Superset (para o iframe do frontend). */
  getPublicConfig() {
    return { supersetUrl: this.client.getPublicUrl() };
  }

  findAll() {
    return this.prisma.supersetDashboard.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { assignments: true } } },
    });
  }

  async findOne(id: string) {
    const dash = await this.prisma.supersetDashboard.findUnique({
      where: { id },
      include: { assignments: { select: { userId: true } } },
    });
    if (!dash) {
      throw new NotFoundException('Dashboard do Superset não encontrado');
    }
    return dash;
  }

  async create(dto: CreateSupersetDashboardDto) {
    await this.ensureSlugFree(dto.slug);
    return this.prisma.supersetDashboard.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        embeddedUuid: dto.embeddedUuid,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateSupersetDashboardDto) {
    await this.ensure(id);
    if (dto.slug) {
      await this.ensureSlugFree(dto.slug, id);
    }
    const data: Prisma.SupersetDashboardUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.slug !== undefined) {
      data.slug = dto.slug;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.embeddedUuid !== undefined) {
      data.embeddedUuid = dto.embeddedUuid;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    return this.prisma.supersetDashboard.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.supersetDashboard.delete({ where: { id } });
    return { ok: true };
  }

  /** Substitui a lista de usuários liberados para o dashboard. */
  async setAssignments(id: string, userIds: string[]) {
    await this.ensure(id);
    const unique = [...new Set(userIds)];
    await this.prisma.$transaction([
      this.prisma.userSupersetDashboard.deleteMany({
        where: { supersetDashboardId: id },
      }),
      this.prisma.userSupersetDashboard.createMany({
        data: unique.map((userId) => ({
          userId,
          supersetDashboardId: id,
        })),
        skipDuplicates: true,
      }),
    ]);
    return this.findOne(id);
  }

  /** Dashboards liberados para o usuário logado. */
  async listAssignedForUser(userId: string) {
    const rows = await this.prisma.userSupersetDashboard.findMany({
      where: { userId, dashboard: { active: true } },
      include: { dashboard: true },
      orderBy: { dashboard: { title: 'asc' } },
    });
    return rows.map((r) => ({
      id: r.dashboard.id,
      title: r.dashboard.title,
      slug: r.dashboard.slug,
      description: r.dashboard.description,
    }));
  }

  /**
   * Valida que o usuário tem o dashboard liberado e devolve um guest token
   * de curta duração + a URL pública do Superset para o embed.
   */
  async getGuestTokenForUser(user: AuthUser, slug: string) {
    const assignment = await this.prisma.userSupersetDashboard.findFirst({
      where: {
        userId: user.userId,
        dashboard: { slug, active: true },
      },
      include: { dashboard: true },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'Dashboard do Superset não liberado para este usuário',
      );
    }
    const { dashboard } = assignment;
    const token = await this.client.createGuestToken(dashboard.embeddedUuid, {
      username: `panel-${user.userId}`,
      firstName: user.name,
      lastName: '',
    });
    return {
      token,
      embeddedUuid: dashboard.embeddedUuid,
      supersetUrl: this.client.getPublicUrl(),
    };
  }

  private async ensure(id: string) {
    const dash = await this.prisma.supersetDashboard.findUnique({
      where: { id },
    });
    if (!dash) {
      throw new NotFoundException('Dashboard do Superset não encontrado');
    }
    return dash;
  }

  private async ensureSlugFree(slug: string, exceptId?: string) {
    const clash = await this.prisma.supersetDashboard.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    if (clash) {
      throw new BadRequestException('Slug já em uso');
    }
  }
}
