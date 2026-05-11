import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { DashboardsService } from './dashboards.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardsController {
  constructor(private dashboards: DashboardsService) {}

  @Get()
  @RequirePermissions('dashboards.read')
  findAll() {
    return this.dashboards.findAll();
  }

  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.dashboards.listAssignedForUser(user.userId);
  }

  @Get(':id')
  @RequirePermissions('dashboards.read')
  findOne(@Param('id') id: string) {
    return this.dashboards.findOne(id);
  }

  @Post()
  @RequirePermissions('dashboards.write')
  create(@Body() dto: CreateDashboardDto) {
    return this.dashboards.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('dashboards.write')
  update(@Param('id') id: string, @Body() dto: UpdateDashboardDto) {
    return this.dashboards.update(id, dto);
  }

  @Post(':slug/run')
  run(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ) {
    return this.dashboards.runDashboardForUser(user.userId, slug);
  }
}
