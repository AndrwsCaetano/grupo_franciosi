import { DataSourceType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateDataSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(DataSourceType)
  type?: DataSourceType;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  databaseName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  ssl?: boolean;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
