import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { STAFF_ROLES, type StaffRole } from './create-staff-user.dto';

export class GetStaffQueryDto {
  @ApiPropertyOptional({ description: 'Número de página (empieza en 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de elementos por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: STAFF_ROLES,
    description: 'Filtrar por rol de staff',
  })
  @IsOptional()
  @IsIn([...STAFF_ROLES])
  role?: StaffRole;

  @ApiPropertyOptional({
    description: 'Buscar por email, nombre o apellido',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
