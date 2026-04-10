// src/admin/dto/get-users-query.dto.ts
import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, EstadoCuenta } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetUsersQueryDto {
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
    enum: UserRole,
    description: 'Filtrar por rol de usuario',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Buscar por correo electrónico (coincidencia parcial)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por estado: true = activos, false = desactivados/eliminados. Si no se envía, muestra todos.',
  })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado geográfico (ej: Miranda)',
  })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por municipio (ej: Sucre)',
  })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({
    enum: ['SERVIDOR_PUBLICO', 'ASESOR_PRIVADO'],
    description: 'Filtrar por tipo de usuario',
  })
  @IsOptional()
  @IsString() // No usamos @IsEnum(TipoUsuario) para evitar dependencias circulares complejas o errores si el enum no está disponible aquí directamente, pero Prisma lo validará.
  tipoUsuario?: string;

  @ApiPropertyOptional({
    enum: EstadoCuenta,
    description: 'Filtrar por estado de la cuenta',
  })
  @IsOptional()
  @IsEnum(EstadoCuenta)
  estadoCuenta?: EstadoCuenta;
}
