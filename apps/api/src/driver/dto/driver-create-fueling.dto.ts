import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

function num(v: unknown): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export class DriverCreateFuelingDto {
  @Transform(({ value }) => num(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  quantityLiters!: number;

  @Transform(({ value }) => num(value))
  @IsInt()
  @Min(0)
  @Max(99999999)
  odometerKm!: number;

  /** Data do abastecimento (YYYY-MM-DD). Se omitida, usa o dia civil de `lancadoEm`. */
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : String(value),
  )
  @IsOptional()
  @IsDateString()
  fuelDate?: string;

  /** Instantâneo do lançamento no aparelho (ISO 8601). Opcional: default agora. */
  @IsOptional()
  @IsISO8601()
  lancadoEm?: string;

  @IsOptional()
  @IsUUID()
  offlineClientId?: string;
}
