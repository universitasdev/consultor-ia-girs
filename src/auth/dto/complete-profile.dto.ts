// src/users/dto/complete-profile.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EstatusNormativaGIRS } from '@prisma/client';

export class CompleteProfileDto {
  @ApiProperty({
    description: 'Nombre del ente o institución',
    example: 'Ministerio de Educación',
  })
  @IsString()
  @IsNotEmpty()
  nombre_ente: string;

  @ApiProperty({
    description: 'Cargo actual del usuario (opcional)',
    example: 'Director General',
    required: false,
  })
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiProperty({
    description: 'Estatus de la normativa GIRS (opcional)',
    enum: EstatusNormativaGIRS,
    example: EstatusNormativaGIRS.VIGENTE,
    required: false,
  })
  @IsEnum(EstatusNormativaGIRS)
  @IsOptional()
  estatus_normativa_girs?: EstatusNormativaGIRS;

  @ApiProperty({
    required: false, // Basado en tu schema, este campo es opcional
    description: 'Plazo en días para la entrega del acta (opcional)',
    example: '30 días',
  })
  @IsString()
  @IsOptional()
  plazoEntregaActa?: string;
}
