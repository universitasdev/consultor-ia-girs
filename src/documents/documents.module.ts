import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { GcsDocumentsService } from './gcs-documents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, GcsDocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
