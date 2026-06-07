import { Module } from '@nestjs/common';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DataSourcesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
