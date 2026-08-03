// src/ai/ai.service.spec.ts

import { Injectable, Logger } from '@nestjs/common';
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
    this.gatewayUrl = this.configService.get<string>('AI_GATEWAY_URL') || '';

    if (!this.gatewayUrl) {
      this.logger.warn(
        'AI_GATEWAY_URL no está configurado. El chatbot no podrá responder.',
      );
    }
  }

  /**
   * Envía un mensaje al Gateway AI y devuelve la respuesta del agente.
   */
  async detectIntentText(text: string, sessionId: string): Promise<string> {
    if (!this.gatewayUrl) {
      return 'El servicio de IA no está configurado en este momento.';
    }

    try {
      const response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Error del Gateway AI: ${response.status} ${response.statusText}`,
        );
        return 'Lo siento, estoy teniendo problemas para conectarme. Por favor, inténtalo más tarde.';
      }

      const data = await response.json();

      const botResponse =
        data.response || data.reply || data.message || data.text || '';

      return (
        botResponse ||
        'No he podido entender eso. ¿Puedes decirlo de otra forma?'
      );
    } catch (error) {
      this.logger.error('Error al contactar con el Gateway AI:', error);
      return 'Lo siento, estoy teniendo problemas para conectarme. Por favor, inténtalo más tarde.';
    }
  }

  /**
   * Guarda un intercambio del chat en la base de datos.
   */
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
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  /**
   * Genera un nuevo ID de sesión.
   */
  generateSessionId(): string {
    return uuidv4();
  }
}
