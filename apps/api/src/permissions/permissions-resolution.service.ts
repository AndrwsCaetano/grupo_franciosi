import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsResolutionService {
  constructor(private prisma: PrismaService) {}

  async getEffectiveCodes(userId: string): Promise<Set<string>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profiles: {
          include: {
            profile: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        permissionOverrides: { include: { permission: true } },
      },
    });
    if (!user) {
      return new Set();
    }

    if (user.isAdmin) {
      const all = await this.prisma.permission.findMany({
        select: { code: true },
      });
      return new Set(all.map((p) => p.code));
    }

    const codes = new Set<string>();
    for (const up of user.profiles) {
      for (const pp of up.profile.permissions) {
        if (pp.granted) {
          codes.add(pp.permission.code);
        } else {
          codes.delete(pp.permission.code);
        }
      }
    }
    for (const o of user.permissionOverrides) {
      if (o.granted) {
        codes.add(o.permission.code);
      } else {
        codes.delete(o.permission.code);
      }
    }
    return codes;
  }

  async userHasAll(userId: string, codes: string[]): Promise<boolean> {
    if (codes.length === 0) {
      return true;
    }
    const effective = await this.getEffectiveCodes(userId);
    return codes.every((c) => effective.has(c));
  }
}
