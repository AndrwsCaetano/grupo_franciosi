import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFuelingDto {
  @IsString()
  @MinLength(1)
  driverId!: string;

  @IsString()
  @MinLength(1)
  vehicleId!: string;

  @IsDateString()
  fuelDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  quantityLiters!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99999999)
  odometerKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
