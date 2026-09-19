import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminStaffController } from './admin-staff.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [AdminController, AdminStaffController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
