import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { BootstrapDto } from './dto/bootstrap.dto';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  /** Só funciona quando não existe nenhum usuário (primeiro acesso). */
  @Public()
  @Post('bootstrap')
  bootstrap(@Body() body: BootstrapDto) {
    return this.auth.registerBootstrap(body.email, body.password, body.name);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
