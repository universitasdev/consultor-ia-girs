import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccionRevision,
  EstadoDocumento,
  LegibilidadPdf,
  MacroTipoDocumento,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GcsDocumentsService } from './gcs-documents.service';
import { PENDIENTES_FOLDER, slugForMacro } from './documents.paths';
import {
  GetDocumentsQueryDto,
  RejectDocumentDto,
  UpdateVisibilityDto,
  UploadDocumentMetadataDto,
} from './dto/documents.dto';

const documentoInclude = {
  etiquetas: {
    include: {
      etiqueta: {
        select: { id: true, nombre: true },
      },
    },
  },
  autor: {
    select: { id: true, nombre: true, apellido: true, email: true },
  },
} satisfies Prisma.DocumentoInclude;

const revisionInclude = {
  actor: {
    select: { id: true, nombre: true, apellido: true, email: true, role: true },
  },
  documento: {
    select: {
      id: true,
      tituloBreve: true,
      tituloIntegro: true,
      estado: true,
      macroTipo: true,
      enteEmisor: true,
    },
  },
} satisfies Prisma.DocumentoRevisionInclude;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsDocumentsService,
  ) {}

  getMacroTipos() {
    return Object.values(MacroTipoDocumento).map((value) => ({
      value,
      slug: slugForMacro(value),
      label: value.replace(/_/g, ' '),
    }));
  }

  private isStaffRole(role: UserRole) {
    return (
      role === UserRole.ADMIN ||
      role === UserRole.REVISOR ||
      role === UserRole.CURADOR ||
      role === UserRole.ADMIN_VISUALIZADOR
    );
  }

  private isPendingPath(archivoPath: string) {
    return archivoPath.includes(`/${PENDIENTES_FOLDER}/`);
  }

  private extractEnteEmisor(
    macro: MacroTipoDocumento,
    params: Record<string, unknown>,
    fallback: string,
  ): string {
    if (fallback?.trim()) return fallback.trim();
    const fromParams =
      (params.ente_emisor as string) ||
      (params.autor as string) ||
      (params.tribunal_nacional as string) ||
      (params.tribunal_municipal as string) ||
      (params.tipo_corte as string);
    return (fromParams || 'SIN_ENTE').toString().trim();
  }

  private buildListWhere(
    query: GetDocumentsQueryDto,
    extras: Prisma.DocumentoWhereInput = {},
  ): Prisma.DocumentoWhereInput {
    const where: Prisma.DocumentoWhereInput = {
      deletedAt: null,
      ...extras,
    };

    if (query.estado) {
      where.estado = query.estado;
    }

    if (query.macroTipo) {
      where.macroTipo = query.macroTipo;
    }

    if (query.etiquetaId) {
      where.etiquetas = { some: { etiquetaId: query.etiquetaId } };
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { tituloIntegro: { contains: q, mode: 'insensitive' } },
        { tituloBreve: { contains: q, mode: 'insensitive' } },
        { enteEmisor: { contains: q, mode: 'insensitive' } },
        { resumenDescriptivo: { contains: q, mode: 'insensitive' } },
        { categorias: { contains: q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async paginate(
    where: Prisma.DocumentoWhereInput,
    query: GetDocumentsQueryDto,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.documento.count({ where }),
      this.prisma.documento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: documentoInclude,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private async resolveEtiquetaIds(etiquetaIds?: string[]) {
    if (!etiquetaIds?.length) return [] as string[];
    const unique = [...new Set(etiquetaIds)];
    const found = await this.prisma.etiqueta.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException(
        'Una o más etiquetas no existen o fueron eliminadas.',
      );
    }
    return found.map((e) => e.id);
  }

  private async logRevision(params: {
    documentoId: string;
    actorId: string;
    accion: AccionRevision;
    motivo?: string | null;
  }) {
    return this.prisma.documentoRevision.create({
      data: {
        documentoId: params.documentoId,
        actorId: params.actorId,
        accion: params.accion,
        motivo: params.motivo?.trim() || null,
      },
    });
  }

  async upload(
    autorId: string,
    file: Express.Multer.File | undefined,
    metadata: UploadDocumentMetadataDto,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo PDF es obligatorio.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF.');
    }

    const enteEmisor = this.extractEnteEmisor(
      metadata.macroTipo,
      metadata.parametrosEspecificos || {},
      metadata.enteEmisor,
    );

    const fechaPublicacion = metadata.fechaPublicacion
      ? new Date(metadata.fechaPublicacion)
      : null;

    if (fechaPublicacion) {
      const existing = await this.prisma.documento.findFirst({
        where: {
          deletedAt: null,
          tituloIntegro: metadata.tituloIntegro.trim(),
          enteEmisor,
          fechaPublicacion,
        },
      });
      if (existing) {
        throw new ConflictException(
          'Ya existe un documento con el mismo título, ente emisor y fecha.',
        );
      }
    }

    const etiquetaIds = await this.resolveEtiquetaIds(metadata.etiquetaIds);
    const uploaded = await this.gcs.uploadPending(file);
    const legibilidad =
      metadata.noLegible || metadata.legibilidadPdf === LegibilidadPdf.SOLO_IMAGEN
        ? LegibilidadPdf.SOLO_IMAGEN
        : LegibilidadPdf.PDF_TEXTO;

    return this.prisma.documento.create({
      data: {
        autorId,
        macroTipo: metadata.macroTipo,
        carpetaSlug: slugForMacro(metadata.macroTipo),
        tituloIntegro: metadata.tituloIntegro.trim(),
        tituloBreve: metadata.tituloBreve.trim(),
        parametrosEspecificos:
          metadata.parametrosEspecificos as Prisma.InputJsonValue,
        enteEmisor,
        fechaPublicacion,
        categorias: metadata.categorias?.trim() || null,
        resumenDescriptivo: metadata.resumenDescriptivo.trim(),
        resumenCorto: metadata.resumenCorto?.trim() || null,
        palabrasClave: metadata.palabrasClave?.trim() || null,
        legibilidadPdf: legibilidad,
        archivoPath: uploaded.path,
        archivoUrl: uploaded.url,
        estado: EstadoDocumento.PENDIENTE_REVISION,
        visibleEnBiblioteca: true,
        etiquetas: {
          create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })),
        },
      },
      include: documentoInclude,
    });
  }

  /** Documentos del curador autenticado (todos los estados, filtrables). */
  findMine(autorId: string, query: GetDocumentsQueryDto) {
    return this.paginate(this.buildListWhere(query, { autorId }), query);
  }

  getMineStats(autorId: string) {
    const base = { autorId, deletedAt: null as Date | null };
    return Promise.all([
      this.prisma.documento.count({ where: base }),
      this.prisma.documento.count({
        where: { ...base, estado: EstadoDocumento.PENDIENTE_REVISION },
      }),
      this.prisma.documento.count({
        where: { ...base, estado: EstadoDocumento.RECHAZADO },
      }),
      this.prisma.documento.count({
        where: { ...base, estado: EstadoDocumento.PUBLICADO },
      }),
    ]).then(([total, pendientes, rechazados, publicados]) => ({
      total,
      pendientes,
      rechazados,
      publicados,
    }));
  }

  /** Cola del revisor: solo pendientes de revisión. */
  findPending(query: GetDocumentsQueryDto) {
    return this.paginate(
      this.buildListWhere(
        { ...query, estado: undefined },
        { estado: EstadoDocumento.PENDIENTE_REVISION },
      ),
      query,
    );
  }

  getPendingStats() {
    return this.prisma.documento
      .count({
        where: {
          deletedAt: null,
          estado: EstadoDocumento.PENDIENTE_REVISION,
        },
      })
      .then((pendientes) => ({ pendientes }));
  }

  /**
   * Biblioteca autenticada: solo PUBLICADO.
   * USER/PAID_USER: solo visibleEnBiblioteca=true.
   * Staff: todos; query.visible opcional.
   */
  findPublished(query: GetDocumentsQueryDto, role: UserRole) {
    const extras: Prisma.DocumentoWhereInput = {
      estado: EstadoDocumento.PUBLICADO,
    };

    const isEndUser =
      role === UserRole.USER || role === UserRole.PAID_USER;

    if (isEndUser) {
      extras.visibleEnBiblioteca = true;
    } else if (typeof query.visible === 'boolean') {
      extras.visibleEnBiblioteca = query.visible;
    }

    return this.paginate(
      this.buildListWhere({ ...query, estado: undefined }, extras),
      query,
    );
  }

  async findOne(id: string, user: { id: string; role: UserRole }) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
      include: documentoInclude,
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado.');
    }

    const isOwner = doc.autorId === user.id;
    const isStaff = this.isStaffRole(user.role);

    const isPublishedConsumer =
      doc.estado === EstadoDocumento.PUBLICADO &&
      (user.role === UserRole.USER ||
        user.role === UserRole.PAID_USER ||
        isStaff);

    if (!isOwner && !isStaff && !isPublishedConsumer) {
      throw new ForbiddenException('No tienes acceso a este documento.');
    }

    if (
      (user.role === UserRole.USER || user.role === UserRole.PAID_USER) &&
      (doc.estado !== EstadoDocumento.PUBLICADO || !doc.visibleEnBiblioteca)
    ) {
      throw new ForbiddenException('Documento no disponible.');
    }

    let previewUrl: string | null = null;
    try {
      previewUrl = await this.gcs.getSignedUrl(doc.archivoPath);
    } catch {
      previewUrl = doc.archivoUrl;
    }

    return { ...doc, previewUrl };
  }

  async resubmit(id: string, autorId: string) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (doc.autorId !== autorId) {
      throw new ForbiddenException('Solo el autor puede reenviar el documento.');
    }
    if (doc.estado !== EstadoDocumento.RECHAZADO) {
      throw new ConflictException(
        'Solo se pueden reenviar documentos en estado RECHAZADO.',
      );
    }

    const updated = await this.prisma.documento.update({
      where: { id },
      data: {
        estado: EstadoDocumento.PENDIENTE_REVISION,
        motivoRechazo: null,
      },
      include: documentoInclude,
    });

    await this.logRevision({
      documentoId: id,
      actorId: autorId,
      accion: AccionRevision.REENVIADO,
    });

    return updated;
  }

  /**
   * Corrige un documento RECHAZADO (metadata + PDF opcional) y lo reenvía a revisión.
   */
  async correct(
    id: string,
    autorId: string,
    metadata: UploadDocumentMetadataDto,
    file?: Express.Multer.File,
  ) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (doc.autorId !== autorId) {
      throw new ForbiddenException('Solo el autor puede corregir el documento.');
    }
    if (doc.estado !== EstadoDocumento.RECHAZADO) {
      throw new ConflictException(
        'Solo se pueden corregir documentos en estado RECHAZADO.',
      );
    }

    if (file && file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF.');
    }

    const enteEmisor = this.extractEnteEmisor(
      metadata.macroTipo,
      metadata.parametrosEspecificos || {},
      metadata.enteEmisor,
    );

    const fechaPublicacion = metadata.fechaPublicacion
      ? new Date(metadata.fechaPublicacion)
      : null;

    if (fechaPublicacion) {
      const existing = await this.prisma.documento.findFirst({
        where: {
          deletedAt: null,
          id: { not: id },
          tituloIntegro: metadata.tituloIntegro.trim(),
          enteEmisor,
          fechaPublicacion,
        },
      });
      if (existing) {
        throw new ConflictException(
          'Ya existe un documento con el mismo título, ente emisor y fecha.',
        );
      }
    }

    const etiquetaIds = await this.resolveEtiquetaIds(metadata.etiquetaIds);
    const legibilidad =
      metadata.noLegible || metadata.legibilidadPdf === LegibilidadPdf.SOLO_IMAGEN
        ? LegibilidadPdf.SOLO_IMAGEN
        : LegibilidadPdf.PDF_TEXTO;

    let archivoPath = doc.archivoPath;
    let archivoUrl = doc.archivoUrl;

    if (file) {
      const uploaded = await this.gcs.uploadPending(file);
      archivoPath = uploaded.path;
      archivoUrl = uploaded.url;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.documentoEtiqueta.deleteMany({ where: { documentoId: id } });

      return tx.documento.update({
        where: { id },
        data: {
          macroTipo: metadata.macroTipo,
          carpetaSlug: slugForMacro(metadata.macroTipo),
          tituloIntegro: metadata.tituloIntegro.trim(),
          tituloBreve: metadata.tituloBreve.trim(),
          parametrosEspecificos:
            metadata.parametrosEspecificos as Prisma.InputJsonValue,
          enteEmisor,
          fechaPublicacion,
          categorias: metadata.categorias?.trim() || null,
          resumenDescriptivo: metadata.resumenDescriptivo.trim(),
          resumenCorto: metadata.resumenCorto?.trim() || null,
          palabrasClave: metadata.palabrasClave?.trim() || null,
          legibilidadPdf: legibilidad,
          archivoPath,
          archivoUrl,
          estado: EstadoDocumento.PENDIENTE_REVISION,
          motivoRechazo: null,
          etiquetas: {
            create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })),
          },
        },
        include: documentoInclude,
      });
    });

    await this.logRevision({
      documentoId: id,
      actorId: autorId,
      accion: AccionRevision.REENVIADO,
    });

    return updated;
  }

  async softDelete(id: string, autorId: string) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (doc.autorId !== autorId) {
      throw new ForbiddenException('Solo el autor puede eliminar el documento.');
    }
    if (doc.estado === EstadoDocumento.PUBLICADO) {
      throw new ForbiddenException('No se puede eliminar un documento publicado.');
    }

    return this.prisma.documento.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: documentoInclude,
    });
  }

  async approve(id: string, actorId: string) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (doc.estado !== EstadoDocumento.PENDIENTE_REVISION) {
      throw new ConflictException(
        'Solo se aprueban documentos en PENDIENTE_REVISION.',
      );
    }

    let archivoPath = doc.archivoPath;
    let archivoUrl = doc.archivoUrl;

    if (this.isPendingPath(doc.archivoPath)) {
      const moved = await this.gcs.moveToPublished(
        doc.archivoPath,
        doc.macroTipo,
      );
      archivoPath = moved.path;
      archivoUrl = moved.url;
    }

    const updated = await this.prisma.documento.update({
      where: { id },
      data: {
        estado: EstadoDocumento.PUBLICADO,
        motivoRechazo: null,
        visibleEnBiblioteca: true,
        archivoPath,
        archivoUrl,
      },
      include: documentoInclude,
    });

    await this.logRevision({
      documentoId: id,
      actorId,
      accion: AccionRevision.APROBADO,
    });

    return updated;
  }

  async reject(id: string, actorId: string, dto: RejectDocumentDto) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (
      doc.estado !== EstadoDocumento.PENDIENTE_REVISION &&
      doc.estado !== EstadoDocumento.PUBLICADO
    ) {
      throw new ConflictException(
        'Solo se rechazan documentos en PENDIENTE_REVISION o PUBLICADO.',
      );
    }

    const motivo = dto.motivoRechazo.trim();

    const updated = await this.prisma.documento.update({
      where: { id },
      data: {
        estado: EstadoDocumento.RECHAZADO,
        motivoRechazo: motivo,
        visibleEnBiblioteca: false,
      },
      include: documentoInclude,
    });

    await this.logRevision({
      documentoId: id,
      actorId,
      accion: AccionRevision.RECHAZADO,
      motivo,
    });

    return updated;
  }

  async updateVisibility(
    id: string,
    dto: UpdateVisibilityDto,
  ) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (doc.estado !== EstadoDocumento.PUBLICADO) {
      throw new ConflictException(
        'Solo se puede cambiar la visibilidad de documentos PUBLICADOS.',
      );
    }

    return this.prisma.documento.update({
      where: { id },
      data: { visibleEnBiblioteca: dto.visibleEnBiblioteca },
      include: documentoInclude,
    });
  }

  async getDocumentRevisiones(
    id: string,
    user: { id: string; role: UserRole },
  ) {
    const doc = await this.prisma.documento.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, autorId: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');

    const isOwner = doc.autorId === user.id;
    const canView =
      isOwner ||
      user.role === UserRole.REVISOR ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.CURADOR ||
      user.role === UserRole.ADMIN_VISUALIZADOR;

    if (!canView) {
      throw new ForbiddenException('No tienes acceso al historial.');
    }

    const items = await this.prisma.documentoRevision.findMany({
      where: { documentoId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return { items };
  }

  async getReviewHistory(
    actorId: string,
    query: GetDocumentsQueryDto,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentoRevisionWhereInput = {
      actorId,
    };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { motivo: { contains: q, mode: 'insensitive' } },
        {
          documento: {
            OR: [
              { tituloIntegro: { contains: q, mode: 'insensitive' } },
              { tituloBreve: { contains: q, mode: 'insensitive' } },
              { enteEmisor: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.documentoRevision.count({ where }),
      this.prisma.documentoRevision.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: revisionInclude,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
