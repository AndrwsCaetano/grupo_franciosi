import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaModule } from '../prisma/prisma.module';
import { DriverAuthController } from './driver-auth.controller';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';
import { DriverJwtStrategy } from './driver-jwt.strategy';
import { DriverPortalController } from './driver-portal.controller';
import { DriverPortalService } from './driver-portal.service';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_DRIVER_SECRET') ??
          config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            config.get<string>('JWT_DRIVER_ACCESS_EXPIRES_IN') ??
            config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m',
        } as SignOptions,
      }),
    }),
  ],
  controllers: [DriverAuthController, DriverPortalController],
  providers: [
    DriverAuthService,
    DriverPortalService,
    DriverJwtStrategy,
    DriverJwtAuthGuard,
  ],
  exports: [DriverAuthService],
})
export class DriverModule {}
