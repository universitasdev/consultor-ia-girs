// src/users/dto/update-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TipoUsuario, EstatusNormativaGIRS } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({
    required: false,
    example: 'Juan Actualizado',
    description: 'Nuevo nombre del usuario',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    required: false,
    example: 'Pérez Silva',
    description: 'Nuevo apellido del usuario',
  })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiProperty({
    required: false,
    example: '0412-999-9999',
    description: 'Nuevo teléfono de contacto del usuario',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({
    required: false,
    example: 'Miranda',
    description: 'Estado de residencia',
  })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({
    required: false,
    example: 'Sucre',
    description: 'Municipio de residencia',
  })
  @IsString()
  @IsOptional()
  municipio?: string;

  @ApiProperty({
    required: false,
    enum: TipoUsuario,
    example: TipoUsuario.SERVIDOR_PUBLICO,
    description: 'Tipo de usuario',
  })
  @IsEnum(TipoUsuario)
  @IsOptional()
  tipoUsuario?: TipoUsuario;

  @ApiProperty({
    required: false,
    example: 'Ministerio de Salud',
    description: 'Nombre de la institución o ente público',
  })
  @IsString()
  @IsOptional()
  nombre_ente?: string;

  @ApiProperty({
    required: false,
    example: 'Director General',
    description: 'Cargo del usuario en la institución',
  })
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiProperty({
    required: false,
    enum: EstatusNormativaGIRS,
    example: EstatusNormativaGIRS.VIGENTE,
    description: 'Estatus de la normativa GIRS',
  })
  @IsEnum(EstatusNormativaGIRS)
  @IsOptional()
  estatus_normativa_girs?: EstatusNormativaGIRS;

  @ApiProperty({
    required: false,
    example: '30 días',
    description: 'Plazo pactado para la entrega del acta',
  })
  @IsString()
  @IsOptional()
  plazoEntregaActa?: string;
}
