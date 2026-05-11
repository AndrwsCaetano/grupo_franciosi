import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProfilePermissionItemDto {
  @IsString()
  permissionId!: string;

  @IsBoolean()
  granted!: boolean;
}

export class SetProfilePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfilePermissionItemDto)
  permissions!: ProfilePermissionItemDto[];
}
