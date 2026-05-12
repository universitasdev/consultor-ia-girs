// src/tasks/tasks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EstadoCuenta } from '@prisma/client';

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

    // 1. Calcula la fecha límite (usuarios creados hace más de 10 minutos)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 2. Busca los usuarios que cumplen las condiciones
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        isEmailVerified: false, // No han verificado su correo
        createdAt: {
          lt: tenMinutesAgo, // Fueron creados antes de hace 10 minutos
        },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        tipoUsuario: true,
        createdAt: true,
      },
    });

    if (usersToDelete.length === 0) {
      return;
    }

    this.logger.warn(
      `Se encontraron ${usersToDelete.length} usuarios no verificados. Resguardando datos y eliminando...`,
    );

    // 3. Respaldar en AbandonedRegistration
    await this.prisma.abandonedRegistration.createMany({
      data: usersToDelete.map((user) => ({
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        telefono: user.telefono,
        tipoUsuario: user.tipoUsuario,
        registeredAt: user.createdAt,
      })),
      skipDuplicates: true,
    });

    // 4. Elimina los usuarios encontrados
    const deleteResult = await this.prisma.user.deleteMany({
      where: {
        id: {
          in: usersToDelete.map((user) => user.id),
        },
      },
    });

    this.logger.log(
      `Se eliminaron ${deleteResult.count} usuarios no verificados y se movieron a registros abandonados.`,
    );
  }

  // 👇 Alertas previas (48h) a pruebas casi caducadas (Todos los días a las 8:00 AM)
  @Cron('0 8 * * *')
  async handleTrialExpirationWarnings() {
    this.logger.log(
      'Iniciando tarea: Alertas de Vencimiento de Prueba Gratuita (8:00 AM)...',
    );

    // Buscamos usuarios cuyo vencimiento sea entre 48h y 24h a partir de ahora
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const usuariosARecordar = await this.prisma.user.findMany({
      where: {
        estadoCuenta: {
          in: [EstadoCuenta.PRUEBA_GRATUITA, EstadoCuenta.POR_RENOVAR],
        },
        fechaVencimientoAcceso: {
          gt: in24h,
          lte: in48h,
        },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        tipoUsuario: true,
      },
    });

    if (usuariosARecordar.length > 0) {
      this.logger.log(
        `Se enviarán aletas a ${usuariosARecordar.length} usuarios.`,
      );
      for (const user of usuariosARecordar) {
        await this.emailService.sendTrialEndingReminder(
          user.email,
          user.nombre,
          user.tipoUsuario || 'ASESOR_PRIVADO',
        );
      }
    }
  }

  // 👇 Bloqueo Masivo Silencioso (Todos los días a la 1:00 AM)
  @Cron('0 1 * * *')
  async handleTrialStatusTransitions() {
    this.logger.log(
      'Iniciando tarea: Transición de Estados y Bloqueo de Cuentas (1:00 AM)...',
    );

    const now = new Date();

    // 1. Encontrar todos los usuarios caducados que sigan en PRUEBA_GRATUITA o POR_RENOVAR
    const caducados = await this.prisma.user.findMany({
      where: {
        estadoCuenta: {
          in: [EstadoCuenta.PRUEBA_GRATUITA, EstadoCuenta.POR_RENOVAR],
        },
        fechaVencimientoAcceso: { lte: now },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        tipoUsuario: true,
      },
    });

    if (caducados.length === 0) return;

    this.logger.warn(`Transicionando ${caducados.length} cuentas caducadas...`);

    // 2. Procesamos 1 a 1 para enviar correo y asinar estatus dependiendo del tipo de usuario
    for (const user of caducados) {
      const nuevoEstado =
        user.tipoUsuario === 'SERVIDOR_PUBLICO'
          ? EstadoCuenta.SUSPENDIDO
          : EstadoCuenta.POR_PAGAR;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { estadoCuenta: nuevoEstado },
      });

      // Envía email definitivo de acceso expirado
      await this.emailService.sendAccessExpiredEmail(
        user.email,
        user.nombre,
        user.tipoUsuario || 'ASESOR_PRIVADO',
      );
    }

    this.logger.log('Transición de estados finalizada con éxito.');
  }
}
