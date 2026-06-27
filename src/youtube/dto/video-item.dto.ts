// src/youtube/dto/video-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class VideoItemDto {
  @ApiProperty({
    description: 'ID único del video en YouTube',
    example: 'dQw4w9WgXcQ',
  })
  videoId: string;

  @ApiProperty({
    description: 'Título del video',
    example: 'Introducción al Urbanismo',
  })
  title: string;

  @ApiProperty({
    description: 'Descripción del video',
    example: 'En este video...',
  })
  description: string;

  @ApiProperty({
    description: 'URL de la miniatura en alta calidad',
    example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  })
  thumbnail: string;

  @ApiProperty({
    description: 'URL directa al video en YouTube',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  url: string;

  @ApiProperty({ description: 'Posición del video en la playlist', example: 1 })
  position: number;
}
