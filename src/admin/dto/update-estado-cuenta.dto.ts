/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { EstadoCuenta } from '@prisma/client';

export class UpdateEstadoCuentaDto {
  @ApiProperty({
    enum: EstadoCuenta,
    description: 'El nuevo estado de cuenta del usuario.',
  })
  @IsEnum(EstadoCuenta)
  estadoCuenta: EstadoCuenta;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento (ISO 8601). Opcional.',
  })
  @IsOptional()
  @IsDateString()
  fechaVencimientoAcceso?: string;
}
