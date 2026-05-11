import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDashboardsDto } from './dto/assign-dashboards.dto';
import { AssignProfilesDto } from './dto/assign-profiles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPermissionDto } from './dto/user-permission.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        isAdmin: true,
        createdAt: true,
        profiles: {
          select: { profile: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        isAdmin: true,
        createdAt: true,
        profiles: {
          select: { profile: { select: { id: true, name: true } } },
        },
        permissionOverrides: {
          select: {
            granted: true,
            permission: { select: { id: true, code: true, name: true } },
          },
        },
        dashboards: {
          select: {
            dashboard: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { profileIds, ...rest } = dto;
    const user = await this.prisma.user.create({
      data: {
        email: rest.email,
        name: rest.name,
        passwordHash,
        active: rest.active ?? true,
        isAdmin: rest.isAdmin ?? false,
        profiles: profileIds?.length
          ? {
              create: profileIds.map((profileId) => ({ profileId })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        isAdmin: true,
      },
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureUser(id);
    if (dto.email) {
      const clash = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }
    const data: {
      email?: string;
      name?: string;
      active?: boolean;
      isAdmin?: boolean;
      passwordHash?: string;
    } = {};
    if (dto.email !== undefined) {
      data.email = dto.email;
    }
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.isAdmin !== undefined) {
      data.isAdmin = dto.isAdmin;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        isAdmin: true,
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ConflictException(
        'Não é possível excluir o próprio usuário enquanto autenticado',
      );
    }
    await this.ensureUser(id);
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async setPermissions(id: string, dto: SetUserPermissionsDto) {
    await this.ensureUser(id);
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId: id } }),
      ...(dto.permissions.length > 0
        ? [
            this.prisma.userPermission.createMany({
              data: dto.permissions.map((p) => ({
                userId: id,
                permissionId: p.permissionId,
                granted: p.granted,
              })),
            }),
          ]
        : []),
    ]);
    return { ok: true };
  }

  async setProfiles(id: string, dto: AssignProfilesDto) {
    await this.ensureUser(id);
    await this.prisma.userProfile.deleteMany({ where: { userId: id } });
    if (dto.profileIds.length === 0) {
      return { ok: true };
    }
    await this.prisma.userProfile.createMany({
      data: dto.profileIds.map((profileId) => ({ userId: id, profileId })),
    });
    return { ok: true };
  }

  async setPermissionOverride(id: string, dto: UserPermissionDto) {
    await this.ensureUser(id);
    await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId: id, permissionId: dto.permissionId },
      },
      create: {
        userId: id,
        permissionId: dto.permissionId,
        granted: dto.granted,
      },
      update: { granted: dto.granted },
    });
    return { ok: true };
  }

  async removePermissionOverride(userId: string, permissionId: string) {
    await this.ensureUser(userId);
    await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId },
    });
    return { ok: true };
  }

  async setDashboards(id: string, dto: AssignDashboardsDto) {
    await this.ensureUser(id);
    await this.prisma.userDashboard.deleteMany({ where: { userId: id } });
    if (dto.dashboardIds.length === 0) {
      return { ok: true };
    }
    await this.prisma.userDashboard.createMany({
      data: dto.dashboardIds.map((dashboardId) => ({
        userId: id,
        dashboardId,
      })),
    });
    return { ok: true };
  }

  private async ensureUser(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }
}
