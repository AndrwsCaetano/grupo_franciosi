import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { BootstrapService } from './bootstrap.service';
import { DispensingsService } from './dispensings.service';
import { ErpIntegrationService } from './erp-integration.service';
import {
  ErpIntegrationController,
  FuelStationController,
} from './fuel-station.controller';
import { FuelPointsService } from './fuel-points.service';
import { FuelProductsService } from './fuel-products.service';
import { FuelStationService } from './fuel-station.service';
import { MachineryService } from './machinery.service';
import { StockService } from './stock.service';
import { TransfersService } from './transfers.service';

@Module({
  controllers: [FuelStationController, ErpIntegrationController],
  providers: [
    FuelStationService,
    BootstrapService,
    FuelProductsService,
    FuelPointsService,
    MachineryService,
    AccessService,
    DispensingsService,
    TransfersService,
    StockService,
    ErpIntegrationService,
  ],
})
export class FuelStationModule {}
