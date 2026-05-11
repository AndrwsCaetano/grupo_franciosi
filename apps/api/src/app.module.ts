import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { DashboardsModule } from './dashboards/dashboards.module';
import { DataSourcesModule } from './data-sources/data-sources.module';
import { DriversModule } from './drivers/drivers.module';
import { FuelingsModule } from './fuelings/fuelings.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriverModule } from './driver/driver.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PermissionsModule,
    AuthModule,
    DriverModule,
    UsersModule,
    ProfilesModule,
    DataSourcesModule,
    DashboardsModule,
    VehiclesModule,
    DriversModule,
    FuelingsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
