import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class StatsFilterDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  driverId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  vehicleId?: string;
}
