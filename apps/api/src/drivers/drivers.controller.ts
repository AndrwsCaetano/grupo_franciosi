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
import {
  AssignVehicleDto,
  FinishAssignmentDto,
} from './dto/assign-vehicle.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ListDriversDto } from './dto/list-drivers.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriversController {
  constructor(private drivers: DriversService) {}

  @Get()
  @RequirePermissions('drivers.read')
  list(@Query() dto: ListDriversDto) {
    return this.drivers.list(dto);
  }

  @Get(':id')
  @RequirePermissions('drivers.read')
  findOne(@Param('id') id: string) {
    return this.drivers.findOne(id);
  }

  @Post()
  @RequirePermissions('drivers.write')
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('drivers.write')
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('drivers.write')
  remove(@Param('id') id: string) {
    return this.drivers.remove(id);
  }

  // ----- Vínculos -----

  @Get(':id/assignments')
  @RequirePermissions('drivers.read')
  listAssignments(@Param('id') id: string) {
    return this.drivers.listAssignments(id);
  }

  @Post(':id/assignments')
  @RequirePermissions('drivers.assign_vehicle')
  assign(@Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.drivers.assignVehicle(id, dto);
  }

  @Patch(':id/assignments/:assignmentId/finish')
  @RequirePermissions('drivers.assign_vehicle')
  finish(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: FinishAssignmentDto,
  ) {
    return this.drivers.finishAssignment(id, assignmentId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermissions('drivers.assign_vehicle')
  removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.drivers.deleteAssignment(id, assignmentId);
  }
}
