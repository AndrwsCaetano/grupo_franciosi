import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { DEFAULT_PERMISSIONS } from '@grupo-franciosi/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsResolutionService } from '../permissions/permissions-resolution.service';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private permissionsResolution: PermissionsResolutionService,
  ) {}

  private hashRefresh(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashRefresh(rawToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.expiresAt < new Date() || !row.user.active) {
      throw new UnauthorizedException('Sessão inválida');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issueTokens(row.user.id, row.user.email);
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashRefresh(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  private async issueTokens(userId: string, email: string) {
    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshDays = Number(
      this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ?? '60',
    );

    const payload: JwtPayload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: accessExpires,
    } as SignOptions);

    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashRefresh(rawRefresh);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const [user, effective] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, isAdmin: true },
      }),
      this.permissionsResolution.getEffectiveCodes(userId),
    ]);

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: accessExpires,
      refreshExpiresAt: expiresAt.toISOString(),
      user: {
        id: userId,
        email,
        name: user?.name ?? '',
        isAdmin: user?.isAdmin ?? false,
        permissions: [...effective],
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profiles: { include: { profile: true } },
        dashboards: { include: { dashboard: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const effective = await this.permissionsResolution.getEffectiveCodes(
      userId,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      isAdmin: user.isAdmin,
      profiles: user.profiles.map((p) => ({
        id: p.profile.id,
        name: p.profile.name,
      })),
      permissions: [...effective],
      dashboards: user.dashboards.map((d) => ({
        id: d.dashboard.id,
        name: d.dashboard.name,
        slug: d.dashboard.slug,
      })),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (currentPassword === newPassword) {
      throw new ConflictException(
        'A nova senha deve ser diferente da atual',
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { ok: true };
  }

  /** Primeiro usuário do sistema: permite bootstrap sem JWT. */
  async registerBootstrap(email: string, password: string, name: string) {
    const count = await this.prisma.user.count();
    if (count > 0) {
      throw new ConflictException('Registro inicial já foi concluído');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, name, passwordHash },
    });
    await this.ensureAdminProfileAndLink(user.id);
    return this.issueTokens(user.id, user.email);
  }

  /** Garante permissões + perfil Administrador (mesma base do seed) e vincula o usuário. */
  private async ensureAdminProfileAndLink(userId: string) {
    for (const p of DEFAULT_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        create: { code: p.code, name: p.name },
        update: { name: p.name },
      });
    }
    const allPerms = await this.prisma.permission.findMany();
    const byCode = Object.fromEntries(allPerms.map((x) => [x.code, x.id]));
    const adminProfile = await this.prisma.profile.upsert({
      where: { name: 'Administrador' },
      create: { name: 'Administrador', description: 'Acesso total ao painel' },
      update: {},
    });
    for (const p of DEFAULT_PERMISSIONS) {
      await this.prisma.profilePermission.upsert({
        where: {
          profileId_permissionId: {
            profileId: adminProfile.id,
            permissionId: byCode[p.code],
          },
        },
        create: {
          profileId: adminProfile.id,
          permissionId: byCode[p.code],
          granted: true,
        },
        update: { granted: true },
      });
    }
    await this.prisma.userProfile.create({
      data: { userId, profileId: adminProfile.id },
    });
  }
}
