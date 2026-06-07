import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateSupersetDashboardDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug deve usar letras minúsculas, números e hífens',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** UUID gerado ao habilitar "Embed dashboard" na UI do Superset. */
  @IsString()
  @MinLength(8)
  embeddedUuid!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
