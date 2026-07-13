import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { BasicListDto } from './dto/list.dto';
import type { CreateFuelProductDto } from './dto/create-fuel-product.dto';
import type { UpdateFuelProductDto } from './dto/update-fuel-product.dto';

@Injectable()
export class FuelProductsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: BasicListDto) {
    const where: Prisma.FuelProductWhereInput | undefined = dto.q
      ? { name: { contains: dto.q, mode: 'insensitive' } }
      : undefined;
    const order = dto.order ?? 'asc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelProduct.findMany({
        where,
        orderBy: { name: order },
        take,
        skip,
      }),
      this.prisma.fuelProduct.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const item = await this.prisma.fuelProduct.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Produto não encontrado');
    }
    return item;
  }

  async create(dto: CreateFuelProductDto) {
    const name = dto.name.trim();
    const clash = await this.prisma.fuelProduct.findUnique({ where: { name } });
    if (clash) {
      throw new ConflictException('Já existe produto com esse nome');
    }
    return this.prisma.fuelProduct.create({
      data: {
        name,
        unit: dto.unit?.trim() || 'L',
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFuelProductDto) {
    await this.findOne(id);
    const data: Prisma.FuelProductUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.fuelProduct.findFirst({
        where: { name, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Já existe produto com esse nome');
      }
      data.name = name;
    }
    if (dto.unit !== undefined) data.unit = dto.unit.trim() || 'L';
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.fuelProduct.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.fuelStock.count({
      where: { productId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'Produto está em uso em estoques. Desative-o em vez de excluir.',
      );
    }
    await this.prisma.fuelProduct.delete({ where: { id } });
    return { ok: true };
  }
}
