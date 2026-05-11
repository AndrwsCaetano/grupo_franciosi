import { Global, Module } from '@nestjs/common';
import { PermissionsResolutionService } from './permissions-resolution.service';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  providers: [PermissionsResolutionService],
  exports: [PermissionsResolutionService],
  controllers: [PermissionsController],
})
export class PermissionsModule {}
