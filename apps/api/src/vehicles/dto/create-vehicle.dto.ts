import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(7)
  plate!: string;

  @IsString()
  @MinLength(1)
  brand!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsInt()
  @Min(0)
  @Max(9999)
  fuelTankLiters!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
