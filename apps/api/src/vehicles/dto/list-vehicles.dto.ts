import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListVehiclesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['plate', 'brand', 'model', 'fuelTankLiters', 'active', 'createdAt'])
  sort?:
    | 'plate'
    | 'brand'
    | 'model'
    | 'fuelTankLiters'
    | 'active'
    | 'createdAt' = 'plate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';

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
