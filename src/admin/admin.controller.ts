// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// --- ¡IMPORTA EL DTO DESDE SU ARCHIVO! ---
import { UpdateUserRoleDto } from './dto/update-role.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { BulkDeleteUsersDto } from './dto/bulk-delete.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== GESTIÓN DE USUARIOS ====================

  @Get('users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar usuarios con paginación y búsqueda por email',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios recuperada.' })
  findAllUsers(@Query() query: GetUsersQueryDto) {
    return this.adminService.findAllUsers(query);
  }

  @Patch('users/:id/toggle-active')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar/desactivar un usuario' })
  @ApiResponse({ status: 200, description: 'Estado del usuario cambiado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  toggleUserActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Delete('users/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Eliminar usuario pasivamente (soft delete, libera email, no permite eliminar admins)',
  })
  @ApiResponse({ status: 200, description: 'Usuario eliminado pasivamente.' })
  @ApiResponse({ status: 403, description: 'No puedes eliminar a un admin.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  softDeleteUser(@Param('id') id: string) {
    return this.adminService.softDeleteUser(id);
  }

  @Get('users/:id/conversations')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ver historial de chats de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Conversaciones del usuario recuperadas.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  getUserConversations(@Param('id') id: string) {
    return this.adminService.getUserConversations(id);
  }

  // ==================== ROLES ====================

  @Patch('users/role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar el rol de un usuario (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Rol actualizado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (No eres Admin).' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  updateUserRole(@Body() updateUserRoleDto: UpdateUserRoleDto) {
    const { userId, newRole } = updateUserRoleDto;
    return this.adminService.updateUserRole(userId, newRole);
  }

  @Patch('users/:id/upgrade-to-pro')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ascender un usuario a PRO (Gratis -> Pro)' })
  @ApiResponse({
    status: 200,
    description: 'Usuario ascendido a PRO exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  upgradeToPro(@Param('id') id: string) {
    return this.adminService.upgradeUserToPro(id);
  }

  // ==================== MÉTRICAS ====================

  @Get('metrics/dashboard')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Métricas consolidadas de usuarios y chats (Dashboard)',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas del dashboard recuperadas.',
  })
  getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  // ==================== ELIMINACIÓN MASIVA ====================

  @Post('users/bulk-delete')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar (desactivar) masivamente usuarios por su ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuarios desactivados correctamente.',
  })
  bulkDeleteUsers(@Body() bulkDeleteUsersDto: BulkDeleteUsersDto) {
    return this.adminService.bulkDeleteUsers(bulkDeleteUsersDto.userIds);
  }

  // ==================== DETALLE ====================

  @Get('users/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalles completos de un usuario (Solo Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles del usuario recuperados exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  findOneUser(@Param('id') id: string) {
    return this.adminService.findOneUser(id);
  }
}
