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

@Injectable()
export class BibliotecaLegalService {
  private readonly logger = new Logger(BibliotecaLegalService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const keyFilePath = this.configService.get<string>('GCP_KEY_FILE_PATH');
    this.bucketName = this.configService.get<string>(
      'GCP_STORAGE_BUCKET_NAME',
      'biblioteca-legal',
    );
    this.apiUrl = this.configService.get<string>('URBANISMO_API_URL', '');
    this.apiKey = this.configService.get<string>('URBANISMO_API_KEY', '');

    // Inicializar GCP Storage — si no hay keyFilePath usa Application Default Credentials
    if (keyFilePath) {
      this.storage = new Storage({ keyFilename: keyFilePath });
      this.logger.log(`GCP Storage inicializado con key file: ${keyFilePath}`);
    } else {
      this.storage = new Storage(); // Intentará usar ADC (Application Default Credentials)
      this.logger.warn(
        'GCP_KEY_FILE_PATH no configurado — usando Application Default Credentials. ' +
          'El endpoint de preview puede fallar si no hay credenciales disponibles.',
      );
    }
  }

  /**
   * Llama a la API externa del otro proyecto y devuelve la lista
   * de documentos de urbanismo.
   */
  async getDocumentos(): Promise<DocumentoLegalDto[]> {
    if (!this.apiUrl) {
      throw new InternalServerErrorException(
        'La variable URBANISMO_API_URL no está configurada.',
      );
    }

    this.logger.log(`Consultando API externa: ${this.apiUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout (Render puede estar "sleeping")

      const response = await fetch(this.apiUrl, {
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

      const data = (await response.json()) as DocumentoLegalDto[];
      this.logger.log(
        `API externa respondió con ${Array.isArray(data) ? data.length : 0} documentos.`,
      );

      // Normalizar campos opcionales para garantizar el contrato
      return data.map((doc) => ({
        id: doc.id ?? '',
        titulo: doc.titulo ?? null,
        descripcion: doc.descripcion ?? null,
        gcpFileName: doc.gcpFileName ?? '',
        fechaPublicacion: doc.fechaPublicacion ?? null,
        numeroGaceta: doc.numeroGaceta ?? null,
        municipio: doc.municipio ?? null,
        estado: doc.estado ?? null,
      }));
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;

      const errName = (error as Error).name;
      if (errName === 'AbortError') {
        this.logger.error('Timeout al consultar la API externa de urbanismo.');
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
