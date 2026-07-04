// src/biblioteca-legal/dto/paginated-documentos.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { DocumentoLegalDto } from './documento-legal.dto';

/**
 * Forma de la respuesta paginada que devuelve la API externa
 * (POST-migración server-side pagination).
 *
 * Breaking change: la respuesta ya no es un arreglo directo,
 * sino un objeto que envuelve los resultados en `items`.
 */
export class PaginatedDocumentosDto {
  @ApiProperty({
    description: 'Arreglo con los documentos de la página actual.',
    type: [DocumentoLegalDto],
  })
  items: DocumentoLegalDto[];

  @ApiProperty({
    description: 'Total absoluto de documentos en la base de datos.',
    example: 1250,
  })
  total: number;

  @ApiProperty({
    description: 'Número de página actual.',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Cantidad de elementos solicitados por página.',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas disponibles (total / limit).',
    example: 25,
  })
  totalPages: number;
}
