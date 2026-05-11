import { IsDateString, IsString, MinLength } from 'class-validator';

export class DriverLoginDto {
  @IsString()
  @MinLength(11)
  cpf!: string;

  /** Data de nascimento (YYYY-MM-DD). */
  @IsDateString()
  birthDate!: string;
}
