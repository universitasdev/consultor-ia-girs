// src/tasks/tasks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
// Cleaned imports

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // 👇 Tarea separada para limpieza frecuente (cada minuto)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronUserCleanup() {
    await this.handleCleanUnverifiedUsers();
  }

  private async handleCleanUnverifiedUsers() {
    this.logger.log(
      'Ejecutando tarea programada: Limpieza de usuarios no verificados...',
    );

    // 1. Calcula la fecha límite (usuarios creados hace más de 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 2. Busca los usuarios que cumplen las condiciones
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        isEmailVerified: false, // No han verificado su correo
        createdAt: {
          lt: fiveMinutesAgo, // Fueron creados antes de hace 5 minutos
        },
      },
      select: {
        id: true, // Solo necesitamos el ID para borrarlos
        email: true,
      },
    });

    if (usersToDelete.length === 0) {
      // this.logger.log('No se encontraron usuarios no verificados para eliminar.');
      return;
    }

    this.logger.warn(
      `Se encontraron ${usersToDelete.length} usuarios no verificados para eliminar.`,
    );

    // 3. Elimina los usuarios encontrados
    const deleteResult = await this.prisma.user.deleteMany({
      where: {
        id: {
          in: usersToDelete.map((user) => user.id), // Elimina por la lista de IDs
        },
      },
    });

    this.logger.log(
      `Se eliminaron ${deleteResult.count} usuarios no verificados.`,
    );
  }
}
