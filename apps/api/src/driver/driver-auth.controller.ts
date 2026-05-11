import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { RefreshDto } from '../auth/dto/refresh.dto';
import { DriverAuthService } from './driver-auth.service';
import { DriverLoginDto } from './dto/driver-login.dto';

@Controller('driver-auth')
@Public()
@UseGuards(ThrottlerGuard)
export class DriverAuthController {
  constructor(private driverAuth: DriverAuthService) {}

  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: DriverLoginDto) {
    return this.driverAuth.login(dto.cpf, dto.birthDate);
  }

  @SkipThrottle()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.driverAuth.refresh(dto.refreshToken);
  }

  @SkipThrottle()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.driverAuth.logout(dto.refreshToken);
  }
}
