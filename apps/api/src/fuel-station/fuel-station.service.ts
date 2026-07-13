import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Helpers compartilhados pelo módulo Posto de Combustível.
 * Todas as operações de estoque precisam passar por aqui para garantir que
 * o movimento (`FuelStockMovement`) seja gravado junto com o saldo.
 */
@Injectable()
export class FuelStationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Aplica um delta ao estoque (positivo = entrada, negativo = saída) dentro
   * da transação recebida e cria o movimento correspondente.
   *
   * Falha com BadRequestException quando um débito deixaria o saldo negativo,
   * salvo se `allowNegative=true` (não usado hoje, mas útil para acertos de
   * inventário no futuro).
   */
  async applyStockDelta(
    tx: Prisma.TransactionClient,
    args: {
      pointId: string;
      productId: string;
      deltaLiters: number;
      type:
        | 'ABASTECIMENTO'
        | 'TRANSFERENCIA_SAIDA'
        | 'TRANSFERENCIA_ENTRADA'
        | 'NF_ENTRADA';
      referenceId?: string;
      allowNegative?: boolean;
    },
  ) {
    const {
      pointId,
      productId,
      deltaLiters,
      type,
      referenceId,
      allowNegative,
    } = args;

    if (deltaLiters === 0) {
      throw new BadRequestException('Delta de estoque não pode ser zero.');
    }

    const existing = await tx.fuelStock.findUnique({
      where: { pointId_productId: { pointId, productId } },
    });

    if (deltaLiters < 0) {
      const current = existing ? this.toNumber(existing.quantityLiters) : 0;
      if (!allowNegative && current + deltaLiters < 0) {
        throw new BadRequestException(
          `Estoque insuficiente: disponível ${current.toFixed(2)}L, tentativa de saída ${Math.abs(deltaLiters).toFixed(2)}L.`,
        );
      }
    }

    if (existing) {
      await tx.fuelStock.update({
        where: { pointId_productId: { pointId, productId } },
        data: {
          quantityLiters: { increment: deltaLiters },
        },
      });
    } else {
      if (deltaLiters < 0 && !allowNegative) {
        throw new BadRequestException(
          'Não há estoque cadastrado para este ponto/produto.',
        );
      }
      await tx.fuelStock.create({
        data: {
          pointId,
          productId,
          quantityLiters: deltaLiters,
        },
      });
    }

    await tx.fuelStockMovement.create({
      data: {
        pointId,
        productId,
        deltaLiters,
        type,
        referenceId: referenceId ?? null,
      },
    });
  }

  /** Converte Prisma.Decimal para number com segurança. */
  toNumber(v: Prisma.Decimal | number | string | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v);
    if (typeof v === 'object' && 'toNumber' in v) {
      return v.toNumber();
    }
    return Number(v);
  }

  /** Retorna a lista de pointIds que o usuário pode operar. Admin vê todos. */
  async getAccessiblePointIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user) return [];
    if (user.isAdmin) {
      const all = await this.prisma.fuelPoint.findMany({
        select: { id: true },
      });
      return all.map((p) => p.id);
    }
    const rows = await this.prisma.userFuelPointAccess.findMany({
      where: { userId },
      select: { pointId: true },
    });
    return rows.map((r) => r.pointId);
  }
}
