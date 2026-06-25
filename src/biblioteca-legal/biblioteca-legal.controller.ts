// src/biblioteca-legal/biblioteca-legal.controller.ts
import {
  Controller,
  Get,
  Param,
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
import { DocumentoLegalDto } from './dto/documento-legal.dto';
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
   * Devuelve la lista completa de documentos de urbanismo consumiendo
   * la API externa del otro proyecto (autenticada con x-api-key).
   */
  @Get('documentos')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar documentos de la Biblioteca Legal de Urbanismo',
    description:
      'Consulta la API externa del sistema de biblioteca legal y devuelve la lista de documentos ' +
      'de urbanismo con sus títulos, descripciones y rutas de GCP Storage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos obtenida exitosamente.',
    type: [DocumentoLegalDto],
  })
  @ApiResponse({
    status: 503,
    description:
      'No se pudo contactar la API externa (puede estar iniciando si usa Render gratuito).',
  })
  getDocumentos(): Promise<DocumentoLegalDto[]> {
    return this.bibliotecaLegalService.getDocumentos();
  }

  /**
   * GET /biblioteca-legal/documentos/preview/:id
   *
   * Recibe el ID del documento, lo resuelve internamente a su gcpFileName
   * y genera una Signed URL de GCP Storage válida por 15 minutos.
   * El frontend solo necesita conocer el ID — no necesita saber la ruta del archivo.
   */
  @Get('documentos/preview/:id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR)
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
