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

export enum FuelPointTypeDto {
  POSTO = 'POSTO',
  COMBOIO = 'COMBOIO',
}

export class CreateFuelPointDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEnum(FuelPointTypeDto)
  type!: FuelPointTypeDto;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  maxCapacityLiters!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
