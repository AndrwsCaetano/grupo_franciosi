import { Module } from '@nestjs/common';
import { FuelingsController } from './fuelings.controller';
import { FuelingsService } from './fuelings.service';

@Module({
  controllers: [FuelingsController],
  providers: [FuelingsService],
})
export class FuelingsModule {}
