// src/ai/ai.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly gatewayUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.gatewayUrl = this.configService.get<string>('AI_GATEWAY_URL', '');

    if (!this.gatewayUrl) {
      this.logger.warn(
        'AI_GATEWAY_URL no está configurada en las variables de entorno.',
      );
    }
  }

  async detectIntentText(text: string, sessionId: string): Promise<string> {
    if (!this.gatewayUrl) {
      return 'Lo siento, el servicio de inteligencia artificial no está configurado en el servidor.';
    }

    try {
      const response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Error en Gateway AI. Status: ${response.status} ${response.statusText}`,
        );
        return 'Lo siento, el servicio de inteligencia artificial no está disponible temporalmente.';
      }

      const data = (await response.json()) as { response?: string };
      return (
        data.response ||
        'No he podido entender eso. ¿Puedes decirlo de otra forma?'
      );
    } catch (error) {
      this.logger.error('Error al contactar con el Gateway AI:', error);
      return 'Lo siento, estoy teniendo problemas para conectarme al servicio de IA. Por favor, inténtalo más tarde.';
    }
  }

  // --- 👇 ESTE MÉTODO SOLUCIONA UNO DE LOS ERRORES ---
  async saveChatHistory(
    user: User,
    sessionId: string,
    userMessage: string,
    botResponse: string,
  ) {
    return this.prisma.chatHistory.create({
      data: {
        sessionId,
        userMessage,
        botResponse,
        user: { connect: { id: user.id } },
      },
    });
  }

  // --- 👇 ESTE MÉTODO SOLUCIONA EL OTRO ERROR ---
  generateSessionId(): string {
    return uuidv4();
  }

  // --- 👇 NUEVOS MÉTODOS PARA ADMINISTRADORES ---

  /**
   * Obtiene todos los usuarios que han usado el chatbot con estadísticas
   * @returns Lista de usuarios con datos de perfil, último mensaje y estadísticas
   */
  async getUsersWithChatActivity() {
    // Primera query: usuarios con datos de perfil
    const users = await this.prisma.user.findMany({
      where: {
        chatHistory: {
          some: {}, // Solo usuarios con al menos 1 mensaje
        },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        createdAt: true,
        profile: {
          select: {
            cargo: true,
            nombreEnte: true,
          },
        },
        _count: {
          select: {
            chatHistory: true, // Total de mensajes
          },
        },
      },
    });

    // Para cada usuario, obtener último mensaje y sesiones
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        // Obtener último mensaje
        const ultimoMensaje = await this.prisma.chatHistory.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: {
            userMessage: true,
            botResponse: true,
            createdAt: true,
          },
        });

        // Contar sesiones únicas
        const sesiones = await this.prisma.chatHistory.findMany({
          where: { userId: user.id },
          distinct: ['sessionId'],
          select: { sessionId: true },
        });

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          nombreCompleto: `${user.nombre} ${user.apellido || ''}`.trim(),
          telefono: user.telefono,
          cargo: user.profile?.cargo,
          institucion: user.profile?.nombreEnte,
          totalMensajes: user._count.chatHistory,
          totalSesiones: sesiones.length,
          ultimoMensaje: {
            texto:
              ultimoMensaje?.userMessage || ultimoMensaje?.botResponse || '',
            esDelUsuario: !!ultimoMensaje?.userMessage,
            timestamp: ultimoMensaje?.createdAt,
          },
          ultimaActividad: ultimoMensaje?.createdAt,
          createdAt: user.createdAt,
        };
      }),
    );

    // Ordenar por última actividad (más reciente primero)
    return usersWithDetails.sort((a, b) => {
      const dateA = a.ultimaActividad
        ? new Date(a.ultimaActividad).getTime()
        : 0;
      const dateB = b.ultimaActividad
        ? new Date(b.ultimaActividad).getTime()
        : 0;
      return dateB - dateA;
    });
  }

  /**
   * Obtiene todas las conversaciones de un usuario específico
   * @param userId ID del usuario
   * @returns Conversaciones completas agrupadas por fecha
   */
  async getAllUserConversations(userId: string) {
    // Obtener info completa del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        profile: {
          select: {
            cargo: true,
            nombreEnte: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener todos los mensajes y filtrar en memoria las sesiones eliminadas
    const rawHistory = await this.prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sessionId: true,
        userMessage: true,
        botResponse: true,
        createdAt: true,
        deletedByUser: true,
      },
    });

    // Filtrar sesiones marcadas como eliminadas (campo en DB)
    const chatHistory = rawHistory.filter((r) => !r.deletedByUser);

    // Convertir a formato plano para renderizado de chat
    const mensajesPlanos: any[] = [];

    chatHistory.forEach((registro) => {
      // Primero agregar mensaje del usuario
      mensajesPlanos.push({
        id: `${registro.id}-user`,
        tipo: 'usuario',
        contenido: registro.userMessage,
        timestamp: registro.createdAt,
        sessionId: registro.sessionId,
      });

      // Luego agregar respuesta del bot
      mensajesPlanos.push({
        id: `${registro.id}-bot`,
        tipo: 'bot',
        contenido: registro.botResponse,
        timestamp: new Date(new Date(registro.createdAt).getTime() + 1000), // +1 segundo
        sessionId: registro.sessionId,
      });
    });

    // Agrupar por fecha para separadores
    const agrupadoPorFecha: Record<string, any[]> = {};

    mensajesPlanos.forEach((msg) => {
      const fecha = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!agrupadoPorFecha[fecha]) {
        agrupadoPorFecha[fecha] = [];
      }

      agrupadoPorFecha[fecha].push({
        ...msg,
        hora: new Date(msg.timestamp).toLocaleTimeString('es-VE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      });
    });

    // Contar sesiones únicas
    const sesionesUnicas = [...new Set(chatHistory.map((ch) => ch.sessionId))];

    return {
      userId: user.id,
      userInfo: {
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        nombreCompleto: `${user.nombre} ${user.apellido || ''}`.trim(),
        telefono: user.telefono,
        cargo: user.profile?.cargo,
        institucion: user.profile?.nombreEnte,
      },
      totalMensajes: mensajesPlanos.length,
      totalSesiones: sesionesUnicas.length,
      conversacion: mensajesPlanos,
      agrupadoPorFecha,
    };
  }

  /**
   * Obtiene una conversación específica por sessionId
   * @param sessionId ID de la sesión
   * @param userId ID del usuario (para validación)
   * @returns Mensajes de la sesión específica
   */
  async getConversationBySession(sessionId: string, userId: string) {
    // Si el usuario eliminó esta sesión, verificar en DB
    const deletedCheck = await this.prisma.chatHistory.findFirst({
      where: { sessionId, userId, deletedByUser: true },
      select: { id: true },
    });
    if (deletedCheck) {
      return {
        sessionId,
        mensajes: [],
        error: 'Esta conversación fue eliminada.',
      };
    }

    const messages = await this.prisma.chatHistory.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userMessage: true,
        botResponse: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return {
        sessionId,
        mensajes: [],
        error: 'No se encontraron mensajes para esta sesión',
      };
    }

    return {
      sessionId,
      userId,
      totalMensajes: messages.length,
      mensajes: messages,
    };
  }

  /**
   * Borrado pasivo de una sesión completa por parte del usuario.
   * NO modifica la base de datos — usa un Map en memoria por userId.
   * El administrador conserva visibilidad total (consulta directo a la DB).
   *
   * @param sessionId - ID de la sesión a eliminar
   * @param userId    - ID del usuario autenticado (dueño de la sesión)
   */
  async softDeleteSession(
    sessionId: string,
    userId: string,
  ): Promise<{ message: string; sessionId: string }> {
    // 1. Verificar que existan mensajes de esa sesión pertenecientes al usuario
    const count = await this.prisma.chatHistory.count({
      where: { sessionId, userId },
    });

    if (count === 0) {
      throw new NotFoundException(
        `No se encontró ninguna conversación con sessionId "${sessionId}" para este usuario.`,
      );
    }

    // 2. Verificar que la sesión no haya sido eliminada ya
    const alreadyDeleted = await this.prisma.chatHistory.findFirst({
      where: { sessionId, userId, deletedByUser: true },
      select: { id: true },
    });

    if (alreadyDeleted) {
      throw new NotFoundException(
        `La conversación "${sessionId}" ya fue eliminada anteriormente.`,
      );
    }

    // 3. Marcar todos los registros de la sesión como eliminados en la DB
    const updated = await this.prisma.chatHistory.updateMany({
      where: { sessionId, userId },
      data: {
        deletedByUser: true,
        deletedAt: new Date(),
      },
    });

    this.logger.log(
      `Borrado pasivo (DB): sesión "${sessionId}" del usuario "${userId}" — ${updated.count} registros ocultados.`,
    );

    return {
      message: 'Conversación eliminada exitosamente.',
      sessionId,
    };
  }
}
