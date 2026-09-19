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

  async create(autorId: string, dto: CreateEtiquetaDto) {
    const nombre = this.normalizeNombre(dto.nombre);
    const existing = await this.prisma.etiqueta.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe una etiqueta con ese nombre.');
    }

    return this.prisma.etiqueta.create({
      data: { nombre, autorId },
    });
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

    return this.prisma.etiqueta.update({
      where: { id },
      data: { nombre },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.etiqueta.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
