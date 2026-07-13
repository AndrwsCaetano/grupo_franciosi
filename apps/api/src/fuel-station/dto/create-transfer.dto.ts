import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsString()
  originPointId!: string;

  @IsString()
  destPointId!: string;

  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  liters!: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  observation?: string;
}

export class RejectTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(400)
  reason?: string;
}
