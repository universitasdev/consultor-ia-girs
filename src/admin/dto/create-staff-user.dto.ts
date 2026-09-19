import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export const STAFF_ROLES = [UserRole.CURADOR, UserRole.REVISOR] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export class CreateStaffUserDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @Matches(NAME_PATTERN, {
    message: 'El nombre solo admite letras (sin números ni símbolos).',
  })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @Matches(NAME_PATTERN, {
    message: 'El apellido solo admite letras (sin números ni símbolos).',
  })
  apellido: string;

  @ApiProperty({ example: 'ana.curadora@ejemplo.com' })
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'TempPass123',
    description: 'Mínimo 8 caracteres, al menos una mayúscula y un número',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_PATTERN, {
    message: 'La contraseña debe tener al menos una mayúscula y un número.',
  })
  password: string;

  @ApiProperty({ enum: STAFF_ROLES, example: UserRole.CURADOR })
  @IsIn([...STAFF_ROLES])
  @IsNotEmpty()
  role: StaffRole;
}
