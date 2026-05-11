import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDriverDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @MinLength(11)
  cpf!: string;

  @IsString()
  @MinLength(1)
  licenseNumber!: string;

  @IsDateString()
  licenseIssueDate!: string;

  @IsDateString()
  licenseExpiryDate!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
