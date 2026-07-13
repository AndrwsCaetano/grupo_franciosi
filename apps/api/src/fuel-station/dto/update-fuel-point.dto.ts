import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FuelPointTypeDto } from './create-fuel-point.dto';

export class UpdateFuelPointDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(FuelPointTypeDto)
  type?: FuelPointTypeDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  maxCapacityLiters?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /// Enviar `true` para marcar o ponto como validado (fuel_station.validate).
  @IsOptional()
  @IsBoolean()
  validated?: boolean;
}
