import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({
    description: 'Título de la noticia o actualización',
    example: 'Actualización de Políticas de Privacidad',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Contenido completo del aviso',
    example:
      'Estimado usuario, hemos actualizado nuestras políticas de uso de datos. Por favor, lea los nuevos términos...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
