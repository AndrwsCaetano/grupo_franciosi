import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import {
  ALLOWED_RECEIPT_MIMES,
  receiptDiskStorage,
} from '../common/uploads.config';
import { CreateFuelingDto } from './dto/create-fueling.dto';
import { ListFuelingsDto } from './dto/list-fuelings.dto';
import { StatsFilterDto } from './dto/stats-filter.dto';
import { UpdateFuelingDto } from './dto/update-fueling.dto';
import { FuelingsService } from './fuelings.service';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8 MB

const receiptInterceptor = FileInterceptor('receipt', {
  storage: receiptDiskStorage,
  limits: { fileSize: MAX_RECEIPT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_RECEIPT_MIMES.has(file.mimetype)) {
      cb(
        new BadRequestException(
          'Formato inválido. Use JPG, PNG, WEBP ou HEIC.',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
});

type AuthedRequest = Request & {
  user?: { userId: string; email: string; name: string };
};

@Controller('fuelings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FuelingsController {
  constructor(private fuelings: FuelingsService) {}

  @Get()
  @RequirePermissions('fuelings.read')
  list(@Query() dto: ListFuelingsDto) {
    return this.fuelings.list(dto);
  }

  @Get('stats')
  @RequirePermissions('fuelings.read')
  stats(@Query() dto: StatsFilterDto) {
    return this.fuelings.getStats(dto);
  }

  @Get(':id')
  @RequirePermissions('fuelings.read')
  findOne(@Param('id') id: string) {
    return this.fuelings.findOne(id);
  }

  @Post()
  @RequirePermissions('fuelings.write')
  @UseInterceptors(receiptInterceptor)
  create(
    @Body() dto: CreateFuelingDto,
    @UploadedFile() receipt: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Sessão inválida');
    }
    return this.fuelings.create(dto, receipt, userId);
  }

  @Patch(':id')
  @RequirePermissions('fuelings.write')
  @UseInterceptors(receiptInterceptor)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFuelingDto,
    @UploadedFile() receipt: Express.Multer.File | undefined,
  ) {
    return this.fuelings.update(id, dto, receipt);
  }

  @Delete(':id')
  @RequirePermissions('fuelings.write')
  remove(@Param('id') id: string) {
    return this.fuelings.remove(id);
  }
}
