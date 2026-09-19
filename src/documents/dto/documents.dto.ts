import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EstadoDocumento, LegibilidadPdf, MacroTipoDocumento } from '@prisma/client';

export class UploadDocumentMetadataDto {
  @ApiProperty({ enum: MacroTipoDocumento })
  @IsEnum(MacroTipoDocumento)
  macroTipo: MacroTipoDocumento;

  @ApiProperty({ example: 'Ley Orgánica de ...' })
  @IsString()
  @MinLength(3)
  tituloIntegro: string;

  @ApiProperty({ example: 'LO...' })
  @IsString()
  @MinLength(2)
  tituloBreve: string;

  @ApiProperty({
    description: 'Parámetros específicos según macro tipo',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  parametrosEspecificos: Record<string, unknown>;

  @ApiProperty({ example: 'Asamblea Nacional' })
  @IsString()
  @IsNotEmpty()
  enteEmisor: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  fechaPublicacion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorias?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs de etiquetas existentes',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  etiquetaIds?: string[];

  @ApiProperty({ minLength: 20 })
  @IsString()
  @MinLength(20)
  resumenDescriptivo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumenCorto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  palabrasClave?: string;

  @ApiPropertyOptional({ enum: LegibilidadPdf })
  @IsOptional()
  @IsEnum(LegibilidadPdf)
  legibilidadPdf?: LegibilidadPdf;

  @ApiPropertyOptional({
    description: 'Si true, marca el PDF como no legible (SOLO_IMAGEN)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  noLegible?: boolean;
}

export class RejectDocumentDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  motivoRechazo: string;
}

export class UpdateVisibilityDto {
  @ApiProperty({ description: 'Visible en biblioteca de usuarios finales' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  visibleEnBiblioteca: boolean;
}

export class GetDocumentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Búsqueda por título, ente o resumen' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: MacroTipoDocumento })
  @IsOptional()
  @IsEnum(MacroTipoDocumento)
  macroTipo?: MacroTipoDocumento;

  @ApiPropertyOptional({ description: 'Filtrar por ID de etiqueta' })
  @IsOptional()
  @IsUUID()
  etiquetaId?: string;

  @ApiPropertyOptional({ enum: EstadoDocumento })
  @IsOptional()
  @IsEnum(EstadoDocumento)
  estado?: EstadoDocumento;

  @ApiPropertyOptional({
    description:
      'Staff: filtrar publicados por visibilidad en biblioteca (true|false)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  visible?: boolean;
}

/** @deprecated alias — usar GetDocumentsQueryDto */
export class GetMineDocumentsQueryDto extends GetDocumentsQueryDto {}
