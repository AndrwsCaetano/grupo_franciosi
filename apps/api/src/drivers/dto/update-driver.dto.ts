import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(11)
  cpf?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  licenseIssueDate?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
