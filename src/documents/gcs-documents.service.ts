import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import { MacroTipoDocumento } from '@prisma/client';
import {
  pendientesPath,
  publishedPath,
  sanitizeFilename,
} from './documents.paths';

@Injectable()
export class GcsDocumentsService {
  private readonly logger = new Logger(GcsDocumentsService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    let keyFilePath = this.configService.get<string>('GCP_KEY_FILE_PATH');
    this.bucketName = this.configService.get<string>(
      'DOCUMENTS_GCS_BUCKET',
      this.configService.get<string>('GCP_STORAGE_BUCKET_NAME', 'biblioteca-legal'),
    );

    if (keyFilePath && !fs.existsSync(keyFilePath)) {
      this.logger.warn(
        `Credenciales ${keyFilePath} no existen. Usando Application Default Credentials.`,
      );
      keyFilePath = undefined;
    }

    this.storage = keyFilePath
      ? new Storage({ keyFilename: keyFilePath })
      : new Storage();
  }

  getBucketName(): string {
    return this.bucketName;
  }

  async uploadPending(
    file: Express.Multer.File,
  ): Promise<{ path: string; url: string; filename: string }> {
    if (!this.bucketName) {
      throw new InternalServerErrorException(
        'DOCUMENTS_GCS_BUCKET no está configurado.',
      );
    }

    const filename = sanitizeFilename(file.originalname || 'documento.pdf');
    const path = pendientesPath(filename);
    const bucket = this.storage.bucket(this.bucketName);
    const gcsFile = bucket.file(path);

    try {
      await gcsFile.save(file.buffer, {
        contentType: 'application/pdf',
        resumable: false,
        metadata: {
          cacheControl: 'private, max-age=0',
        },
      });
    } catch (error) {
      this.logger.error('Error subiendo PDF a GCS', error);
      throw new InternalServerErrorException(
        'No se pudo subir el documento al almacenamiento.',
      );
    }

    const url = `https://storage.googleapis.com/${this.bucketName}/${path}`;
    return { path, url, filename };
  }

  async moveToPublished(
    currentPath: string,
    macro: MacroTipoDocumento,
  ): Promise<{ path: string; url: string }> {
    const filename = currentPath.split('/').pop() || sanitizeFilename('documento.pdf');
    const destPath = publishedPath(macro, filename);
    const bucket = this.storage.bucket(this.bucketName);

    try {
      await bucket.file(currentPath).copy(bucket.file(destPath));
      await bucket.file(currentPath).delete({ ignoreNotFound: true });
    } catch (error) {
      this.logger.error(
        `Error moviendo ${currentPath} → ${destPath}`,
        error,
      );
      throw new InternalServerErrorException(
        'No se pudo mover el documento a la carpeta publicada.',
      );
    }

    const url = `https://storage.googleapis.com/${this.bucketName}/${destPath}`;
    return { path: destPath, url };
  }

  async getSignedUrl(path: string, expiresMinutes = 15): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(path)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresMinutes * 60 * 1000,
      });
    return url;
  }
}
