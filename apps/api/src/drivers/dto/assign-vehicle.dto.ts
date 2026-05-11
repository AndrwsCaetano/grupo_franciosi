import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AssignVehicleDto {
  @IsString()
  @MinLength(1)
  vehicleId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinishAssignmentDto {
  @IsDateString()
  endDate!: string;
}
