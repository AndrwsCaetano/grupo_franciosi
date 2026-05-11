import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private prisma: PrismaService) {}

  /** Lista opções cadastradas (para montar telas de liberação). */
  @Get()
  list() {
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, description: true },
    });
  }
}
