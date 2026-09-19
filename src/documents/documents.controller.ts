import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { DocumentsService } from './documents.service';
import {
  GetDocumentsQueryDto,
  RejectDocumentDto,
  UpdateVisibilityDto,
  UploadDocumentMetadataDto,
} from './dto/documents.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('catalog/macro-tipos')
  @Roles(
    UserRole.CURADOR,
    UserRole.ADMIN,
    UserRole.REVISOR,
    UserRole.USER,
    UserRole.PAID_USER,
    UserRole.ADMIN_VISUALIZADOR,
  )
  @ApiOperation({ summary: 'Catálogo de macro tipos de documento' })
  getMacroTipos() {
    return this.documentsService.getMacroTipos();
  }

  @Post('upload')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo', 'metadata'],
      properties: {
        archivo: { type: 'string', format: 'binary' },
        metadata: {
          type: 'string',
          description: 'JSON string UploadDocumentMetadataDto',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Subir documento PDF tipificado (Curador)' })
  async upload(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadataRaw: string,
  ) {
    let parsed: unknown;
    try {
      parsed =
        typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
    } catch {
      throw new BadRequestException('metadata debe ser un JSON válido.');
    }

    const metadata = plainToInstance(UploadDocumentMetadataDto, parsed);
    const errors = await validate(metadata);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints || {}),
      );
      throw new BadRequestException(messages);
    }

    return this.documentsService.upload(user.id, file, metadata);
  }

  @Get('mine/stats')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Métricas del curador' })
  getMineStats(@GetUser() user: User) {
    return this.documentsService.getMineStats(user.id);
  }

  @Get('mine')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar documentos del curador (paginado, búsqueda y filtros)',
  })
  findMine(@GetUser() user: User, @Query() query: GetDocumentsQueryDto) {
    return this.documentsService.findMine(user.id, query);
  }

  @Get('pending/stats')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Métricas de cola de revisión' })
  getPendingStats() {
    return this.documentsService.getPendingStats();
  }

  @Get('pending')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cola de revisión: solo PENDIENTE_REVISION (paginado)',
  })
  findPending(@Query() query: GetDocumentsQueryDto) {
    return this.documentsService.findPending(query);
  }

  @Get('review/history')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Historial de revisiones actuadas por el revisor autenticado',
  })
  getReviewHistory(
    @GetUser() user: User,
    @Query() query: GetDocumentsQueryDto,
  ) {
    return this.documentsService.getReviewHistory(user.id, query);
  }

  @Get('published')
  @Roles(
    UserRole.USER,
    UserRole.PAID_USER,
    UserRole.CURADOR,
    UserRole.REVISOR,
    UserRole.ADMIN,
    UserRole.ADMIN_VISUALIZADOR,
  )
  @ApiOperation({
    summary:
      'Biblioteca autenticada: solo documentos PUBLICADOS (nunca pendientes/rechazados)',
  })
  findPublished(
    @GetUser() user: User,
    @Query() query: GetDocumentsQueryDto,
  ) {
    return this.documentsService.findPublished(query, user.role);
  }

  @Get(':id/revisiones')
  @Roles(
    UserRole.CURADOR,
    UserRole.ADMIN,
    UserRole.REVISOR,
    UserRole.ADMIN_VISUALIZADOR,
  )
  @ApiOperation({ summary: 'Historial de revisiones de un documento' })
  getDocumentRevisiones(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.getDocumentRevisiones(id, user);
  }

  @Get(':id')
  @Roles(
    UserRole.CURADOR,
    UserRole.ADMIN,
    UserRole.REVISOR,
    UserRole.ADMIN_VISUALIZADOR,
    UserRole.USER,
    UserRole.PAID_USER,
  )
  @ApiOperation({ summary: 'Detalle de documento' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.findOne(id, user);
  }

  @Patch(':id/resubmit')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reenviar documento rechazado (sin editar)' })
  resubmit(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.resubmit(id, user.id);
  }

  @Patch(':id/correct')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['metadata'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'PDF opcional (reemplaza el actual)',
        },
        metadata: {
          type: 'string',
          description: 'JSON string UploadDocumentMetadataDto',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Corregir documento rechazado (metadata + PDF opcional) y reenviar a revisión',
  })
  async correct(
    @Param('id') id: string,
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('metadata') metadataRaw: string,
  ) {
    let parsed: unknown;
    try {
      parsed =
        typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
    } catch {
      throw new BadRequestException('metadata debe ser un JSON válido.');
    }

    const metadata = plainToInstance(UploadDocumentMetadataDto, parsed);
    const errors = await validate(metadata);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints || {}),
      );
      throw new BadRequestException(messages);
    }

    return this.documentsService.correct(id, user.id, metadata, file);
  }

  @Delete(':id')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete de documento no publicado' })
  softDelete(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.softDelete(id, user.id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Aprobar documento (mueve a carpeta macro si aplica)' })
  approve(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Rechazar documento (PENDIENTE_REVISION o PUBLICADO) con motivo',
  })
  reject(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.documentsService.reject(id, user.id, dto);
  }

  @Patch(':id/visibility')
  @Roles(UserRole.REVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cambiar visibilidad en biblioteca de usuarios (solo PUBLICADO)',
  })
  updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.documentsService.updateVisibility(id, dto);
  }
}
