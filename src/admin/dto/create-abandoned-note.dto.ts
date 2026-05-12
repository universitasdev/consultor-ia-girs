// src/admin/dto/create-abandoned-note.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAbandonedNoteDto {
  @ApiProperty({
    description:
      'Comentario del administrador sobre el seguimiento al registro abandonado',
    example:
      'Se contactó por WhatsApp, dice que no recibió el correo original.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
