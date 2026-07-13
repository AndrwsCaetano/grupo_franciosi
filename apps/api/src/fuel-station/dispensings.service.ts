import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDispensingDto } from './dto/create-dispensing.dto';
import { ErpIntegrationService } from './erp-integration.service';
import { FuelStationService } from './fuel-station.service';

const DISPENSING_INCLUDE: Prisma.FuelDispensingInclude = {
  machinery: { select: { id: true, tag: true, name: true, category: true } },
  point: { select: { id: true, name: true, type: true } },
  product: { select: { id: true, name: true, unit: true } },
  operator: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class DispensingsService {
  constructor(
    private prisma: PrismaService,
    private fuelStation: FuelStationService,
    private erp: ErpIntegrationService,
  ) {}

  async create(userId: string, dto: CreateDispensingDto) {
    // Idempotência offline: se o cliente reenvia o mesmo offlineClientId,
    // devolvemos o registro já persistido em vez de duplicar.
    if (dto.offlineClientId) {
      const existing = await this.prisma.fuelDispensing.findUnique({
        where: { offlineClientId: dto.offlineClientId },
        include: DISPENSING_INCLUDE,
      });
      if (existing) return existing;
    }

    const liters = Number(dto.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      throw new BadRequestException('liters deve ser maior que zero');
    }

    // Carrega e valida entidades ANTES da transação para dar erros mais claros.
    const machinery = await this.prisma.machinery.findUnique({
      where: { id: dto.machineryId },
    });
    if (!machinery) {
      throw new BadRequestException('Equipamento não encontrado');
    }
    if (!machinery.validatedAt) {
      throw new BadRequestException(
        'Equipamento ainda não validado — libere no módulo de validação antes de apontar.',
      );
    }
    if (machinery.status !== 'ATIVO') {
      throw new BadRequestException(
        `Equipamento com status ${machinery.status} não pode receber apontamento.`,
      );
    }

    const point = await this.prisma.fuelPoint.findUnique({
      where: { id: dto.pointId },
    });
    if (!point) throw new BadRequestException('Ponto não encontrado');
    if (!point.validatedAt) {
      throw new BadRequestException('Ponto ainda não validado.');
    }
    if (!point.active) {
      throw new BadRequestException('Ponto inativo.');
    }

    // Operador precisa ter acesso ao ponto (admin ignora — controlado no service abaixo).
    const accessible = await this.fuelStation.getAccessiblePointIds(userId);
    if (!accessible.includes(point.id)) {
      throw new ForbiddenException(
        'Você não tem acesso operacional a este ponto.',
      );
    }

    const product = await this.prisma.fuelProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new BadRequestException('Produto não encontrado');
    if (!product.active) {
      throw new BadRequestException('Produto inativo');
    }

    // Regras adicionais: horímetro/km reportados não podem regredir.
    if (dto.hourMeterReported !== undefined) {
      const currentHm = this.fuelStation.toNumber(machinery.hourMeter);
      if (dto.hourMeterReported < currentHm) {
        throw new BadRequestException(
          `Horímetro reportado (${dto.hourMeterReported}) é menor que o último registrado (${currentHm}).`,
        );
      }
    }
    if (dto.kmReported !== undefined) {
      if (dto.kmReported < machinery.odometerKm) {
        throw new BadRequestException(
          `Km reportado (${dto.kmReported}) é menor que o último registrado (${machinery.odometerKm}).`,
        );
      }
    }

    // Tudo validado — abre transação: cria dispensing, debita estoque, atualiza medidor.
    // Em caso de falha (ex.: saldo insuficiente detectado dentro da transação),
    // o registro é gravado com syncStatus=ERRO fora da transação para auditoria.
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const disp = await tx.fuelDispensing.create({
          data: {
            machineryId: machinery.id,
            pointId: point.id,
            productId: product.id,
            liters,
            hourMeterReported: dto.hourMeterReported ?? null,
            kmReported: dto.kmReported ?? null,
            operatorUserId: userId,
            offlineClientId: dto.offlineClientId ?? null,
            syncStatus: 'PENDENTE',
          },
        });

        await this.fuelStation.applyStockDelta(tx, {
          pointId: point.id,
          productId: product.id,
          deltaLiters: -liters,
          type: 'ABASTECIMENTO',
          referenceId: disp.id,
        });

        const machineryUpdate: Prisma.MachineryUpdateInput = {};
        if (dto.hourMeterReported !== undefined) {
          machineryUpdate.hourMeter = dto.hourMeterReported;
        }
        if (dto.kmReported !== undefined) {
          machineryUpdate.odometerKm = dto.kmReported;
        }
        if (Object.keys(machineryUpdate).length > 0) {
          await tx.machinery.update({
            where: { id: machinery.id },
            data: machineryUpdate,
          });
        }
        return disp;
      });

      // Empurra assíncrono para o ERP (mock por enquanto).
      await this.erp.pushDispensing(created.id);

      return this.prisma.fuelDispensing.findUniqueOrThrow({
        where: { id: created.id },
        include: DISPENSING_INCLUDE,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Registra falha com syncStatus=ERRO, mas apenas se o dispensing tiver
      // sido criado (não é o caso aqui — a transação inteira reverteu).
      // Para o cliente, propagamos o erro original.
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      // Grava um registro ERRO fora da transação para auditoria de falha real.
      const errorRecord = await this.prisma.fuelDispensing.create({
        data: {
          machineryId: machinery.id,
          pointId: point.id,
          productId: product.id,
          liters,
          hourMeterReported: dto.hourMeterReported ?? null,
          kmReported: dto.kmReported ?? null,
          operatorUserId: userId,
          offlineClientId: dto.offlineClientId
            ? `${dto.offlineClientId}-erro-${Date.now()}`
            : null,
          syncStatus: 'ERRO',
          errorMsg: msg,
        },
        include: DISPENSING_INCLUDE,
      });
      throw new BadRequestException({
        message: 'Falha ao processar apontamento',
        detail: msg,
        errorRecordId: errorRecord.id,
      });
    }
  }

  async list(args: {
    pointId?: string;
    machineryId?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.FuelDispensingWhereInput = {};
    if (args.pointId) where.pointId = args.pointId;
    if (args.machineryId) where.machineryId = args.machineryId;
    const take = args.take ?? 100;
    const skip = args.skip ?? 0;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelDispensing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: DISPENSING_INCLUDE,
      }),
      this.prisma.fuelDispensing.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const item = await this.prisma.fuelDispensing.findUnique({
      where: { id },
      include: DISPENSING_INCLUDE,
    });
    if (!item) throw new NotFoundException('Apontamento não encontrado');
    return item;
  }
}
