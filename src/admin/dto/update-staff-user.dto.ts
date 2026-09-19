import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { STAFF_ROLES, type StaffRole } from './create-staff-user.dto';

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @Matches(NAME_PATTERN, {
    message: 'El nombre solo admite letras (sin números ni símbolos).',
  })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @Matches(NAME_PATTERN, {
    message: 'El apellido solo admite letras (sin números ni símbolos).',
  })
  apellido?: string;

  @ApiPropertyOptional({ example: 'ana.curadora@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  email?: string;

  @ApiPropertyOptional({
    example: 'NuevaPass123',
    description: 'Mínimo 8 caracteres, al menos una mayúscula y un número',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_PATTERN, {
    message: 'La contraseña debe tener al menos una mayúscula y un número.',
  })
  password?: string;

  @ApiPropertyOptional({
    enum: STAFF_ROLES,
    example: UserRole.REVISOR,
  })
  @IsOptional()
  @IsIn([...STAFF_ROLES])
  role?: StaffRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
