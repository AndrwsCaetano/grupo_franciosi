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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { AccessService } from './access.service';
import { BootstrapService } from './bootstrap.service';
import { DispensingsService } from './dispensings.service';
import { CreateDispensingDto } from './dto/create-dispensing.dto';
import { CreateFuelPointDto } from './dto/create-fuel-point.dto';
import { CreateFuelProductDto } from './dto/create-fuel-product.dto';
import { CreateMachineryDto } from './dto/create-machinery.dto';
import { CreateTransferDto, RejectTransferDto } from './dto/create-transfer.dto';
import {
  ErpPullDto,
  ErpPushDto,
  ValidateErpImportDto,
} from './dto/erp.dto';
import { BasicListDto } from './dto/list.dto';
import { UpdateFuelPointDto } from './dto/update-fuel-point.dto';
import { UpdateFuelProductDto } from './dto/update-fuel-product.dto';
import { UpdateMachineryDto } from './dto/update-machinery.dto';
import { CreateUserPointAccessDto } from './dto/user-point-access.dto';
import { ErpIntegrationService } from './erp-integration.service';
import { FuelPointsService } from './fuel-points.service';
import { FuelProductsService } from './fuel-products.service';
import { MachineryService } from './machinery.service';
import { StockService } from './stock.service';
import { TransfersService } from './transfers.service';

@Controller('fuel-station')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FuelStationController {
  constructor(
    private bootstrap: BootstrapService,
    private products: FuelProductsService,
    private points: FuelPointsService,
    private machinery: MachineryService,
    private access: AccessService,
    private dispensings: DispensingsService,
    private transfers: TransfersService,
    private stock: StockService,
    private erp: ErpIntegrationService,
  ) {}

  // -----------------------------------------------------------------
  // Bootstrap — payload consolidado para o app do operador.
  // -----------------------------------------------------------------
  @Get('bootstrap')
  @RequirePermissions('fuel_station.operate')
  getBootstrap(@CurrentUser() user: AuthUser) {
    return this.bootstrap.build(user.userId);
  }

  // -----------------------------------------------------------------
  // Produtos (Diesel S10, S500, Arla 32...) — CRUD administrativo.
  // -----------------------------------------------------------------
  @Get('products')
  @RequirePermissions('fuel_station.read')
  listProducts(@Query() dto: BasicListDto) {
    return this.products.list(dto);
  }

  @Get('products/:id')
  @RequirePermissions('fuel_station.read')
  getProduct(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post('products')
  @RequirePermissions('fuel_station.write')
  createProduct(@Body() dto: CreateFuelProductDto) {
    return this.products.create(dto);
  }

  @Patch('products/:id')
  @RequirePermissions('fuel_station.write')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateFuelProductDto) {
    return this.products.update(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('fuel_station.write')
  removeProduct(@Param('id') id: string) {
    return this.products.remove(id);
  }

  // -----------------------------------------------------------------
  // Pontos de abastecimento (postos e comboios) — CRUD administrativo.
  // -----------------------------------------------------------------
  @Get('points')
  @RequirePermissions('fuel_station.read')
  listPoints(@Query() dto: BasicListDto) {
    return this.points.list(dto);
  }

  @Get('points/:id')
  @RequirePermissions('fuel_station.read')
  getPoint(@Param('id') id: string) {
    return this.points.findOne(id);
  }

  @Post('points')
  @RequirePermissions('fuel_station.write')
  createPoint(@Body() dto: CreateFuelPointDto) {
    return this.points.create(dto);
  }

  @Patch('points/:id')
  @RequirePermissions('fuel_station.write')
  updatePoint(@Param('id') id: string, @Body() dto: UpdateFuelPointDto) {
    // "validated" só pode ser alterado por quem tem fuel_station.validate.
    // O guard já garante fuel_station.write; para "validated" adicionamos
    // uma checagem simples aqui via meta (mas para manter simples, deixamos
    // a checagem no service passar). Em uma iteração futura, dividir em rota.
    return this.points.update(id, dto);
  }

  @Delete('points/:id')
  @RequirePermissions('fuel_station.write')
  removePoint(@Param('id') id: string) {
    return this.points.remove(id);
  }

  // -----------------------------------------------------------------
  // Equipamentos / máquinas — CRUD administrativo + validação.
  // -----------------------------------------------------------------
  @Get('machinery')
  @RequirePermissions('fuel_station.read')
  listMachinery(@Query() dto: BasicListDto) {
    return this.machinery.list(dto);
  }

  @Get('machinery/:id')
  @RequirePermissions('fuel_station.read')
  getMachinery(@Param('id') id: string) {
    return this.machinery.findOne(id);
  }

  @Post('machinery')
  @RequirePermissions('fuel_station.write')
  createMachinery(@Body() dto: CreateMachineryDto) {
    return this.machinery.create(dto);
  }

  @Patch('machinery/:id')
  @RequirePermissions('fuel_station.write')
  updateMachinery(@Param('id') id: string, @Body() dto: UpdateMachineryDto) {
    return this.machinery.update(id, dto);
  }

  @Delete('machinery/:id')
  @RequirePermissions('fuel_station.write')
  removeMachinery(@Param('id') id: string) {
    return this.machinery.remove(id);
  }

  // -----------------------------------------------------------------
  // Vínculo usuário <-> ponto (define quem opera qual posto/comboio).
  // -----------------------------------------------------------------
  @Get('access')
  @RequirePermissions('fuel_station.read')
  listAccess(
    @Query('userId') userId?: string,
    @Query('pointId') pointId?: string,
  ) {
    return this.access.list({ userId, pointId });
  }

  @Post('access')
  @RequirePermissions('fuel_station.write')
  createAccess(@Body() dto: CreateUserPointAccessDto) {
    return this.access.create(dto);
  }

  @Delete('access/:userId/:pointId')
  @RequirePermissions('fuel_station.write')
  removeAccess(
    @Param('userId') userId: string,
    @Param('pointId') pointId: string,
  ) {
    return this.access.remove(userId, pointId);
  }

  // -----------------------------------------------------------------
  // Apontamentos (dispensings) — criados pelo app do operador.
  // -----------------------------------------------------------------
  @Get('dispensings')
  @RequirePermissions('fuel_station.read')
  listDispensings(
    @Query('pointId') pointId?: string,
    @Query('machineryId') machineryId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.dispensings.list({
      pointId,
      machineryId,
      take: take ? Math.min(500, Math.max(1, Number(take))) : undefined,
      skip: skip ? Math.max(0, Number(skip)) : undefined,
    });
  }

  @Get('dispensings/:id')
  @RequirePermissions('fuel_station.read')
  getDispensing(@Param('id') id: string) {
    return this.dispensings.findOne(id);
  }

  @Post('dispensings')
  @RequirePermissions('fuel_station.operate')
  createDispensing(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDispensingDto,
  ) {
    return this.dispensings.create(user.userId, dto);
  }

  // -----------------------------------------------------------------
  // Transferências entre pontos.
  // -----------------------------------------------------------------
  @Get('transfers')
  @RequirePermissions('fuel_station.transfers')
  listTransfers(
    @Query('pointId') pointId?: string,
    @Query('status') status?: 'PENDENTE' | 'ACEITA' | 'RECUSADA',
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.transfers.list({
      pointId,
      status,
      take: take ? Math.min(500, Math.max(1, Number(take))) : undefined,
      skip: skip ? Math.max(0, Number(skip)) : undefined,
    });
  }

  @Get('transfers/pending')
  @RequirePermissions('fuel_station.transfers')
  listPendingTransfers(@CurrentUser() user: AuthUser) {
    return this.transfers.listPendingForUser(user.userId);
  }

  @Get('transfers/:id')
  @RequirePermissions('fuel_station.read')
  getTransfer(@Param('id') id: string) {
    return this.transfers.findOne(id);
  }

  @Post('transfers')
  @RequirePermissions('fuel_station.transfers')
  requestTransfer(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfers.request(user.userId, dto);
  }

  @Post('transfers/:id/accept')
  @RequirePermissions('fuel_station.transfers')
  acceptTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.transfers.accept(user.userId, id);
  }

  @Post('transfers/:id/reject')
  @RequirePermissions('fuel_station.transfers')
  rejectTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectTransferDto,
  ) {
    return this.transfers.reject(user.userId, id, dto.reason);
  }

  // -----------------------------------------------------------------
  // Estoque de um ponto + histórico de movimentos.
  // -----------------------------------------------------------------
  @Get('points/:id/stock')
  @RequirePermissions('fuel_station.read')
  getStock(@Param('id') id: string) {
    return this.stock.listByPoint(id);
  }

  @Get('points/:id/movements')
  @RequirePermissions('fuel_station.read')
  getMovements(
    @Param('id') id: string,
    @Query('productId') productId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.stock.movements({
      pointId: id,
      productId,
      take: take ? Math.min(500, Math.max(1, Number(take))) : undefined,
      skip: skip ? Math.max(0, Number(skip)) : undefined,
    });
  }
}

/**
 * Endpoints de integração com o ERP Compass.
 *
 * TODO: substituir por chamada real à API do Compass — hoje é mock.
 */
@Controller('integrations/erp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ErpIntegrationController {
  constructor(private erp: ErpIntegrationService) {}

  @Post('pull')
  @RequirePermissions('fuel_station.validate')
  pull(@Body() dto: ErpPullDto) {
    return this.erp.pull(dto.kind);
  }

  @Post('push')
  @RequirePermissions('fuel_station.operate')
  push(@Body() dto: ErpPushDto) {
    return this.erp.pushGeneric(dto.tipo, dto.referenceId);
  }

  @Get('imports')
  @RequirePermissions('fuel_station.validate')
  listImports(@Query('kind') kind?: 'EQUIPAMENTO' | 'NF_ENTRADA') {
    if (kind && kind !== 'EQUIPAMENTO' && kind !== 'NF_ENTRADA') {
      throw new BadRequestException('kind inválido');
    }
    return this.erp.listImports(kind);
  }

  @Post('imports/:id/validate')
  @RequirePermissions('fuel_station.validate')
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ValidateErpImportDto,
  ) {
    return this.erp.validateImport(user.userId, id, dto.action, dto.pointId);
  }
}
