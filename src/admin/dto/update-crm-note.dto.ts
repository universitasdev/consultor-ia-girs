// src/admin/dto/update-crm-note.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtiquetaCrm } from '@prisma/client';

export class UpdateCrmNoteDto {
  @ApiPropertyOptional({
    description: 'Nuevo contenido del comentario',
    example: 'El usuario confirmó que realizará el pago esta semana.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    enum: EtiquetaCrm,
    description: 'Nueva etiqueta de seguimiento CRM',
    example: EtiquetaCrm.PAGO_REALIZADO,
  })
  @IsOptional()
  @IsEnum(EtiquetaCrm)
  etiqueta?: EtiquetaCrm;
}
