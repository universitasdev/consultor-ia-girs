// src/admin/dto/get-crm-notes-query.dto.ts
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EtiquetaCrm } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCrmNotesQueryDto {
  @ApiPropertyOptional({
    description: 'Número de página (empieza en 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: EtiquetaCrm,
    description: 'Filtrar por etiqueta CRM',
  })
  @IsOptional()
  @IsEnum(EtiquetaCrm)
  etiqueta?: EtiquetaCrm;
}
