// src/auth/dto/create-auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { TipoUsuario, EstatusNormativaGIRS } from '@prisma/client';

export class CreateAuthDto {
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Correo electrónico del usuario',
  }) // <-- 2. Añade decorador
  @IsEmail({}, { message: 'El email debe ser un correo válido.' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña con al menos 8 caracteres',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  @IsString()
  nombre: string;

  @ApiProperty({
    required: false,
    example: 'Pérez',
    description: 'Apellido del usuario (opcional)',
  })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiProperty({
    required: false,
    example: '+123456789',
    description: 'Teléfono del usuario (opcional)',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ example: 'Miranda' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiProperty({ example: 'Sucre' })
  @IsString()
  @IsNotEmpty()
  municipio: string;

  @ApiProperty({ enum: TipoUsuario, example: TipoUsuario.SERVIDOR_PUBLICO })
  @IsEnum(TipoUsuario, {
    message: 'tipo_usuario debe ser SERVIDOR_PUBLICO o ASESOR_PRIVADO',
  })
  tipo_usuario: TipoUsuario;

  @ApiProperty({ example: 'Ministerio de Ecosocialismo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre_ente es obligatorio' })
  nombre_ente: string;

  @ApiProperty({ example: 'Director General', required: false })
  @ValidateIf((o) => o.tipo_usuario === TipoUsuario.SERVIDOR_PUBLICO)
  @IsString()
  @IsNotEmpty()
  cargo?: string;

  @ApiProperty({
    enum: EstatusNormativaGIRS,
    example: EstatusNormativaGIRS.VIGENTE,
    required: false,
  })
  @ValidateIf((o) => o.tipo_usuario === TipoUsuario.SERVIDOR_PUBLICO)
  @IsEnum(EstatusNormativaGIRS)
  estatus_normativa_girs?: EstatusNormativaGIRS;
}
