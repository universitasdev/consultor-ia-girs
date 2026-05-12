// src/admin/dto/create-crm-note.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtiquetaCrm } from '@prisma/client';

export class CreateCrmNoteDto {
  @ApiProperty({
    description: 'Comentario libre del administrador sobre el usuario',
    example: 'Se contactó al usuario para coordinar el pago del plan mensual.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    enum: EtiquetaCrm,
    description: 'Etiqueta de seguimiento CRM (opcional)',
    example: EtiquetaCrm.CONTACTADO,
  })
  @IsOptional()
  @IsEnum(EtiquetaCrm)
  etiqueta?: EtiquetaCrm;
}
