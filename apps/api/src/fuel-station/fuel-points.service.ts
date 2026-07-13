import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFuelPointDto } from './dto/create-fuel-point.dto';
import type { BasicListDto } from './dto/list.dto';
import type { UpdateFuelPointDto } from './dto/update-fuel-point.dto';

@Injectable()
export class FuelPointsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: BasicListDto) {
    const where: Prisma.FuelPointWhereInput | undefined = dto.q
      ? { name: { contains: dto.q, mode: 'insensitive' } }
      : undefined;
    const order = dto.order ?? 'asc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelPoint.findMany({
        where,
        orderBy: { name: order },
        take,
        skip,
        include: {
          stocks: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      }),
      this.prisma.fuelPoint.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const item = await this.prisma.fuelPoint.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Ponto não encontrado');
    }
    return item;
  }

  async create(dto: CreateFuelPointDto) {
    const name = dto.name.trim();
    const clash = await this.prisma.fuelPoint.findUnique({ where: { name } });
    if (clash) {
      throw new ConflictException('Já existe ponto com esse nome');
    }
    return this.prisma.fuelPoint.create({
      data: {
        name,
        type: dto.type,
        maxCapacityLiters: dto.maxCapacityLiters,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFuelPointDto) {
    await this.ensure(id);
    const data: Prisma.FuelPointUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.fuelPoint.findFirst({
        where: { name, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Já existe ponto com esse nome');
      }
      data.name = name;
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.maxCapacityLiters !== undefined) {
      data.maxCapacityLiters = dto.maxCapacityLiters;
    }
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.validated !== undefined) {
      data.validatedAt = dto.validated ? new Date() : null;
    }
    return this.prisma.fuelPoint.update({
      where: { id },
      data,
      include: {
        stocks: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    const used = await this.prisma.fuelDispensing.count({
      where: { pointId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'Ponto possui apontamentos. Desative-o em vez de excluir.',
      );
    }
    await this.prisma.fuelPoint.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string) {
    const p = await this.prisma.fuelPoint.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Ponto não encontrado');
  }
}
