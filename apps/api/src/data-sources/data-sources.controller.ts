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
import { DataSourcesService } from './data-sources.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { UpdateDataSourceDto } from './dto/update-data-source.dto';

@Controller('data-sources')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DataSourcesController {
  constructor(private service: DataSourcesService) {}

  @Get()
  @RequirePermissions('datasources.read')
  findAll() {
    return this.service.findAll();
  }

  @Post('test')
  @RequirePermissions('datasources.write')
  testNew(@Body() dto: TestConnectionDto) {
    return this.service.testFromInput(dto);
  }

  @Get(':id')
  @RequirePermissions('datasources.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/test')
  @RequirePermissions('datasources.write')
  testExisting(@Param('id') id: string) {
    return this.service.testById(id);
  }

  @Post()
  @RequirePermissions('datasources.write')
  create(@Body() dto: CreateDataSourceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('datasources.write')
  update(@Param('id') id: string, @Body() dto: UpdateDataSourceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('datasources.write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
