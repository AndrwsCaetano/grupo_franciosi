import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelStationService } from './fuel-station.service';

/**
 * Retorna todo o contexto que o app do operador precisa em uma única chamada.
 * Regras:
 *  - Somente pontos VALIDADOS a que o usuário tem acesso (admin vê todos).
 *  - Produtos e equipamentos ativos e validados.
 *  - Estoques dos pontos acessíveis.
 *  - Transferências PENDENTES onde o usuário é origem OU destino.
 */
@Injectable()
export class BootstrapService {
  constructor(
    private prisma: PrismaService,
    private fuelStation: FuelStationService,
  ) {}

  async build(userId: string) {
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);

    // Filtra os pontos validados.
    const points = accessible.length
      ? await this.prisma.fuelPoint.findMany({
          where: {
            id: { in: accessible },
            active: true,
            validatedAt: { not: null },
          },
          orderBy: { name: 'asc' },
        })
      : [];

    const validatedPointIds = points.map((p) => p.id);

    const products = await this.prisma.fuelProduct.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    const stocks = validatedPointIds.length
      ? await this.prisma.fuelStock.findMany({
          where: { pointId: { in: validatedPointIds } },
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        })
      : [];

    const machinery = await this.prisma.machinery.findMany({
      where: {
        status: 'ATIVO',
        validatedAt: { not: null },
      },
      orderBy: { tag: 'asc' },
      include: {
        defaultProduct: { select: { id: true, name: true, unit: true } },
      },
    });

    const pendingTransfers = validatedPointIds.length
      ? await this.prisma.fuelTransfer.findMany({
          where: {
            status: 'PENDENTE',
            OR: [
              { originPointId: { in: validatedPointIds } },
              { destPointId: { in: validatedPointIds } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            originPoint: { select: { id: true, name: true, type: true } },
            destPoint: { select: { id: true, name: true, type: true } },
            product: { select: { id: true, name: true, unit: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
          take: 50,
        })
      : [];

    return {
      user: { id: userId },
      points,
      products,
      stocks,
      machinery,
      pendingTransfers,
    };
  }
}
