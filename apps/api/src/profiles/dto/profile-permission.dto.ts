import { IsBoolean, IsString } from 'class-validator';

export class ProfilePermissionDto {
  @IsString()
  permissionId!: string;

  @IsBoolean()
  granted!: boolean;
}
