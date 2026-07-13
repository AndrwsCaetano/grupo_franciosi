import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDispensingDto {
  @IsString()
  machineryId!: string;

  @IsString()
  pointId!: string;

  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  liters!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999)
  hourMeterReported?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9_999_999)
  kmReported?: number;

  /// Identificador gerado pelo cliente offline para deduplicar reenvios.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  offlineClientId?: string;
}
