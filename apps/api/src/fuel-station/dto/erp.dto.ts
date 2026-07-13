import { IsIn, IsOptional, IsString } from 'class-validator';

export class ErpPullDto {
  /// Filtro opcional de tipo (EQUIPAMENTO ou NF_ENTRADA). Sem filtro, retorna mock de ambos.
  @IsOptional()
  @IsIn(['EQUIPAMENTO', 'NF_ENTRADA'])
  kind?: 'EQUIPAMENTO' | 'NF_ENTRADA';
}

export class ErpPushDto {
  /// APONTAMENTO ou TRANSFERENCIA
  @IsIn(['APONTAMENTO', 'TRANSFERENCIA'])
  tipo!: 'APONTAMENTO' | 'TRANSFERENCIA';

  @IsString()
  referenceId!: string;
}

export class ValidateErpImportDto {
  @IsIn(['APROVAR', 'REJEITAR'])
  action!: 'APROVAR' | 'REJEITAR';

  /// Para NF_ENTRADA aprovada: opcional, override do pointId onde creditar o estoque.
  @IsOptional()
  @IsString()
  pointId?: string;
}
