import { IsString } from 'class-validator';

export class CreateUserPointAccessDto {
  @IsString()
  userId!: string;

  @IsString()
  pointId!: string;
}
