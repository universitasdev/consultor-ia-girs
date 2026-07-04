// src/biblioteca-legal/dto/documentos-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { DocumentoLegalDto } from './documento-legal.dto';

/**
 * Respuesta paginada del endpoint GET /biblioteca-legal/documentos.
 *
 * Expone metadatos de paginación junto con los items de la página actual.
 */
export class DocumentosResponseDto {
  @ApiProperty({
    description: 'Documentos de la página actual.',
    type: [DocumentoLegalDto],
  })
  items: DocumentoLegalDto[];

  @ApiProperty({
    description: 'Total de documentos que coinciden con los filtros aplicados.',
    example: 85,
  })
  total: number;

  @ApiProperty({
    description: 'Página actual.',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Elementos por página solicitados.',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas disponibles (ceil(total / limit)).',
    example: 5,
  })
  totalPages: number;
}
