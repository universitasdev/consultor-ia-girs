// src/ai/dto/send-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Mensaje que el usuario envía al chatbot.',
    example: 'Hola, necesito ayuda.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    required: false,
    description:
      'ID de la sesión de chat para mantener el contexto de la conversación.',
    example: '3f8e91a2-b4c5-4d6e-8f0a-1c2b3d4e5f6a',
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  sessionId?: string;
}
