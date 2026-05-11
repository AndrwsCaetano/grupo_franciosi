import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { digitsOnly, isValidCpf } from '../common/cpf.util';
import { PrismaService } from '../prisma/prisma.service';
import type { AssignVehicleDto, FinishAssignmentDto } from './dto/assign-vehicle.dto';
import type { CreateDriverDto } from './dto/create-driver.dto';
import type { ListDriversDto } from './dto/list-drivers.dto';
import type { UpdateDriverDto } from './dto/update-driver.dto';

function toDateOnly(iso: string, field: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Data inválida em ${field}`);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async list(dto: ListDriversDto) {
    const where: Prisma.DriverWhereInput | undefined = dto.q
      ? {
          OR: [
            { name: { contains: dto.q, mode: 'insensitive' } },
            { cpf: { contains: digitsOnly(dto.q) || dto.q } },
            { licenseNumber: { contains: dto.q.toUpperCase() } },
          ],
        }
      : undefined;

    const sort = dto.sort ?? 'name';
    const order = dto.order ?? 'asc';
    const take = dto.take ?? 100;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        orderBy: { [sort]: order },
        take,
        skip,
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignments: {
            where: { endDate: null },
            include: { vehicle: { select: { id: true, plate: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignments: {
          orderBy: [{ endDate: 'asc' }, { startDate: 'desc' }],
          include: {
            vehicle: {
              select: { id: true, plate: true, brand: true, model: true },
            },
          },
        },
      },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const cpf = digitsOnly(dto.cpf);
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF inválido');
    }
    const exists = await this.prisma.driver.findUnique({ where: { cpf } });
    if (exists) {
      throw new ConflictException('CPF já cadastrado');
    }
    if (dto.userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!u) {
        throw new BadRequestException('Usuário (userId) inválido');
      }
    }
    const issue = toDateOnly(dto.licenseIssueDate, 'licenseIssueDate');
    const expiry = toDateOnly(dto.licenseExpiryDate, 'licenseExpiryDate');
    if (expiry < issue) {
      throw new BadRequestException(
        'Vencimento da CNH não pode ser anterior à emissão',
      );
    }
    return this.prisma.driver.create({
      data: {
        userId: dto.userId ?? null,
        name: dto.name.trim().toUpperCase(),
        birthDate: toDateOnly(dto.birthDate, 'birthDate'),
        cpf,
        licenseNumber: dto.licenseNumber.trim().toUpperCase(),
        licenseIssueDate: issue,
        licenseExpiryDate: expiry,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDriverDto) {
    const current = await this.prisma.driver.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Motorista não encontrado');
    }
    const data: Prisma.DriverUpdateInput = {};

    if (dto.cpf !== undefined) {
      const cpf = digitsOnly(dto.cpf);
      if (!isValidCpf(cpf)) {
        throw new BadRequestException('CPF inválido');
      }
      const clash = await this.prisma.driver.findFirst({
        where: { cpf, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('CPF já cadastrado');
      }
      data.cpf = cpf;
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim().toUpperCase();
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = toDateOnly(dto.birthDate, 'birthDate');
    }
    if (dto.licenseNumber !== undefined) {
      data.licenseNumber = dto.licenseNumber.trim().toUpperCase();
    }
    if (dto.licenseIssueDate !== undefined) {
      data.licenseIssueDate = toDateOnly(
        dto.licenseIssueDate,
        'licenseIssueDate',
      );
    }
    if (dto.licenseExpiryDate !== undefined) {
      data.licenseExpiryDate = toDateOnly(
        dto.licenseExpiryDate,
        'licenseExpiryDate',
      );
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.userId !== undefined) {
      if (dto.userId === null) {
        data.user = { disconnect: true };
      } else {
        const u = await this.prisma.user.findUnique({
          where: { id: dto.userId },
        });
        if (!u) {
          throw new BadRequestException('Usuário (userId) inválido');
        }
        data.user = { connect: { id: dto.userId } };
      }
    }

    const issue =
      data.licenseIssueDate instanceof Date
        ? data.licenseIssueDate
        : current.licenseIssueDate;
    const expiry =
      data.licenseExpiryDate instanceof Date
        ? data.licenseExpiryDate
        : current.licenseExpiryDate;
    if (expiry < issue) {
      throw new BadRequestException(
        'Vencimento da CNH não pode ser anterior à emissão',
      );
    }

    return this.prisma.driver.update({ where: { id }, data });
  }

  async remove(id: string) {
    const exists = await this.prisma.driver.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Motorista não encontrado');
    }
    const used = await this.prisma.driverVehicleAssignment.count({
      where: { driverId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'Não é possível excluir: motorista possui vínculos com veículos.',
      );
    }
    await this.prisma.driver.delete({ where: { id } });
    return { ok: true };
  }

  // ------------------- Vínculos motorista <-> veículo -------------------

  async listAssignments(driverId: string) {
    await this.ensureDriver(driverId);
    return this.prisma.driverVehicleAssignment.findMany({
      where: { driverId },
      orderBy: [{ endDate: 'asc' }, { startDate: 'desc' }],
      include: {
        vehicle: {
          select: { id: true, plate: true, brand: true, model: true },
        },
      },
    });
  }

  async assignVehicle(driverId: string, dto: AssignVehicleDto) {
    await this.ensureDriver(driverId);
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    if (!vehicle.active) {
      throw new BadRequestException('Veículo inativo não pode ser vinculado');
    }

    const start = toDateOnly(dto.startDate, 'startDate');

    const driverOpen = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endDate: null },
    });
    if (driverOpen) {
      throw new ConflictException(
        'Motorista já possui um vínculo aberto. Finalize-o antes de criar outro.',
      );
    }
    const vehicleOpen = await this.prisma.driverVehicleAssignment.findFirst({
      where: { vehicleId: dto.vehicleId, endDate: null },
    });
    if (vehicleOpen) {
      throw new ConflictException(
        'A placa já possui um vínculo aberto com outro motorista. Finalize-o primeiro.',
      );
    }
    return this.prisma.driverVehicleAssignment.create({
      data: {
        driverId,
        vehicleId: dto.vehicleId,
        startDate: start,
        notes: dto.notes,
      },
      include: {
        vehicle: { select: { id: true, plate: true } },
      },
    });
  }

  async finishAssignment(
    driverId: string,
    assignmentId: string,
    dto: FinishAssignmentDto,
  ) {
    const assignment = await this.prisma.driverVehicleAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.driverId !== driverId) {
      throw new NotFoundException('Vínculo não encontrado para este motorista');
    }
    if (assignment.endDate) {
      throw new BadRequestException('Vínculo já está finalizado');
    }
    const end = toDateOnly(dto.endDate, 'endDate');
    if (end < assignment.startDate) {
      throw new BadRequestException(
        'Data final não pode ser anterior à data inicial',
      );
    }
    return this.prisma.driverVehicleAssignment.update({
      where: { id: assignmentId },
      data: { endDate: end },
    });
  }

  async deleteAssignment(driverId: string, assignmentId: string) {
    const assignment = await this.prisma.driverVehicleAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.driverId !== driverId) {
      throw new NotFoundException('Vínculo não encontrado para este motorista');
    }
    await this.prisma.driverVehicleAssignment.delete({
      where: { id: assignmentId },
    });
    return { ok: true };
  }

  private async ensureDriver(id: string) {
    const d = await this.prisma.driver.findUnique({ where: { id } });
    if (!d) {
      throw new NotFoundException('Motorista não encontrado');
    }
  }
}
