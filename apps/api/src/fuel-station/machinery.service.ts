import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMachineryDto } from './dto/create-machinery.dto';
import type { BasicListDto } from './dto/list.dto';
import type { UpdateMachineryDto } from './dto/update-machinery.dto';

@Injectable()
export class MachineryService {
  constructor(private prisma: PrismaService) {}

  async list(dto: BasicListDto) {
    const where: Prisma.MachineryWhereInput | undefined = dto.q
      ? {
          OR: [
            { tag: { contains: dto.q, mode: 'insensitive' } },
            { name: { contains: dto.q, mode: 'insensitive' } },
            { category: { contains: dto.q, mode: 'insensitive' } },
          ],
        }
      : undefined;
    const order = dto.order ?? 'asc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.machinery.findMany({
        where,
        orderBy: { tag: order },
        take,
        skip,
        include: {
          defaultProduct: { select: { id: true, name: true, unit: true } },
        },
      }),
      this.prisma.machinery.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const m = await this.prisma.machinery.findUnique({
      where: { id },
      include: {
        defaultProduct: { select: { id: true, name: true, unit: true } },
      },
    });
    if (!m) throw new NotFoundException('Equipamento não encontrado');
    return m;
  }

  async create(dto: CreateMachineryDto) {
    const tag = dto.tag.trim().toUpperCase();
    const exists = await this.prisma.machinery.findUnique({ where: { tag } });
    if (exists) throw new ConflictException('Já existe equipamento com essa tag');
    if (dto.defaultProductId) {
      const p = await this.prisma.fuelProduct.findUnique({
        where: { id: dto.defaultProductId },
      });
      if (!p) throw new BadRequestException('defaultProductId inválido');
    }
    return this.prisma.machinery.create({
      data: {
        tag,
        name: dto.name.trim(),
        category: dto.category.trim(),
        defaultProductId: dto.defaultProductId ?? null,
        hourMeter: dto.hourMeter ?? 0,
        odometerKm: dto.odometerKm ?? 0,
        status: dto.status ?? 'ATIVO',
        erpExternalId: dto.erpExternalId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateMachineryDto) {
    await this.ensure(id);
    const data: Prisma.MachineryUpdateInput = {};
    if (dto.tag !== undefined) {
      const tag = dto.tag.trim().toUpperCase();
      const clash = await this.prisma.machinery.findFirst({
        where: { tag, NOT: { id } },
      });
      if (clash) throw new ConflictException('Tag já cadastrada');
      data.tag = tag;
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.defaultProductId !== undefined) {
      if (dto.defaultProductId === null) {
        data.defaultProduct = { disconnect: true };
      } else {
        const p = await this.prisma.fuelProduct.findUnique({
          where: { id: dto.defaultProductId },
        });
        if (!p) throw new BadRequestException('defaultProductId inválido');
        data.defaultProduct = { connect: { id: dto.defaultProductId } };
      }
    }
    if (dto.hourMeter !== undefined) data.hourMeter = dto.hourMeter;
    if (dto.odometerKm !== undefined) data.odometerKm = dto.odometerKm;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.erpExternalId !== undefined) {
      data.erpExternalId = dto.erpExternalId;
    }
    if (dto.validated !== undefined) {
      data.validatedAt = dto.validated ? new Date() : null;
    }
    return this.prisma.machinery.update({
      where: { id },
      data,
      include: {
        defaultProduct: { select: { id: true, name: true, unit: true } },
      },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    const used = await this.prisma.fuelDispensing.count({
      where: { machineryId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'Equipamento possui apontamentos. Marque como INATIVO em vez de excluir.',
      );
    }
    await this.prisma.machinery.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string) {
    const m = await this.prisma.machinery.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Equipamento não encontrado');
  }
}
