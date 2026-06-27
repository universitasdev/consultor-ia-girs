// src/youtube/youtube.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoItemDto } from './dto/video-item.dto';

// Tipos internos para la respuesta de la YouTube Data API v3
interface YtThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface YtSnippet {
  title: string;
  description: string;
  position: number;
  thumbnails?: {
    high?: YtThumbnail;
    medium?: YtThumbnail;
    default?: YtThumbnail;
  };
  resourceId?: {
    kind: string;
    videoId: string;
  };
}

interface YtPlaylistItem {
  snippet: YtSnippet;
}

interface YtApiResponse {
  items?: YtPlaylistItem[];
  nextPageToken?: string;
  error?: { message: string };
}

// Caché en memoria — protege la cuota diaria de YouTube (10.000 unidades/día)
interface CacheEntry {
  data: VideoItemDto[];
  expiresAt: number;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly apiKey: string;
  private readonly playlistId: string;

  /** TTL del caché: 1 hora en milisegundos */
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;
  private cache: CacheEntry | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY', '');
    this.playlistId = this.configService.get<string>('PLAYLIST_ID', '');

    if (!this.apiKey) {
      this.logger.warn(
        'YOUTUBE_API_KEY no configurada — el endpoint /youtube/playlist fallará.',
      );
    }
    if (!this.playlistId) {
      this.logger.warn(
        'PLAYLIST_ID no configurado — el endpoint /youtube/playlist fallará.',
      );
    }
  }

  /**
   * Devuelve todos los videos de la playlist configurada.
   * Los resultados se cachean en memoria por 1 hora para no gastar cuota de la API.
   */
  async getPlaylistVideos(): Promise<VideoItemDto[]> {
    // 1. Devolver desde caché si aún es válido
    if (this.cache && Date.now() < this.cache.expiresAt) {
      this.logger.log(
        `[CACHÉ] Devolviendo ${this.cache.data.length} videos desde caché (expira en ${Math.round((this.cache.expiresAt - Date.now()) / 1000 / 60)} min).`,
      );
      return this.cache.data;
    }

    if (!this.apiKey || !this.playlistId) {
      throw new InternalServerErrorException(
        'Las variables YOUTUBE_API_KEY y/o PLAYLIST_ID no están configuradas en el servidor.',
      );
    }

    // 2. Obtener todos los videos paginando (YouTube devuelve máx. 50 por petición)
    this.logger.log(
      `[YouTube API] Obteniendo videos de playlist: ${this.playlistId}`,
    );

    const allVideos: VideoItemDto[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : '';
      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet` +
        `&maxResults=50` +
        `&playlistId=${this.playlistId}` +
        `&key=${this.apiKey}` +
        pageTokenParam;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = (await response.json()) as YtApiResponse;
          const msg = errorBody?.error?.message ?? `HTTP ${response.status}`;
          this.logger.error(`[YouTube API] Error: ${msg}`);
          throw new InternalServerErrorException(
            `Error al consultar la YouTube API: ${msg}`,
          );
        }

        const data = (await response.json()) as YtApiResponse;
        const items = data.items ?? [];

        // 3. Transformar al DTO limpio
        const videos: VideoItemDto[] = items
          .filter(
            (item) =>
              item.snippet?.resourceId?.kind === 'youtube#video' &&
              item.snippet.resourceId.videoId,
          )
          .map((item): VideoItemDto => {
            const snippet = item.snippet;
            const videoId = snippet.resourceId!.videoId;
            const thumbnail =
              snippet.thumbnails?.high?.url ??
              snippet.thumbnails?.medium?.url ??
              snippet.thumbnails?.default?.url ??
              '';

            return {
              videoId,
              title: snippet.title ?? 'Sin título',
              description: snippet.description ?? '',
              thumbnail,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              position: snippet.position ?? 0,
            };
          });

        allVideos.push(...videos);
        pageToken = data.nextPageToken;

        this.logger.log(
          `[YouTube API] Página recibida: ${videos.length} videos. Total acumulado: ${allVideos.length}. Siguiente página: ${pageToken ?? 'ninguna'}`,
        );
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof InternalServerErrorException) throw error;

        const name = (error as Error).name;
        if (name === 'AbortError') {
          this.logger.error('[YouTube API] Timeout al consultar la API.');
          throw new InternalServerErrorException(
            'La YouTube API tardó demasiado en responder. Intente más tarde.',
          );
        }

        this.logger.error('[YouTube API] Error inesperado', error);
        throw new InternalServerErrorException(
          'Error inesperado al obtener los videos de la playlist.',
        );
      }
    } while (pageToken);

    // 4. Guardar en caché
    this.cache = {
      data: allVideos,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    this.logger.log(
      `[YouTube API] ${allVideos.length} videos cacheados por 1 hora.`,
    );

    return allVideos;
  }

  /**
   * Invalida el caché manualmente (útil si se actualiza la playlist y no se quiere esperar 1h).
   */
  invalidateCache(): void {
    this.cache = null;
    this.logger.log('[CACHÉ] Caché de YouTube invalidado manualmente.');
  }
}
