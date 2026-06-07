import {
  Body,
  Controller,
  Delete,
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
import { AssignSupersetDashboardDto } from './dto/assign-superset-dashboard.dto';
import { CreateSupersetDashboardDto } from './dto/create-superset-dashboard.dto';
import { UpdateSupersetDashboardDto } from './dto/update-superset-dashboard.dto';
import { SupersetService } from './superset.service';

@Controller('superset')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupersetController {
  constructor(private readonly superset: SupersetService) {}

  /** Dashboards liberados para o usuário logado (qualquer usuário autenticado). */
  @Get('dashboards/me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.superset.listAssignedForUser(user.userId);
  }

  /** Guest token de curta duração para embutir um dashboard liberado. */
  @Post('dashboards/:slug/guest-token')
  guestToken(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.superset.getGuestTokenForUser(user, slug);
  }

  @Get('dashboards')
  @RequirePermissions('superset.read')
  findAll() {
    return this.superset.findAll();
  }

  @Get('dashboards/:id')
  @RequirePermissions('superset.read')
  findOne(@Param('id') id: string) {
    return this.superset.findOne(id);
  }

  @Post('dashboards')
  @RequirePermissions('superset.write')
  create(@Body() dto: CreateSupersetDashboardDto) {
    return this.superset.create(dto);
  }

  @Patch('dashboards/:id')
  @RequirePermissions('superset.write')
  update(@Param('id') id: string, @Body() dto: UpdateSupersetDashboardDto) {
    return this.superset.update(id, dto);
  }

  @Delete('dashboards/:id')
  @RequirePermissions('superset.write')
  remove(@Param('id') id: string) {
    return this.superset.remove(id);
  }

  @Post('dashboards/:id/assign')
  @RequirePermissions('superset.assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignSupersetDashboardDto,
  ) {
    return this.superset.setAssignments(id, dto.userIds);
  }
}
