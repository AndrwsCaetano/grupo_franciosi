import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateFuelingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  driverId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  fuelDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  quantityLiters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99999999)
  odometerKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /// Quando enviado como "true" (form-data), apaga a imagem atual.
  @IsOptional()
  @IsBooleanString()
  removeReceipt?: string;
}
