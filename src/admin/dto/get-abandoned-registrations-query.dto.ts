// src/admin/dto/get-abandoned-registrations-query.dto.ts
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAbandonedRegistrationsQueryDto {
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
    description:
      'Buscar por correo electrónico o nombre (coincidencia parcial)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['SERVIDOR_PUBLICO', 'ASESOR_PRIVADO'],
    description: 'Filtrar por tipo de usuario',
  })
  @IsOptional()
  @IsString()
  tipoUsuario?: string;
}
