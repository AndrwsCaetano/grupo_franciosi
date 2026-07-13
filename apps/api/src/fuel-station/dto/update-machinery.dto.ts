import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { MachineryStatusDto } from './create-machinery.dto';

export class UpdateMachineryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  defaultProductId?: string | null;

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
  erpExternalId?: string | null;

  /// Enviar `true` para marcar como validado (fuel_station.validate).
  @IsOptional()
  @IsBoolean()
  validated?: boolean;
}
