import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, unlinkSync } from 'node:fs';
import {
  RECEIPTS_SUBDIR,
  UPLOADS_DIR,
} from '../common/uploads.config';
import { PrismaService } from '../prisma/prisma.service';
import type { DriverCreateFuelingDto } from './dto/driver-create-fueling.dto';
import type { ListDriverFuelingsDto } from './dto/list-driver-fuelings.dto';

function toDateOnlyFromInstant(d: Date, field: string): Date {
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Data inválida em ${field}`);
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function parseLancadoEm(iso: string | undefined): Date {
  if (!iso) {
    return new Date();
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Data/hora de lançamento inválida');
  }
  return d;
}

function assertLancadoEmSane(lancado: Date) {
  const now = Date.now();
  const t = lancado.getTime();
  const maxFuture = now + 24 * 60 * 60 * 1000;
  const minPast = now - 400 * 24 * 60 * 60 * 1000;
  if (t > maxFuture || t < minPast) {
    throw new BadRequestException('Data/hora de lançamento fora do intervalo permitido');
  }
}

function toFuelDateOnlyYmd(iso: string, field: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Data inválida em ${field}`);
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function assertFuelDateSane(fuelDate: Date) {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const minUtc = new Date(todayUtc);
  minUtc.setUTCDate(minUtc.getUTCDate() - 400);
  const maxUtc = new Date(todayUtc);
  maxUtc.setUTCDate(maxUtc.getUTCDate() + 1);
  const t = fuelDate.getTime();
  if (t < minUtc.getTime() || t > maxUtc.getTime()) {
    throw new BadRequestException(
      'Data do abastecimento fora do intervalo permitido',
    );
  }
}

const DRIVER_FUELING_INCLUDE = {
  vehicle: { select: { id: true, plate: true, brand: true, model: true } },
} as const;

@Injectable()
export class DriverPortalService {
  constructor(private prisma: PrismaService) {}

  async me(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, cpf: true, active: true },
    });
    if (!driver?.active) {
      throw new UnprocessableEntityException('Motorista indisponível');
    }
    const open = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endDate: null },
      include: {
        vehicle: {
          select: { id: true, plate: true, brand: true, model: true, active: true },
        },
      },
    });
    if (!open) {
      return {
        driver: { id: driver.id, name: driver.name, cpf: driver.cpf },
        currentVehicle: null,
      };
    }
    if (!open.vehicle.active) {
      throw new UnprocessableEntityException('Veículo vinculado está inativo');
    }
    return {
      driver: { id: driver.id, name: driver.name, cpf: driver.cpf },
      currentVehicle: {
        id: open.vehicle.id,
        plate: open.vehicle.plate,
        brand: open.vehicle.brand,
        model: open.vehicle.model,
      },
    };
  }

  async listFuelings(driverId: string, dto: ListDriverFuelingsDto) {
    const take = dto.take ?? 50;
    const skip = dto.skip ?? 0;
    const where: Prisma.VehicleFuelingWhereInput = { driverId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleFueling.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          fuelDate: true,
          quantityLiters: true,
          odometerKm: true,
          receiptImagePath: true,
          createdAt: true,
          dataSincronizacao: true,
          offlineClientId: true,
          vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        },
      }),
      this.prisma.vehicleFueling.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async createFueling(
    driverId: string,
    dto: DriverCreateFuelingDto,
    receiptFile: Express.Multer.File | undefined,
  ) {
    if (!receiptFile) {
      throw new BadRequestException('Comprovante é obrigatório');
    }

    if (dto.offlineClientId) {
      const existing = await this.prisma.vehicleFueling.findUnique({
        where: { offlineClientId: dto.offlineClientId },
        include: DRIVER_FUELING_INCLUDE,
      });
      if (existing) {
        if (existing.driverId !== driverId) {
          throw new ConflictException('Identificador de sincronização inválido');
        }
        return { item: existing, alreadyExists: true as const };
      }
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver?.active) {
      this.cleanFile(receiptFile);
      throw new UnprocessableEntityException('Motorista indisponível');
    }

    const open = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endDate: null },
      include: { vehicle: true },
    });
    if (!open?.vehicle) {
      this.cleanFile(receiptFile);
      throw new UnprocessableEntityException(
        'Sem veículo vinculado. Não é possível lançar abastecimento.',
      );
    }
    if (!open.vehicle.active) {
      this.cleanFile(receiptFile);
      throw new UnprocessableEntityException('Veículo vinculado está inativo');
    }

    const lancado = parseLancadoEm(dto.lancadoEm);
    assertLancadoEmSane(lancado);
    let fuelDate: Date;
    if (dto.fuelDate) {
      fuelDate = toFuelDateOnlyYmd(dto.fuelDate, 'fuelDate');
      assertFuelDateSane(fuelDate);
    } else {
      fuelDate = toDateOnlyFromInstant(lancado, 'lancadoEm');
    }
    const syncNow = new Date();
    const receiptImagePath = `${RECEIPTS_SUBDIR}/${receiptFile.filename}`;

    const created = await this.prisma.vehicleFueling.create({
      data: {
        driverId,
        vehicleId: open.vehicleId,
        driverNameSnapshot: driver.name,
        fuelDate,
        quantityLiters: dto.quantityLiters,
        odometerKm: dto.odometerKm,
        receiptImagePath,
        createdById: null,
        offlineClientId: dto.offlineClientId ?? null,
        dataSincronizacao: syncNow,
        createdAt: lancado,
      },
      include: DRIVER_FUELING_INCLUDE,
    });
    return { item: created, alreadyExists: false as const };
  }

  private cleanFile(file: Express.Multer.File | undefined) {
    if (!file) return;
    try {
      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }
    } catch {
      // ignore
    }
  }
}
