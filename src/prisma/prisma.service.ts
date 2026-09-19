// src/prisma/prisma.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión a base de datos establecida.');
    } catch (error) {
      this.logger.error(
        'No se pudo conectar a la base de datos. La API arrancará, pero los endpoints que usen Prisma fallarán hasta que DATABASE_URL sea alcanzable.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
