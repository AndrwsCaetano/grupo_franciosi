import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { AssignDashboardsDto } from './dto/assign-dashboards.dto';
import { AssignProfilesDto } from './dto/assign-profiles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPermissionDto } from './dto/user-permission.dto';
import { UsersService } from './users.service';

type AuthedRequest = Request & {
  user?: { userId: string; email: string; name: string };
};

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @RequirePermissions('users.write')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users.write')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      throw new BadRequestException('Sessão inválida');
    }
    return this.users.remove(id, currentUserId);
  }

  @Post(':id/profiles')
  @RequirePermissions('users.write')
  setProfiles(@Param('id') id: string, @Body() dto: AssignProfilesDto) {
    return this.users.setProfiles(id, dto);
  }

  @Put(':id/permissions')
  @RequirePermissions('permissions.assign')
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    return this.users.setPermissions(id, dto);
  }

  @Post(':id/permissions')
  @RequirePermissions('permissions.assign')
  setPermission(
    @Param('id') id: string,
    @Body() dto: UserPermissionDto,
  ) {
    return this.users.setPermissionOverride(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('permissions.assign')
  removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.users.removePermissionOverride(id, permissionId);
  }

  @Post(':id/dashboards')
  @RequirePermissions('dashboards.assign')
  setDashboards(@Param('id') id: string, @Body() dto: AssignDashboardsDto) {
    return this.users.setDashboards(id, dto);
  }
}
