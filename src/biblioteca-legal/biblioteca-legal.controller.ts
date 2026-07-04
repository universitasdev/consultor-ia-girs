// src/biblioteca-legal/biblioteca-legal.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { BibliotecaLegalService } from './biblioteca-legal.service';
import { GetDocumentosQueryDto } from './dto/get-documentos-query.dto';
import { DocumentosResponseDto } from './dto/documentos-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Biblioteca Legal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('biblioteca-legal')
export class BibliotecaLegalController {
  constructor(
    private readonly bibliotecaLegalService: BibliotecaLegalService,
  ) {}

  /**
   * GET /biblioteca-legal/documentos
   *
   * Devuelve los documentos de la Biblioteca Legal con soporte de
   * paginación y filtrado. Los parámetros son opcionales — si no se
   * envían, retorna la primera página de 20 elementos sin filtros.
   */
  @Get('documentos')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar documentos de la Biblioteca Legal de Urbanismo',
    description:
      'Retorna los documentos de Derecho Urbanístico registrados en la Biblioteca Legal ' +
      'con soporte de paginación y filtros opcionales.\n\n' +
      '**Filtros disponibles:**\n' +
      '- `search`: búsqueda de texto libre en título y descripción.\n' +
      '- `municipio`: filtrar por municipio (ej: `Chacao`).\n' +
      '- `estado`: filtrar por entidad federal (ej: `Miranda`).\n\n' +
      '**Paginación:**\n' +
      '- `page`: número de página (default `1`).\n' +
      '- `limit`: elementos por página, máximo 100 (default `20`).\n\n' +
      'Cada elemento retornado incluye: `id`, `titulo`, `descripcion`, `gcpFileName`, ' +
      '`fechaPublicacion`, `numeroGaceta`, `municipio` y `estado`.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Respuesta paginada con los documentos que coinciden con los filtros.',
    type: DocumentosResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado — token JWT ausente o inválido.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos — el rol del usuario no tiene acceso a este recurso.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno al consultar la fuente de datos de la Biblioteca Legal.',
  })
  getDocumentos(
    @Query() query: GetDocumentosQueryDto,
  ): Promise<DocumentosResponseDto> {
    return this.bibliotecaLegalService.getDocumentosFiltrados(query);
  }

  /**
   * GET /biblioteca-legal/documentos/preview/:id
   *
   * Recibe el ID del documento, lo resuelve internamente a su gcpFileName
   * y genera una Signed URL de GCP Storage válida por 15 minutos.
   * El frontend solo necesita conocer el ID — no necesita saber la ruta del archivo.
   */
  @Get('documentos/preview/:id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Obtener Signed URL de previsualización usando el ID del documento',
    description:
      'El frontend envía solo el ID del documento. El backend busca automáticamente ' +
      'el gcpFileName correspondiente en la API externa y genera una URL firmada de GCP ' +
      'válida por 15 minutos para previsualizar o descargar el PDF de forma segura. ' +
      'No es necesario conocer la ruta interna del archivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generada exitosamente.',
    schema: {
      example: {
        signedUrl:
          'https://storage.googleapis.com/biblioteca-legal/tema-principal/archivo.pdf?X-Goog-Signature=...',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un documento con ese ID en la biblioteca legal.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error al generar la URL firmada (archivo no encontrado en GCP o error de credenciales).',
  })
  getPreviewUrl(@Param('id') id: string): Promise<{ signedUrl: string }> {
    return this.bibliotecaLegalService.getSignedUrlById(id);
  }
}
