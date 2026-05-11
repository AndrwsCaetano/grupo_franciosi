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

export class CreateDataSourceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(DataSourceType)
  type!: DataSourceType;

  @IsString()
  @MinLength(1)
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @MinLength(1)
  databaseName!: string;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

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
