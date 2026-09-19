// src/auth/dto/forgot-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { NormalizeEmail } from './normalize-email';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
