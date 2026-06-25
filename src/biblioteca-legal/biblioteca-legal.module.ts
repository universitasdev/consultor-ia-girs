// src/biblioteca-legal/biblioteca-legal.module.ts
import { Module } from '@nestjs/common';
import { BibliotecaLegalService } from './biblioteca-legal.service';
import { BibliotecaLegalController } from './biblioteca-legal.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // Provee JwtStrategy, PassportModule y AuthService para los guards
  ],
  controllers: [BibliotecaLegalController],
  providers: [BibliotecaLegalService],
})
export class BibliotecaLegalModule {}
