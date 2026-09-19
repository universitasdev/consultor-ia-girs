import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEtiquetaDto {
  @ApiProperty({ example: 'Ordenación territorial' })
  @IsString()
  @MinLength(2)
  nombre: string;
}

export class UpdateEtiquetaDto extends PartialType(CreateEtiquetaDto) {}

export class GetEtiquetasQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Buscar por nombre' })
  @IsOptional()
  @IsString()
  q?: string;
}
