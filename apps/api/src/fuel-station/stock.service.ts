import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async listByPoint(pointId: string) {
    const point = await this.prisma.fuelPoint.findUnique({
      where: { id: pointId },
    });
    if (!point) throw new NotFoundException('Ponto não encontrado');
    const items = await this.prisma.fuelStock.findMany({
      where: { pointId },
      include: {
        product: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });
    return { point, items, total: items.length };
  }

  async movements(args: {
    pointId: string;
    productId?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.FuelStockMovementWhereInput = {
      pointId: args.pointId,
    };
    if (args.productId) where.productId = args.productId;
    const take = args.take ?? 100;
    const skip = args.skip ?? 0;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelStockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          product: { select: { id: true, name: true, unit: true } },
        },
      }),
      this.prisma.fuelStockMovement.count({ where }),
    ]);
    return { items, total, take, skip };
  }
}
