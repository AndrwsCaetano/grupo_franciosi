import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListFuelingsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn([
    'fuelDate',
    'createdAt',
    'driver',
    'vehicle',
    'quantityLiters',
    'odometerKm',
  ])
  sort?:
    | 'fuelDate'
    | 'createdAt'
    | 'driver'
    | 'vehicle'
    | 'quantityLiters'
    | 'odometerKm' = 'fuelDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
