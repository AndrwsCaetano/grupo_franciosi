import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  type DriverJwtPayload,
  isDriverJwtPayload,
} from './driver-jwt-payload';

export type DriverAuthUser = {
  driverId: string;
  name: string;
  cpf: string;
};

@Injectable()
export class DriverJwtStrategy extends PassportStrategy(Strategy, 'driver-jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_DRIVER_SECRET') ??
        config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: unknown): Promise<DriverAuthUser> {
    const raw = payload as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object' || !isDriverJwtPayload(raw)) {
      throw new UnauthorizedException();
    }
    const p = raw as DriverJwtPayload;
    const driver = await this.prisma.driver.findUnique({
      where: { id: p.sub },
    });
    if (!driver?.active) {
      throw new UnauthorizedException();
    }
    return { driverId: driver.id, name: driver.name, cpf: driver.cpf };
  }
}
