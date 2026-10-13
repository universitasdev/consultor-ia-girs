import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEtiquetaDto,
  GetEtiquetasQueryDto,
  UpdateEtiquetaDto,
} from './dto/etiquetas.dto';

@Injectable()
export class EtiquetasService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeNombre(nombre: string) {
    return nombre.trim().replace(/\s+/g, ' ');
  }

  /** `nombre` es @unique en BD (incluye borradas): mapear P2002 a 409 en vez de 500. */
  private rethrowUniqueConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe una etiqueta con ese nombre.');
    }
    throw error;
  }

  async create(autorId: string, dto: CreateEtiquetaDto) {
    const nombre = this.normalizeNombre(dto.nombre);
    // Incluye borradas: el índice único también las cuenta
    const existing = await this.prisma.etiqueta.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
      orderBy: { deletedAt: { sort: 'asc', nulls: 'first' } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Ya existe una etiqueta con ese nombre.');
    }

    try {
      if (existing) {
        // Etiqueta borrada (soft delete) con el mismo nombre: restaurarla
        return await this.prisma.etiqueta.update({
          where: { id: existing.id },
          data: { deletedAt: null, nombre, autorId },
        });
      }
      return await this.prisma.etiqueta.create({
        data: { nombre, autorId },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async findAll(query: GetEtiquetasQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EtiquetaWhereInput = { deletedAt: null };
    if (query.q?.trim()) {
      where.nombre = { contains: query.q.trim(), mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.etiqueta.count({ where }),
      this.prisma.etiqueta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
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

  async findOne(id: string) {
    const etiqueta = await this.prisma.etiqueta.findFirst({
      where: { id, deletedAt: null },
    });
    if (!etiqueta) throw new NotFoundException('Etiqueta no encontrada.');
    return etiqueta;
  }

  async update(id: string, dto: UpdateEtiquetaDto) {
    await this.findOne(id);

    if (!dto.nombre) {
      return this.findOne(id);
    }

    const nombre = this.normalizeNombre(dto.nombre);
    const clash = await this.prisma.etiqueta.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        nombre: { equals: nombre, mode: 'insensitive' },
      },
    });
    if (clash) {
      throw new ConflictException('Ya existe una etiqueta con ese nombre.');
    }

    try {
      return await this.prisma.etiqueta.update({
        where: { id },
        data: { nombre },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.etiqueta.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
