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
import { GetCrmNotesQueryDto } from './dto/get-crm-notes-query.dto';
import { GetChatQueryDto } from './dto/get-chat-query.dto';

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
  @ApiOperation({
    summary: 'Ver historial de chats de un usuario (paginado por sesiones)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversaciones del usuario recuperadas.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  getUserConversations(
    @Param('id') id: string,
    @Query() query: GetChatQueryDto,
  ) {
    return this.adminService.getUserConversations(id, query);
  }

  @Get('chat-users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar usuarios que han utilizado el chatbot',
    description:
      'Devuelve paginada una lista de usuarios que poseen historial en el chatbot, incluyendo total de sesiones/mensajes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente.',
  })
  getChatbotUsers(@Query() query: GetChatQueryDto) {
    return this.adminService.getChatbotUsers(query);
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
  @ApiOperation({
    summary: 'Listar notas CRM de un usuario con paginación y filtros',
    description:
      'Permite ver los comentarios de un usuario específico usando página, límite y filtro por etiqueta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notas CRM del usuario recuperadas.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  getCrmNotes(
    @Param('id') userId: string,
    @Query() query: GetCrmNotesQueryDto,
  ) {
    return this.adminService.getCrmNotes(userId, query);
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
    summary:
      'Listar TODAS las notas CRM con paginación y filtro por etiqueta (Global)',
    description:
      'Devuelve un historial cronológico con soporte para página, límite y filtrado por etiqueta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista global de notas recuperada con metadatos.',
  })
  getAllCrmNotes(@Query() query: GetCrmNotesQueryDto) {
    return this.adminService.getAllCrmNotes(query);
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

  @Get('users/notifications/private-trial-status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reporte: Estado de prueba de TODOS los asesores privados',
    description:
      'Muestra a cada usuario de tipo privado con sus días restantes de prueba calculados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de estados generado exitosamente.',
  })
  getPrivateAdvisorsTrialStatus() {
    return this.adminService.getPrivateAdvisorsTrialStatus();
  }

  @Get('users/:id/trial-status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Estado de prueba de un usuario específico',
    description:
      'Obtiene los días restantes de prueba para un usuario por su ID.',
  })
  @ApiResponse({ status: 200, description: 'Estado de prueba recuperado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  getUserTrialStatus(@Param('id') id: string) {
    return this.adminService.getUserTrialStatus(id);
  }

  @Patch('users/:id/convert-to-public')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convertir usuario a Servidor Público Activo',
    description:
      'Cambia el tipo a SERVIDOR_PUBLICO, el estado a ACTIVO y elimina la fecha de vencimiento.',
  })
  @ApiResponse({ status: 200, description: 'Usuario convertido exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  convertToPublic(@Param('id') id: string) {
    return this.adminService.convertToPublic(id);
  }

  @Patch('users/:id/add-subscription')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Añadir 30 días de suscripción a un usuario',
    description:
      'Añade 30 días al tiempo restante del usuario (o desde hoy si ya expiró) y cambia su estado a SUSCRITO.',
  })
  @ApiResponse({ status: 200, description: 'Suscripción extendida.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  addSubscriptionTime(@Param('id') id: string) {
    return this.adminService.addSubscriptionTime(id);
  }

  @Patch('users/:id/subtract-subscription')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restar 30 días de suscripción a un usuario',
    description:
      'Resta 30 días de la fecha de vencimiento configurada para el usuario (usado para revertir errores).',
  })
  @ApiResponse({ status: 200, description: 'Suscripción reducida.' })
  @ApiResponse({
    status: 400,
    description: 'El usuario no tiene fecha de vencimiento.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  subtractSubscriptionTime(@Param('id') id: string) {
    return this.adminService.subtractSubscriptionTime(id);
  }
}
