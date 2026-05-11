import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfilePermissionDto } from './dto/profile-permission.dto';
import { SetProfilePermissionsDto } from './dto/set-profile-permissions.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.profile.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!p) {
      throw new NotFoundException('Perfil não encontrado');
    }
    return p;
  }

  async create(dto: CreateProfileDto) {
    const exists = await this.prisma.profile.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('Nome de perfil já existe');
    }
    return this.prisma.profile.create({ data: dto });
  }

  async update(id: string, dto: UpdateProfileDto) {
    await this.ensureProfile(id);
    if (dto.name) {
      const clash = await this.prisma.profile.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Nome de perfil já existe');
      }
    }
    return this.prisma.profile.update({ where: { id }, data: dto });
  }

  async setPermission(id: string, dto: ProfilePermissionDto) {
    await this.ensureProfile(id);
    await this.prisma.profilePermission.upsert({
      where: {
        profileId_permissionId: {
          profileId: id,
          permissionId: dto.permissionId,
        },
      },
      create: {
        profileId: id,
        permissionId: dto.permissionId,
        granted: dto.granted,
      },
      update: { granted: dto.granted },
    });
    return { ok: true };
  }

  async removePermission(profileId: string, permissionId: string) {
    await this.ensureProfile(profileId);
    await this.prisma.profilePermission.deleteMany({
      where: { profileId, permissionId },
    });
    return { ok: true };
  }

  async setPermissions(id: string, dto: SetProfilePermissionsDto) {
    await this.ensureProfile(id);
    await this.prisma.$transaction([
      this.prisma.profilePermission.deleteMany({ where: { profileId: id } }),
      ...(dto.permissions.length > 0
        ? [
            this.prisma.profilePermission.createMany({
              data: dto.permissions.map((p) => ({
                profileId: id,
                permissionId: p.permissionId,
                granted: p.granted,
              })),
            }),
          ]
        : []),
    ]);
    return { ok: true };
  }

  async remove(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }
    if (profile._count.users > 0) {
      throw new ConflictException(
        `Perfil em uso por ${profile._count.users} usuário(s). Remova os vínculos antes de excluir.`,
      );
    }
    await this.prisma.profile.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureProfile(id: string) {
    const p = await this.prisma.profile.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException('Perfil não encontrado');
    }
  }
}
