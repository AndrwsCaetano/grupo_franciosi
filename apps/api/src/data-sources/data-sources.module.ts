import { Module } from '@nestjs/common';
import { ConnectionTesterService } from './connection-tester.service';
import { DataSourcesController } from './data-sources.controller';
import { DataSourcesService } from './data-sources.service';

@Module({
  controllers: [DataSourcesController],
  providers: [DataSourcesService, ConnectionTesterService],
  exports: [DataSourcesService, ConnectionTesterService],
})
export class DataSourcesModule {}
