import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private vehicles: VehiclesService) {}

  @Get()
  @RequirePermissions('vehicles.read')
  list(@Query() dto: ListVehiclesDto) {
    return this.vehicles.list(dto);
  }

  @Get(':id')
  @RequirePermissions('vehicles.read')
  findOne(@Param('id') id: string) {
    return this.vehicles.findOne(id);
  }

  @Post()
  @RequirePermissions('vehicles.write')
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicles.write')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicles.write')
  remove(@Param('id') id: string) {
    return this.vehicles.remove(id);
  }
}
