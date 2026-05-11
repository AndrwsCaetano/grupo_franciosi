import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfilePermissionDto } from './dto/profile-permission.dto';
import { SetProfilePermissionsDto } from './dto/set-profile-permissions.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(private profiles: ProfilesService) {}

  @Get()
  @RequirePermissions('profiles.read')
  findAll() {
    return this.profiles.findAll();
  }

  @Get(':id')
  @RequirePermissions('profiles.read')
  findOne(@Param('id') id: string) {
    return this.profiles.findOne(id);
  }

  @Post()
  @RequirePermissions('profiles.write')
  create(@Body() dto: CreateProfileDto) {
    return this.profiles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('profiles.write')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('profiles.write')
  remove(@Param('id') id: string) {
    return this.profiles.remove(id);
  }

  @Put(':id/permissions')
  @RequirePermissions('permissions.assign')
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetProfilePermissionsDto,
  ) {
    return this.profiles.setPermissions(id, dto);
  }

  @Post(':id/permissions')
  @RequirePermissions('permissions.assign')
  setPermission(
    @Param('id') id: string,
    @Body() dto: ProfilePermissionDto,
  ) {
    return this.profiles.setPermission(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('permissions.assign')
  removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.profiles.removePermission(id, permissionId);
  }
}
