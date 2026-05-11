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

export class TestConnectionDto {
  @IsEnum(DataSourceType)
  type!: DataSourceType;

  @IsString()
  @MinLength(1)
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  /** Database name / Oracle service name (ou usar extra.sid). */
  @IsOptional()
  @IsString()
  databaseName?: string;

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
}
