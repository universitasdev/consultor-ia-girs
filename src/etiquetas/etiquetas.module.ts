import { Module } from '@nestjs/common';
import { EtiquetasController } from './etiquetas.controller';
import { EtiquetasService } from './etiquetas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EtiquetasController],
  providers: [EtiquetasService],
  exports: [EtiquetasService],
})
export class EtiquetasModule {}
