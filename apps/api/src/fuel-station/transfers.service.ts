import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import { ErpIntegrationService } from './erp-integration.service';
import { FuelStationService } from './fuel-station.service';

const TRANSFER_INCLUDE: Prisma.FuelTransferInclude = {
  originPoint: { select: { id: true, name: true, type: true } },
  destPoint: { select: { id: true, name: true, type: true } },
  product: { select: { id: true, name: true, unit: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  acceptedBy: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class TransfersService {
  constructor(
    private prisma: PrismaService,
    private fuelStation: FuelStationService,
    private erp: ErpIntegrationService,
  ) {}

  /**
   * Cria a transferência já debitando o estoque de origem. O destino só é
   * creditado quando `accept()` é chamada.
   */
  async request(userId: string, dto: CreateTransferDto) {
    if (dto.originPointId === dto.destPointId) {
      throw new BadRequestException(
        'Origem e destino não podem ser o mesmo ponto.',
      );
    }
    const liters = Number(dto.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      throw new BadRequestException('liters deve ser maior que zero');
    }

    const [origin, dest, product] = await Promise.all([
      this.prisma.fuelPoint.findUnique({ where: { id: dto.originPointId } }),
      this.prisma.fuelPoint.findUnique({ where: { id: dto.destPointId } }),
      this.prisma.fuelProduct.findUnique({ where: { id: dto.productId } }),
    ]);
    if (!origin) throw new BadRequestException('Origem não encontrada');
    if (!dest) throw new BadRequestException('Destino não encontrado');
    if (!product) throw new BadRequestException('Produto não encontrado');
    if (!origin.validatedAt || !dest.validatedAt) {
      throw new BadRequestException(
        'Origem e destino precisam estar validados.',
      );
    }

    // O solicitante precisa ter acesso à origem (admin ignora).
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);
    if (!accessible.includes(origin.id)) {
      throw new ForbiddenException(
        'Você não tem acesso à origem para solicitar transferência.',
      );
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      const t = await tx.fuelTransfer.create({
        data: {
          originPointId: origin.id,
          destPointId: dest.id,
          productId: product.id,
          liters,
          status: 'PENDENTE',
          observation: dto.observation ?? null,
          createdByUserId: userId,
        },
      });

      await this.fuelStation.applyStockDelta(tx, {
        pointId: origin.id,
        productId: product.id,
        deltaLiters: -liters,
        type: 'TRANSFERENCIA_SAIDA',
        referenceId: t.id,
      });

      return t;
    });

    return this.prisma.fuelTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: TRANSFER_INCLUDE,
    });
  }

  async accept(userId: string, id: string) {
    const t = await this.prisma.fuelTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    if (t.status !== 'PENDENTE') {
      throw new BadRequestException(
        `Transferência já está no status ${t.status}.`,
      );
    }
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);
    if (!accessible.includes(t.destPointId)) {
      throw new ForbiddenException(
        'Você não tem acesso ao destino para aceitar a transferência.',
      );
    }

    const liters = this.fuelStation.toNumber(t.liters);

    await this.prisma.$transaction(async (tx) => {
      await this.fuelStation.applyStockDelta(tx, {
        pointId: t.destPointId,
        productId: t.productId,
        deltaLiters: liters,
        type: 'TRANSFERENCIA_ENTRADA',
        referenceId: t.id,
      });
      await tx.fuelTransfer.update({
        where: { id: t.id },
        data: {
          status: 'ACEITA',
          acceptedByUserId: userId,
          acceptedAt: new Date(),
        },
      });
    });

    await this.erp.pushTransfer(t.id);

    return this.prisma.fuelTransfer.findUniqueOrThrow({
      where: { id },
      include: TRANSFER_INCLUDE,
    });
  }

  /**
   * Rejeita e restaura o saldo na origem.
   */
  async reject(userId: string, id: string, reason?: string) {
    const t = await this.prisma.fuelTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    if (t.status !== 'PENDENTE') {
      throw new BadRequestException(
        `Transferência já está no status ${t.status}.`,
      );
    }
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);
    // Pode rejeitar quem tem acesso à origem (dono do estoque) OU ao destino
    // (quem recebe e decidiu não aceitar).
    if (!accessible.includes(t.originPointId) && !accessible.includes(t.destPointId)) {
      throw new ForbiddenException(
        'Você não tem acesso à origem ou destino desta transferência.',
      );
    }

    const liters = this.fuelStation.toNumber(t.liters);
    const observation = reason
      ? `${t.observation ? t.observation + ' | ' : ''}REJEITADA: ${reason}`
      : t.observation;

    await this.prisma.$transaction(async (tx) => {
      await this.fuelStation.applyStockDelta(tx, {
        pointId: t.originPointId,
        productId: t.productId,
        deltaLiters: liters,
        type: 'TRANSFERENCIA_ENTRADA',
        referenceId: t.id,
      });
      await tx.fuelTransfer.update({
        where: { id: t.id },
        data: {
          status: 'RECUSADA',
          acceptedByUserId: userId,
          acceptedAt: new Date(),
          observation,
        },
      });
    });

    return this.prisma.fuelTransfer.findUniqueOrThrow({
      where: { id },
      include: TRANSFER_INCLUDE,
    });
  }

  /**
   * Listagem administrativa de todas as transferências (não apenas pendentes
   * do usuário atual), usada pela tela de gestão no painel admin.
   */
  async list(args: {
    pointId?: string;
    status?: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.FuelTransferWhereInput = {};
    if (args.pointId) {
      where.OR = [
        { originPointId: args.pointId },
        { destPointId: args.pointId },
      ];
    }
    if (args.status) where.status = args.status;
    const take = args.take ?? 100;
    const skip = args.skip ?? 0;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: TRANSFER_INCLUDE,
      }),
      this.prisma.fuelTransfer.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async listPendingForUser(userId: string) {
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);
    if (accessible.length === 0) {
      return { items: [], total: 0 };
    }
    const items = await this.prisma.fuelTransfer.findMany({
      where: {
        status: 'PENDENTE',
        OR: [
          { originPointId: { in: accessible } },
          { destPointId: { in: accessible } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: TRANSFER_INCLUDE,
      take: 200,
    });
    return { items, total: items.length };
  }

  async findOne(id: string) {
    const t = await this.prisma.fuelTransfer.findUnique({
      where: { id },
      include: TRANSFER_INCLUDE,
    });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    return t;
  }
}
