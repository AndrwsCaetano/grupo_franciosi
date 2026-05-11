import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  RECEIPTS_SUBDIR,
  UPLOADS_DIR,
} from '../common/uploads.config';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFuelingDto } from './dto/create-fueling.dto';
import type { ListFuelingsDto } from './dto/list-fuelings.dto';
import type { StatsFilterDto } from './dto/stats-filter.dto';
import type { UpdateFuelingDto } from './dto/update-fueling.dto';

function toDateOnly(iso: string, field: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Data inválida em ${field}`);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'object' && 'toNumber' in value
    ? value.toNumber()
    : Number(value);
}

const INCLUDE: Prisma.VehicleFuelingInclude = {
  driver: { select: { id: true, name: true, cpf: true } },
  vehicle: { select: { id: true, plate: true, brand: true, model: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class FuelingsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: ListFuelingsDto) {
    const where: Prisma.VehicleFuelingWhereInput = {};
    if (dto.q && dto.q.trim()) {
      const term = dto.q.trim();
      where.OR = [
        { driverNameSnapshot: { contains: term, mode: 'insensitive' } },
        { driver: { name: { contains: term, mode: 'insensitive' } } },
        { vehicle: { plate: { contains: term.toUpperCase() } } },
      ];
    }
    if (dto.from || dto.to) {
      where.fuelDate = {};
      if (dto.from) {
        (where.fuelDate as Prisma.DateTimeFilter).gte = toDateOnly(
          dto.from,
          'from',
        );
      }
      if (dto.to) {
        (where.fuelDate as Prisma.DateTimeFilter).lte = toDateOnly(
          dto.to,
          'to',
        );
      }
    }

    const sort = dto.sort ?? 'fuelDate';
    const order = dto.order ?? 'desc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const orderBy: Prisma.VehicleFuelingOrderByWithRelationInput =
      sort === 'driver'
        ? { driver: { name: order } }
        : sort === 'vehicle'
          ? { vehicle: { plate: order } }
          : ({ [sort]: order } as Prisma.VehicleFuelingOrderByWithRelationInput);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleFueling.findMany({
        where,
        orderBy,
        take,
        skip,
        include: INCLUDE,
      }),
      this.prisma.vehicleFueling.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const item = await this.prisma.vehicleFueling.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!item) {
      throw new NotFoundException('Abastecimento não encontrado');
    }
    return item;
  }

  async create(
    dto: CreateFuelingDto,
    receiptFile: Express.Multer.File | undefined,
    currentUserId: string,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });
    if (!driver) {
      this.cleanFile(receiptFile);
      throw new BadRequestException('Motorista (driverId) inválido');
    }
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      this.cleanFile(receiptFile);
      throw new BadRequestException('Veículo (vehicleId) inválido');
    }

    const receiptImagePath = receiptFile
      ? this.relativeReceiptPath(receiptFile.filename)
      : null;

    const now = new Date();
    const created = await this.prisma.vehicleFueling.create({
      data: {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        driverNameSnapshot: driver.name,
        fuelDate: toDateOnly(dto.fuelDate, 'fuelDate'),
        quantityLiters: dto.quantityLiters,
        odometerKm: dto.odometerKm ?? null,
        notes: dto.notes,
        receiptImagePath,
        createdById: currentUserId,
        dataSincronizacao: now,
      },
      include: INCLUDE,
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateFuelingDto,
    receiptFile: Express.Multer.File | undefined,
  ) {
    const current = await this.prisma.vehicleFueling.findUnique({
      where: { id },
    });
    if (!current) {
      this.cleanFile(receiptFile);
      throw new NotFoundException('Abastecimento não encontrado');
    }

    const data: Prisma.VehicleFuelingUpdateInput = {};

    if (dto.driverId !== undefined) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver) {
        this.cleanFile(receiptFile);
        throw new BadRequestException('Motorista (driverId) inválido');
      }
      data.driver = { connect: { id: dto.driverId } };
      data.driverNameSnapshot = driver.name;
    }
    if (dto.vehicleId !== undefined) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) {
        this.cleanFile(receiptFile);
        throw new BadRequestException('Veículo (vehicleId) inválido');
      }
      data.vehicle = { connect: { id: dto.vehicleId } };
    }
    if (dto.fuelDate !== undefined) {
      data.fuelDate = toDateOnly(dto.fuelDate, 'fuelDate');
    }
    if (dto.quantityLiters !== undefined) {
      data.quantityLiters = dto.quantityLiters;
    }
    if (dto.odometerKm !== undefined) {
      data.odometerKm = dto.odometerKm;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    const wantsRemove = dto.removeReceipt === 'true';
    if (receiptFile) {
      data.receiptImagePath = this.relativeReceiptPath(receiptFile.filename);
      if (current.receiptImagePath) {
        this.deleteAbsoluteByRelative(current.receiptImagePath);
      }
    } else if (wantsRemove && current.receiptImagePath) {
      data.receiptImagePath = null;
      this.deleteAbsoluteByRelative(current.receiptImagePath);
    }

    return this.prisma.vehicleFueling.update({
      where: { id },
      data,
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    const current = await this.prisma.vehicleFueling.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Abastecimento não encontrado');
    }
    if (current.receiptImagePath) {
      this.deleteAbsoluteByRelative(current.receiptImagePath);
    }
    await this.prisma.vehicleFueling.delete({ where: { id } });
    return { ok: true };
  }

  async getStats(filter: StatsFilterDto) {
    const where: Prisma.VehicleFuelingWhereInput = {};

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (filter.from) fromDate = toDateOnly(filter.from, 'from');
    if (filter.to) toDate = toDateOnly(filter.to, 'to');
    if (fromDate || toDate) {
      where.fuelDate = {};
      if (fromDate) (where.fuelDate as Prisma.DateTimeFilter).gte = fromDate;
      if (toDate) (where.fuelDate as Prisma.DateTimeFilter).lte = toDate;
    }
    if (filter.driverId) where.driverId = filter.driverId;
    if (filter.vehicleId) where.vehicleId = filter.vehicleId;

    const [totals, distincts, topVehiclesRaw, topDriversRaw] =
      await this.prisma.$transaction([
        this.prisma.vehicleFueling.aggregate({
          where,
          _count: { _all: true },
          _sum: { quantityLiters: true },
          _avg: { quantityLiters: true },
        }),
        this.prisma.vehicleFueling.findMany({
          where,
          select: { driverId: true, vehicleId: true },
        }),
        this.prisma.vehicleFueling.groupBy({
          by: ['vehicleId'],
          where,
          _count: true,
          _sum: { quantityLiters: true },
          orderBy: { _sum: { quantityLiters: 'desc' } },
          take: 10,
        }),
        this.prisma.vehicleFueling.groupBy({
          by: ['driverId'],
          where,
          _count: true,
          _sum: { quantityLiters: true },
          orderBy: { _sum: { quantityLiters: 'desc' } },
          take: 10,
        }),
      ]);

    const vehiclesMap = new Map<
      string,
      { id: string; plate: string; brand: string; model: string }
    >();
    if (topVehiclesRaw.length) {
      const vs = await this.prisma.vehicle.findMany({
        where: { id: { in: topVehiclesRaw.map((v) => v.vehicleId) } },
        select: { id: true, plate: true, brand: true, model: true },
      });
      for (const v of vs) vehiclesMap.set(v.id, v);
    }
    const driversMap = new Map<string, { id: string; name: string }>();
    if (topDriversRaw.length) {
      const ds = await this.prisma.driver.findMany({
        where: { id: { in: topDriversRaw.map((d) => d.driverId) } },
        select: { id: true, name: true },
      });
      for (const d of ds) driversMap.set(d.id, d);
    }

    const monthly = await this.queryMonthlySeries(
      fromDate,
      toDate,
      filter.driverId,
      filter.vehicleId,
    );

    const totalKm = await this.queryTotalKmByVehicle(
      fromDate,
      toDate,
      filter.driverId,
      filter.vehicleId,
    );

    const uniqueDrivers = new Set(distincts.map((d) => d.driverId)).size;
    const uniqueVehicles = new Set(distincts.map((d) => d.vehicleId)).size;
    const totalLiters = decimalToNumber(totals._sum.quantityLiters);
    const avgLiters = decimalToNumber(totals._avg.quantityLiters);
    const count = totals._count._all;

    return {
      filters: {
        from: filter.from ?? null,
        to: filter.to ?? null,
        driverId: filter.driverId ?? null,
        vehicleId: filter.vehicleId ?? null,
      },
      kpis: {
        totalLiters,
        count,
        avgLitersPerFueling: avgLiters,
        uniqueDrivers,
        uniqueVehicles,
        totalKm,
      },
      monthly,
      topVehicles: topVehiclesRaw.map((v) => {
        const meta = vehiclesMap.get(v.vehicleId);
        return {
          vehicleId: v.vehicleId,
          plate: meta?.plate ?? '—',
          brand: meta?.brand ?? '',
          model: meta?.model ?? '',
          liters: decimalToNumber(v._sum?.quantityLiters),
          count: typeof v._count === 'number' ? v._count : 0,
        };
      }),
      topDrivers: topDriversRaw.map((d) => {
        const meta = driversMap.get(d.driverId);
        return {
          driverId: d.driverId,
          name: meta?.name ?? '—',
          liters: decimalToNumber(d._sum?.quantityLiters),
          count: typeof d._count === 'number' ? d._count : 0,
        };
      }),
    };
  }

  private buildStatsConditions(
    fromDate: Date | undefined,
    toDate: Date | undefined,
    driverId: string | undefined,
    vehicleId: string | undefined,
  ) {
    const conds: Prisma.Sql[] = [];
    if (fromDate) conds.push(Prisma.sql`"fuelDate" >= ${fromDate}`);
    if (toDate) conds.push(Prisma.sql`"fuelDate" <= ${toDate}`);
    if (driverId) conds.push(Prisma.sql`"driverId" = ${driverId}`);
    if (vehicleId) conds.push(Prisma.sql`"vehicleId" = ${vehicleId}`);
    return conds;
  }

  private async queryMonthlySeries(
    fromDate: Date | undefined,
    toDate: Date | undefined,
    driverId: string | undefined,
    vehicleId: string | undefined,
  ): Promise<{ month: string; liters: number; count: number }[]> {
    const conds = this.buildStatsConditions(
      fromDate,
      toDate,
      driverId,
      vehicleId,
    );
    const whereSql = conds.length
      ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      { month: Date; liters: string | null; count: bigint }[]
    >(Prisma.sql`
      SELECT
        date_trunc('month', "fuelDate")::date AS month,
        SUM("quantityLiters") AS liters,
        COUNT(*)::bigint AS count
      FROM "VehicleFueling"
      ${whereSql}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((r) => ({
      month: this.toMonthIso(r.month),
      liters: r.liters ? Number(r.liters) : 0,
      count: Number(r.count),
    }));
  }

  private async queryTotalKmByVehicle(
    fromDate: Date | undefined,
    toDate: Date | undefined,
    driverId: string | undefined,
    vehicleId: string | undefined,
  ): Promise<number> {
    const conds = this.buildStatsConditions(
      fromDate,
      toDate,
      driverId,
      vehicleId,
    );
    conds.push(Prisma.sql`"odometerKm" IS NOT NULL`);
    const whereSql = Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<{ total_km: bigint | null }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(diff), 0)::bigint AS total_km
        FROM (
          SELECT MAX("odometerKm") - MIN("odometerKm") AS diff
          FROM "VehicleFueling"
          ${whereSql}
          GROUP BY "vehicleId"
        ) t
        WHERE diff > 0
      `,
    );
    return rows[0]?.total_km ? Number(rows[0].total_km) : 0;
  }

  private toMonthIso(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private relativeReceiptPath(filename: string): string {
    return `${RECEIPTS_SUBDIR}/${filename}`;
  }

  private deleteAbsoluteByRelative(rel: string) {
    try {
      const abs = join(UPLOADS_DIR, rel);
      if (existsSync(abs)) {
        unlinkSync(abs);
      }
    } catch {
      // silencioso — não bloquear operação por erro de FS
    }
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
