import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsResolutionService } from '../permissions/permissions-resolution.service';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissions: PermissionsResolutionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException();
    }
    const ok = await this.permissions.userHasAll(userId, required);
    if (!ok) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}
