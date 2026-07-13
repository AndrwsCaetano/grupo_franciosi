import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum MachineryStatusDto {
  ATIVO = 'ATIVO',
  MANUTENCAO = 'MANUTENCAO',
  INATIVO = 'INATIVO',
}

export class CreateMachineryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  tag!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @IsOptional()
  @IsString()
  defaultProductId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999)
  hourMeter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9_999_999)
  odometerKm?: number;

  @IsOptional()
  @IsEnum(MachineryStatusDto)
  status?: MachineryStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  erpExternalId?: string;
}
