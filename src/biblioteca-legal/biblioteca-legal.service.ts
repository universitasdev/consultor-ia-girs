// src/biblioteca-legal/biblioteca-legal.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { DocumentoLegalDto } from './dto/documento-legal.dto';
import { PaginatedDocumentosDto } from './dto/paginated-documentos.dto';
import { GetDocumentosQueryDto } from './dto/get-documentos-query.dto';
import { DocumentosResponseDto } from './dto/documentos-response.dto';

@Injectable()
export class BibliotecaLegalService {
  private readonly logger = new Logger(BibliotecaLegalService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    let keyFilePath = this.configService.get<string>('GCP_KEY_FILE_PATH');
    this.bucketName = this.configService.get<string>(
      'GCP_STORAGE_BUCKET_NAME',
      'biblioteca-legal',
    );
    this.apiUrl = this.configService.get<string>('URBANISMO_API_URL', '');
    this.apiKey = this.configService.get<string>('URBANISMO_API_KEY', '');

    // Verificar si el archivo realmente existe (en Cloud Run no existirá porque está en .dockerignore)
    if (keyFilePath && !require('fs').existsSync(keyFilePath)) {
      this.logger.warn(`El archivo de credenciales ${keyFilePath} no existe. Forzando el uso de Application Default Credentials.`);
      keyFilePath = undefined;
    }

    // Inicializar GCP Storage — si no hay keyFilePath usa Application Default Credentials
    if (keyFilePath) {
      this.storage = new Storage({ keyFilename: keyFilePath });
      this.logger.log(`GCP Storage inicializado con key file: ${keyFilePath}`);
    } else {
      this.storage = new Storage(); // Intentará usar ADC (Application Default Credentials)
      this.logger.warn(
        'GCP_KEY_FILE_PATH no configurado o no existe — usando Application Default Credentials. ' +
          'El endpoint de preview puede fallar si no hay credenciales disponibles.',
      );
    }
  }

  /**
   * Llama a la API externa y devuelve la lista completa de documentos.
   *
   * Compatible con ambos formatos de respuesta:
   *  - Legacy (actual): array directo  → [...documentos]
   *  - Paginado (nuevo): objeto envuelto → { items, total, page, limit, totalPages }
   *
   * Cuando la API migre al formato paginado, este método iterará
   * automáticamente todas las páginas sin necesidad de otro cambio.
   */
  async getDocumentos(): Promise<DocumentoLegalDto[]> {
    if (!this.apiUrl) {
      throw new InternalServerErrorException(
        'La variable URBANISMO_API_URL no está configurada.',
      );
    }

    const LIMIT = 100;
    let currentPage = 1;
    let totalPages = 1;
    const allDocumentos: DocumentoLegalDto[] = [];

    this.logger.log(`Iniciando carga desde API externa: ${this.apiUrl}`);

    try {
      do {
        const url = `${this.apiUrl}?page=${currentPage}&limit=${LIMIT}`;
        this.logger.log(
          `Consultando página ${currentPage}/${totalPages}: ${url}`,
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.error(
            `Error en API externa. Status: ${response.status} ${response.statusText}`,
          );
          throw new InternalServerErrorException(
            `La API externa respondió con estado ${response.status}. Verifique la URL y la API KEY.`,
          );
        }

        const raw = (await response.json()) as unknown;

        let pageItems: DocumentoLegalDto[];

        if (Array.isArray(raw)) {
          // ── Formato LEGACY: la API devuelve un arreglo directo ──
          // Se consume en una sola pasada y se sale del bucle.
          this.logger.log(
            `Formato legacy detectado — ${raw.length} documentos en respuesta directa.`,
          );
          pageItems = raw as DocumentoLegalDto[];
          totalPages = 1; // forzar salida del do-while
        } else {
          // ── Formato PAGINADO: { items, total, page, limit, totalPages } ──
          const paginated = raw as PaginatedDocumentosDto;
          totalPages = paginated.totalPages ?? 1;
          pageItems = paginated.items ?? [];
          this.logger.log(
            `Formato paginado detectado — página ${currentPage}/${totalPages}, ${pageItems.length} items.`,
          );
        }

        // Normalizar y acumular
        const normalized: DocumentoLegalDto[] = pageItems.map((doc) => ({
          id: doc.id ?? '',
          titulo: doc.titulo ?? null,
          descripcion: doc.descripcion ?? null,
          gcpFileName: doc.gcpFileName ?? '',
          fechaPublicacion: doc.fechaPublicacion ?? null,
          numeroGaceta: doc.numeroGaceta ?? null,
          municipio: doc.municipio ?? null,
          estado: doc.estado ?? null,
          tituloIntegro: doc.tituloIntegro ?? null,
          resumen: doc.resumen ?? null,
          archivoOriginalUrl: doc.archivoOriginalUrl ?? null,
          estadoLegal: doc.estadoLegal ?? null,
          tipoNorma: doc.tipoNorma ?? null,
          enteEmisor: doc.enteEmisor ?? null,
          pais: doc.pais ?? null,
          curadorId: doc.curadorId ?? null,
          curador: (doc.curador as Record<string, unknown>) ?? null,
          categorias: (doc.categorias as unknown[]) ?? null,
          etiquetas: (doc.etiquetas as unknown[]) ?? null,
          notasInternas: (doc.notasInternas as unknown[]) ?? null,
          metadatos: (doc.metadatos as Record<string, unknown>) ?? null,
          _count: (doc._count as Record<string, unknown>) ?? null,
        }));

        allDocumentos.push(...normalized);
        currentPage++;
      } while (currentPage <= totalPages);

      this.logger.log(
        `Carga completa: ${allDocumentos.length} documentos obtenidos.`,
      );

      return allDocumentos;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;

      const errName = (error as Error).name;
      if (errName === 'AbortError') {
        this.logger.error(
          `Timeout en página ${currentPage} al consultar la API externa de urbanismo.`,
        );
        throw new InternalServerErrorException(
          'La API externa tardó demasiado en responder. Por favor, intente nuevamente en unos momentos (el servidor puede estar iniciando).',
        );
      }

      this.logger.error('Error inesperado al consultar la API externa', error);
      throw new InternalServerErrorException(
        'No se pudo obtener la lista de documentos. Intente más tarde.',
      );
    }
  }

  /**
   * Devuelve los documentos de urbanismo con filtros opcionales y
   * paginación controlada por el consumidor.
   *
   * Estrategia:
   *   1. Se obtiene el dataset completo desde la API externa (getDocumentos).
   *   2. Se aplican los filtros en memoria (search, municipio, estado).
   *   3. Se pagina el resultado filtrado antes de responder.
   *
   * @param query - Parámetros de filtrado y paginación
   */
  async getDocumentosFiltrados(
    query: GetDocumentosQueryDto,
  ): Promise<DocumentosResponseDto> {
    const { page = 1, limit = 20, search, municipio, estado } = query;

    // 1. Obtener todos los documentos de la API externa
    const todos = await this.getDocumentos();

    // 2. Filtrar en memoria
    const normalSearch = search?.trim().toLowerCase();
    const normalMunicipio = municipio?.trim().toLowerCase();
    const normalEstado = estado?.trim().toLowerCase();

    const filtrados = todos.filter((doc) => {
      if (
        normalSearch &&
        !doc.titulo?.toLowerCase().includes(normalSearch) &&
        !doc.descripcion?.toLowerCase().includes(normalSearch)
      ) {
        return false;
      }
      if (normalMunicipio && doc.municipio?.toLowerCase() !== normalMunicipio) {
        return false;
      }
      if (normalEstado && doc.estado?.toLowerCase() !== normalEstado) {
        return false;
      }
      return true;
    });

    // 3. Paginar
    const total = filtrados.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const items = filtrados.slice(offset, offset + limit);

    this.logger.log(
      `Filtrado: ${total} docs coinciden (page=${safePage}/${totalPages}, limit=${limit})` +
        (normalSearch ? `, search="${search}"` : '') +
        (normalMunicipio ? `, municipio="${municipio}"` : '') +
        (normalEstado ? `, estado="${estado}"` : ''),
    );

    return { items, total, page: safePage, limit, totalPages };
  }

  /**
   * Recibe el ID del documento, busca su gcpFileName en la API externa
   * y genera una Signed URL de GCP Storage válida por 15 minutos.
   *
   * De esta forma el frontend sólo necesita conocer el ID del documento.
   *
   * @param id - ID único del documento (devuelto por getDocumentos)
   */
  async getSignedUrlById(id: string): Promise<{ signedUrl: string }> {
    this.logger.log(`Preview solicitada para documento id="${id}"`);

    // 1. Traemos la lista completa de documentos desde la API externa
    const documentos = await this.getDocumentos();

    // 2. Buscamos el documento por id
    const documento = documentos.find((doc) => doc.id === id);

    if (!documento) {
      throw new NotFoundException(
        `No se encontró ningún documento con id "${id}" en la biblioteca legal.`,
      );
    }

    if (!documento.gcpFileName || documento.gcpFileName.trim() === '') {
      throw new NotFoundException(
        `El documento "${documento.titulo ?? id}" no tiene una ruta de archivo GCP asociada.`,
      );
    }

    this.logger.log(
      `Documento encontrado: "${documento.titulo ?? id}" → gcpFileName: "${documento.gcpFileName}"`,
    );

    // 3. Generamos la Signed URL con el gcpFileName resuelto
    return this.getSignedUrl(documento.gcpFileName);
  }

  /**
   * Genera una Signed URL de GCP Storage válida por 15 minutos.
   * Método interno — usa getSignedUrlById desde el controller.
   *
   * @param gcpFileName - Ruta dentro del bucket (ej: carpeta/subcarpeta/archivo.pdf)
   */
  async getSignedUrl(gcpFileName: string): Promise<{ signedUrl: string }> {
    this.logger.log(
      `Generando Signed URL para: "${gcpFileName}" en bucket "${this.bucketName}"`,
    );

    try {
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutos
      };

      const [signedUrl] = await this.storage
        .bucket(this.bucketName)
        .file(gcpFileName)
        .getSignedUrl(options);

      this.logger.log(
        `Signed URL generada exitosamente para: "${gcpFileName}"`,
      );

      return { signedUrl };
    } catch (error) {
      this.logger.error(
        `Error al generar Signed URL para "${gcpFileName}"`,
        error,
      );
      throw new InternalServerErrorException(
        `No se pudo generar la URL de previsualización para el archivo "${gcpFileName}". Verifique que el archivo exista en el bucket.`,
      );
    }
  }
}
