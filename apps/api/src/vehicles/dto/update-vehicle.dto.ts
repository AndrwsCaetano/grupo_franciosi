import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(7)
  plate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  brand?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  fuelTankLiters?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
