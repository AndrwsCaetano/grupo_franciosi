import { Module } from '@nestjs/common';
import { SupersetClientService } from './superset-client.service';
import { SupersetController } from './superset.controller';
import { SupersetService } from './superset.service';

@Module({
  controllers: [SupersetController],
  providers: [SupersetService, SupersetClientService],
})
export class SupersetModule {}
