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
import { GetUser } from '../auth/decorators/get-user.decorator';
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
import { UpdateEstadoCuentaDto } from './dto/update-estado-cuenta.dto';
import { DashboardMetricsResponseDto } from './dto/dashboard-metrics-response.dto';
import { CreateCrmNoteDto } from './dto/create-crm-note.dto';
import { UpdateCrmNoteDto } from './dto/update-crm-note.dto';

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

  @Patch('users/:id/estado-cuenta')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar manualmente el estado de la cuenta' })
  @ApiResponse({ status: 200, description: 'Estado actualizado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  updateEstadoCuenta(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoCuentaDto,
  ) {
    return this.adminService.updateEstadoCuenta(id, dto);
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
    type: DashboardMetricsResponseDto,
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
    summary:
      'Obtener detalles completos de un usuario, incluye notas CRM (Solo Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles del usuario recuperados exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  findOneUser(@Param('id') id: string) {
    return this.adminService.findOneUser(id);
  }

  // ==================== CRM: NOTAS Y ETIQUETAS ====================

  @Post('users/:id/crm-notes')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nota CRM con etiqueta para un usuario',
    description:
      'El admin puede dejar un comentario y asignar una etiqueta de seguimiento ' +
      '(ej: POR_CONTACTAR, CONTACTADO, PAGO_REALIZADO, POR_ENVIAR_DOC, etc). ' +
      'La identidad del admin se toma automáticamente del token JWT.',
  })
  @ApiResponse({ status: 201, description: 'Nota CRM creada.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  createCrmNote(
    @Param('id') userId: string,
    @Body() dto: CreateCrmNoteDto,
    @GetUser() admin: { id: string; nombre: string },
  ) {
    return this.adminService.createCrmNote(admin.id, admin.nombre, userId, dto);
  }

  @Get('users/:id/crm-notes')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas las notas CRM de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Notas CRM del usuario recuperadas.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  getCrmNotes(@Param('id') userId: string) {
    return this.adminService.getCrmNotes(userId);
  }

  @Patch('crm-notes/:noteId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Editar el contenido y/o etiqueta de una nota CRM' })
  @ApiResponse({ status: 200, description: 'Nota CRM actualizada.' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada.' })
  updateCrmNote(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateCrmNoteDto,
  ) {
    return this.adminService.updateCrmNote(noteId, dto);
  }

  @Delete('crm-notes/:noteId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una nota CRM' })
  @ApiResponse({ status: 200, description: 'Nota CRM eliminada.' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada.' })
  deleteCrmNote(@Param('noteId') noteId: string) {
    return this.adminService.deleteCrmNote(noteId);
  }

  @Get('crm-notes/all')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar TODAS las notas CRM del sistema (Global)',
    description:
      'Devuelve un historial cronológico de todas las etiquetas y comentarios dejados por admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista global de notas recuperada.',
  })
  getAllCrmNotes() {
    return this.adminService.getAllCrmNotes();
  }

  @Get('users/notifications/expiring-private')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar Asesores Privados próximos a vencer (7 días)',
    description:
      'Filtra usuarios de tipo ASESOR_PRIVADO que están a menos de 7 días de vencimiento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vencimientos recuperada.',
  })
  getExpiringPrivateAdvisors() {
    return this.adminService.getExpiringPrivateAdvisors();
  }

  @Patch('users/:id/convert-to-private-trial')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convertir usuario a Asesor Privado con 7 días de prueba',
    description:
      'Cambia el tipo a ASESOR_PRIVADO, el estado a PRUEBA_GRATUITA y asigna 7 días de acceso desde hoy.',
  })
  @ApiResponse({ status: 200, description: 'Usuario convertido exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  convertToPrivateTrial(@Param('id') id: string) {
    return this.adminService.convertToPrivateTrial(id);
  }
}
