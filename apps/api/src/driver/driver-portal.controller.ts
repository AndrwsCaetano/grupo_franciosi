import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  ALLOWED_RECEIPT_MIMES,
  receiptDiskStorage,
} from '../common/uploads.config';
import { Public } from '../auth/public.decorator';
import { DriverCreateFuelingDto } from './dto/driver-create-fueling.dto';
import { ListDriverFuelingsDto } from './dto/list-driver-fuelings.dto';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';
import { DriverPortalService } from './driver-portal.service';
import type { DriverAuthUser } from './driver-jwt.strategy';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

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

type DriverRequest = Request & { user: DriverAuthUser };

@Controller('driver')
@Public()
@UseGuards(DriverJwtAuthGuard)
export class DriverPortalController {
  constructor(private portal: DriverPortalService) {}

  @Get('me')
  me(@Req() req: DriverRequest) {
    return this.portal.me(req.user.driverId);
  }

  @Get('fuelings')
  listFuelings(
    @Req() req: DriverRequest,
    @Query() dto: ListDriverFuelingsDto,
  ) {
    return this.portal.listFuelings(req.user.driverId, dto);
  }

  @Post('fuelings')
  @UseInterceptors(receiptInterceptor)
  async createFueling(
    @Req() req: DriverRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: DriverCreateFuelingDto,
    @UploadedFile() receipt: Express.Multer.File | undefined,
  ) {
    const out = await this.portal.createFueling(
      req.user.driverId,
      dto,
      receipt,
    );
    res.status(
      out.alreadyExists ? HttpStatus.OK : HttpStatus.CREATED,
    );
    return out;
  }
}
