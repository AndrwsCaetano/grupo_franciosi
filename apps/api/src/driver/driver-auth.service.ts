import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { digitsOnly, isValidCpf } from '../common/cpf.util';
import { PrismaService } from '../prisma/prisma.service';
import type { DriverJwtPayload } from './driver-jwt-payload';

function birthDatesEqual(inputIso: string, stored: Date): boolean {
  const d = new Date(inputIso);
  if (Number.isNaN(d.getTime())) {
    return false;
  }
  const p = (x: Date) => ({
    y: x.getUTCFullYear(),
    m: x.getUTCMonth(),
    day: x.getUTCDate(),
  });
  const a = p(d);
  const b = p(stored);
  return a.y === b.y && a.m === b.m && a.day === b.day;
}

@Injectable()
export class DriverAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private hashRefresh(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async login(cpfRaw: string, birthDate: string) {
    const cpf = digitsOnly(cpfRaw);
    if (!isValidCpf(cpf)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const driver = await this.prisma.driver.findUnique({
      where: { cpf },
    });
    if (!driver?.active || !birthDatesEqual(birthDate, driver.birthDate)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueTokens(driver.id);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashRefresh(rawToken);
    const row = await this.prisma.driverRefreshToken.findUnique({
      where: { tokenHash },
      include: { driver: true },
    });
    if (!row || row.expiresAt < new Date() || !row.driver.active) {
      throw new UnauthorizedException('Sessão inválida');
    }
    await this.prisma.driverRefreshToken.delete({ where: { id: row.id } });
    return this.issueTokens(row.driverId);
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashRefresh(rawToken);
    await this.prisma.driverRefreshToken.deleteMany({ where: { tokenHash } });
    return { ok: true };
  }

  private async issueTokens(driverId: string) {
    const accessExpires =
      this.config.get<string>('JWT_DRIVER_ACCESS_EXPIRES_IN') ??
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      '15m';
    const refreshDays = Number(
      this.config.get<string>('JWT_DRIVER_REFRESH_EXPIRES_DAYS') ??
        this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ??
        '60',
    );

    const payload: DriverJwtPayload = { sub: driverId, typ: 'driver' };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: accessExpires,
    } as SignOptions);

    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashRefresh(rawRefresh);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.driverRefreshToken.create({
      data: { driverId, tokenHash, expiresAt },
    });

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, cpf: true },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: accessExpires,
      refreshExpiresAt: expiresAt.toISOString(),
      driver: driver ?? { id: driverId, name: '', cpf: '' },
    };
  }
}
