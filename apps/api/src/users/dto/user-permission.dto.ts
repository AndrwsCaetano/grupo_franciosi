import { IsBoolean, IsString } from 'class-validator';

export class UserPermissionDto {
  @IsString()
  permissionId!: string;

  @IsBoolean()
  granted!: boolean;
}
