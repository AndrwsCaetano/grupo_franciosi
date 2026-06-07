import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get()
  @RequirePermissions('reports.read')
  list(@CurrentUser() user: AuthUser) {
    return this.reports.list(user.userId);
  }

  @Post(':slug/run')
  @RequirePermissions('reports.read')
  run(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.reports.run(slug, user.userId);
  }
}
