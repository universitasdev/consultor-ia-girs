// src/youtube/youtube.controller.ts
import {
  Controller,
  Get,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { YoutubeService } from './youtube.service';
import { VideoItemDto } from './dto/video-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('YouTube')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  /**
   * GET /youtube/playlist
   *
   * Devuelve la lista completa de videos de la playlist configurada en las
   * variables de entorno. La API Key de YouTube nunca se expone al frontend.
   * Los resultados se cachean en memoria por 1 hora.
   */
  @Get('playlist')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener videos de la playlist de YouTube',
    description:
      'Proxy seguro hacia la YouTube Data API v3. Devuelve la lista completa de videos ' +
      'con título, descripción, miniatura y URL. La API Key se mantiene segura en el servidor. ' +
      'Los resultados se cachean 1 hora para proteger la cuota diaria de la API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de videos obtenida exitosamente.',
    type: [VideoItemDto],
  })
  @ApiResponse({
    status: 500,
    description:
      'Error al consultar la YouTube API (key inválida, playlist no encontrada, o cuota agotada).',
  })
  getPlaylist(): Promise<VideoItemDto[]> {
    return this.youtubeService.getPlaylistVideos();
  }

  /**
   * DELETE /youtube/cache
   *
   * Invalida el caché en memoria. Útil cuando se actualiza la playlist
   * y no se quiere esperar 1 hora para que el cambio sea visible.
   * Solo accesible para ADMIN.
   */
  @Delete('cache')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidar el caché de la playlist',
    description:
      'Fuerza que la próxima petición a /youtube/playlist consulte la YouTube API directamente, ' +
      'descartando el caché actual. Solo disponible para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Caché invalidado correctamente.',
    schema: {
      example: { message: 'Caché de YouTube invalidado correctamente.' },
    },
  })
  invalidateCache(): { message: string } {
    this.youtubeService.invalidateCache();
    return { message: 'Caché de YouTube invalidado correctamente.' };
  }
}
