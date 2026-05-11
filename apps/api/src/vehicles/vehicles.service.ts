import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { isValidPlate, normalizePlate } from '../common/plate.util';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVehicleDto } from './dto/create-vehicle.dto';
import type { ListVehiclesDto } from './dto/list-vehicles.dto';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async list(dto: ListVehiclesDto) {
    const where: Prisma.VehicleWhereInput | undefined = dto.q
      ? {
          OR: [
            { plate: { contains: dto.q.toUpperCase() } },
            { brand: { contains: dto.q, mode: 'insensitive' } },
            { model: { contains: dto.q, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const sort = dto.sort ?? 'plate';
    const order = dto.order ?? 'asc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { [sort]: order },
        take,
        skip,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { driver: { select: { id: true, name: true } } },
          orderBy: { startDate: 'desc' },
          take: 50,
        },
      },
    });
    if (!v) {
      throw new NotFoundException('Veículo não encontrado');
    }
    return v;
  }

  async create(dto: CreateVehicleDto) {
    const plate = normalizePlate(dto.plate);
    if (!isValidPlate(plate)) {
      throw new BadRequestException(
        'Placa inválida. Use formato Mercosul (ABC1D23) ou clássico (ABC1234).',
      );
    }
    const exists = await this.prisma.vehicle.findUnique({ where: { plate } });
    if (exists) {
      throw new ConflictException('Placa já cadastrada');
    }
    return this.prisma.vehicle.create({
      data: {
        plate,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        fuelTankLiters: dto.fuelTankLiters,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.ensure(id);
    const data: Prisma.VehicleUpdateInput = {};
    if (dto.plate !== undefined) {
      const plate = normalizePlate(dto.plate);
      if (!isValidPlate(plate)) {
        throw new BadRequestException('Placa inválida.');
      }
      const clash = await this.prisma.vehicle.findFirst({
        where: { plate, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Placa já cadastrada');
      }
      data.plate = plate;
    }
    if (dto.brand !== undefined) {
      data.brand = dto.brand.trim();
    }
    if (dto.model !== undefined) {
      data.model = dto.model.trim();
    }
    if (dto.fuelTankLiters !== undefined) {
      data.fuelTankLiters = dto.fuelTankLiters;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensure(id);
    const used = await this.prisma.driverVehicleAssignment.count({
      where: { vehicleId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'Não é possível excluir: existem vínculos de motoristas. Remova os vínculos antes.',
      );
    }
    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) {
      throw new NotFoundException('Veículo não encontrado');
    }
  }
}
