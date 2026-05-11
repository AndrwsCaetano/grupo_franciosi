import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UserPermissionItemDto {
  @IsString()
  permissionId!: string;

  @IsBoolean()
  granted!: boolean;
}

export class SetUserPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionItemDto)
  permissions!: UserPermissionItemDto[];
}
