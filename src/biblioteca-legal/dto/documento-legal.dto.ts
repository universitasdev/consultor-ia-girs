// src/biblioteca-legal/dto/documento-legal.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mapea la forma de un documento devuelto por la API externa
 * de la biblioteca legal de urbanismo.
 */
export class DocumentoLegalDto {
  @ApiProperty({
    description: 'ID único del documento',
    example: 'uuid-o-id-unico-del-documento',
  })
  id: string;

  @ApiProperty({
    description: 'Título del documento',
    example: 'Plan de Desarrollo Urbano 2024',
  })
  titulo: string | null;

  @ApiPropertyOptional({
    description: 'Descripción del documento',
    example:
      'Documento que establece los lineamientos principales para el desarrollo urbanístico de la ciudad.',
    nullable: true,
  })
  descripcion: string | null;

  @ApiProperty({
    description:
      'Ruta del archivo en GCP Storage (sin bucket ni dominio). Ej: carpeta/subcarpeta/archivo.pdf',
    example:
      'tema-principal/derecho-urbanistico/legislacion/ley-ordinaria/plan-2024.pdf',
  })
  gcpFileName: string;

  @ApiPropertyOptional({
    description: 'Fecha de publicación del documento',
    example: '2024-05-12T10:00:00Z',
    nullable: true,
  })
  fechaPublicacion: string | null;

  @ApiPropertyOptional({
    description: 'Número de Gaceta Oficial donde fue publicado el documento',
    example: 'G.O. 42.123',
    nullable: true,
  })
  numeroGaceta: string | null;

  @ApiPropertyOptional({
    description: 'Municipio al que pertenece o aplica el documento',
    example: 'Chacao',
    nullable: true,
  })
  municipio: string | null;

  @ApiPropertyOptional({
    description:
      'Estado (entidad federal) al que pertenece o aplica el documento',
    example: 'Miranda',
    nullable: true,
  })
  estado: string | null;

  @ApiPropertyOptional({
    description: 'Título íntegro del documento',
    nullable: true,
  })
  tituloIntegro?: string | null;

  @ApiPropertyOptional({ description: 'Resumen del documento', nullable: true })
  resumen?: string | null;

  @ApiPropertyOptional({ description: 'URL original en GCP', nullable: true })
  archivoOriginalUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Estado legal de la norma',
    nullable: true,
  })
  estadoLegal?: string | null;

  @ApiPropertyOptional({ description: 'Tipo de norma', nullable: true })
  tipoNorma?: string | null;

  @ApiPropertyOptional({ description: 'Ente emisor', nullable: true })
  enteEmisor?: string | null;

  @ApiPropertyOptional({ description: 'País', nullable: true })
  pais?: string | null;

  @ApiPropertyOptional({ description: 'ID del curador', nullable: true })
  curadorId?: string | null;

  @ApiPropertyOptional({ description: 'Datos del curador', nullable: true })
  curador?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Categorías del documento',
    nullable: true,
    type: [Object],
  })
  categorias?: unknown[] | null;

  @ApiPropertyOptional({
    description: 'Etiquetas',
    nullable: true,
    type: [Object],
  })
  etiquetas?: unknown[] | null;

  @ApiPropertyOptional({
    description: 'Notas internas',
    nullable: true,
    type: [Object],
  })
  notasInternas?: unknown[] | null;

  @ApiPropertyOptional({ description: 'Metadatos adicionales', nullable: true })
  metadatos?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Conteos de relaciones', nullable: true })
  _count?: Record<string, unknown> | null;
}
