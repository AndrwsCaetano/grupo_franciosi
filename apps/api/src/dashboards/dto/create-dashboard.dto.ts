import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateDashboardDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug deve usar letras minúsculas, números e hífens',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  definition!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  dataSourceId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
