// src/biblioteca-legal/dto/get-documentos-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query params aceptados por GET /biblioteca-legal/documentos
 *
 * La paginación y el filtrado se aplican en memoria sobre el dataset
 * completo traído de la API externa.
 */
export class GetDocumentosQueryDto {
  @ApiPropertyOptional({
    description: 'Número de página (1-indexed).',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página (máximo 100).',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Búsqueda de texto libre sobre título y descripción del documento.',
    example: 'ordenanza',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por municipio (coincidencia exacta, sin distinción de mayúsculas).',
    example: 'Chacao',
  })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por estado/entidad federal (coincidencia exacta, sin distinción de mayúsculas).',
    example: 'Miranda',
  })
  @IsOptional()
  @IsString()
  estado?: string;
}
