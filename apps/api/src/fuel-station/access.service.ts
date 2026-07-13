import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserPointAccessDto } from './dto/user-point-access.dto';

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  async list(args: { userId?: string; pointId?: string }) {
    const items = await this.prisma.userFuelPointAccess.findMany({
      where: {
        userId: args.userId,
        pointId: args.pointId,
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        point: { select: { id: true, name: true, type: true } },
      },
      take: 500,
    });
    return { items, total: items.length };
  }

  async create(dto: CreateUserPointAccessDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    const point = await this.prisma.fuelPoint.findUnique({
      where: { id: dto.pointId },
    });
    if (!point) throw new BadRequestException('Ponto não encontrado');

    const exists = await this.prisma.userFuelPointAccess.findUnique({
      where: {
        userId_pointId: { userId: dto.userId, pointId: dto.pointId },
      },
    });
    if (exists) throw new ConflictException('Vínculo já existe');

    return this.prisma.userFuelPointAccess.create({
      data: { userId: dto.userId, pointId: dto.pointId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        point: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async remove(userId: string, pointId: string) {
    const exists = await this.prisma.userFuelPointAccess.findUnique({
      where: { userId_pointId: { userId, pointId } },
    });
    if (!exists) throw new NotFoundException('Vínculo não encontrado');
    await this.prisma.userFuelPointAccess.delete({
      where: { userId_pointId: { userId, pointId } },
    });
    return { ok: true };
  }
}
