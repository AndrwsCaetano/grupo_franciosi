import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListDriversDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['name', 'cpf', 'licenseNumber', 'licenseExpiryDate', 'createdAt'])
  sort?:
    | 'name'
    | 'cpf'
    | 'licenseNumber'
    | 'licenseExpiryDate'
    | 'createdAt' = 'name';

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
