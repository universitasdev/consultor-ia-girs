// src/users/users.controller.ts

import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  Post,
  Delete,
  HttpStatus, // Importa HttpStatus
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { DeleteAccountDto } from '../auth/dto/delete-account.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CompleteProfileDto } from '../auth/dto/complete-profile.dto';
@ApiTags('Usuarios') // Agrupa todos estos endpoints bajo la etiqueta "Usuarios"
@ApiBearerAuth() // Indica que todas las rutas aquí requieren autenticación Bearer (JWT)
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('my') // Se mapea a GET /users/my
  @ApiOperation({
    summary: 'Verificar sesión y obtener datos básicos del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Devuelve el email, nombre completo, rol y el estado de noticias/políticas sin leer.',
    schema: {
      example: {
        nombreCompleto: 'Juan Pérez',
        email: 'juan@example.com',
        role: 'USER',
        hasUnreadNews: true,
        latestNews: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Nuevas Políticas de Privacidad',
          content: 'Estimado usuario...',
          createdAt: '2024-05-13T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado.',
  })
  async getMyProfile(@GetUser() user: User) {
    // El decorador @GetUser inyecta el usuario validado desde el token

    // Buscar si hay noticias sin leer (usando el campo del User model)
    const newsStatus = await this.usersService.getLatestUnreadNews(
      user.lastReadNewsAt,
    );

    return {
      nombreCompleto: `${user.nombre} ${user.apellido || ''}`.trim(),
      email: user.email,
      role: user.role, // Es útil devolver el rol
      hasUnreadNews: newsStatus.hasUnreadNews,
      latestNews: newsStatus.latestNews,
    };
  }
  @Get('profile')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Devuelve los datos del perfil del usuario.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado.',
  })
  async getProfile(@GetUser() user: User) {
    const userWithProfile = await this.usersService.findOneById(user.id);

    if (!userWithProfile) return null;

    const {
      password: _,
      profile,
      tipoUsuario,
      estadoCuenta,
      fechaVencimientoAcceso,
      ...userData
    } = userWithProfile;

    let alertaVencimiento: { mensaje: string; diasRestantes: number } | null =
      null;
    let diasRestantesGlobal: number | null = null;

    if (fechaVencimientoAcceso) {
      const hoy = new Date();
      const vencimiento = new Date(fechaVencimientoAcceso);
      const diferenciaDias = Math.ceil(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );

      diasRestantesGlobal = diferenciaDias < 0 ? 0 : diferenciaDias;

      // Alerta Prioritaria (2 días o menos) aplica también a SUSCRITO
      if (
        (estadoCuenta === 'PRUEBA_GRATUITA' ||
          estadoCuenta === 'POR_RENOVAR' ||
          estadoCuenta === 'SUSCRITO') &&
        diferenciaDias <= 2
      ) {
        if (estadoCuenta === 'SUSCRITO') {
          alertaVencimiento = {
            mensaje:
              diferenciaDias < 0
                ? 'Tu suscripción ha expirado. Por favor, regulariza tu cuenta.'
                : `Tu suscripción finaliza en ${diferenciaDias} día(s).`,
            diasRestantes: diferenciaDias,
          };
        } else {
          alertaVencimiento = {
            mensaje:
              diferenciaDias < 0
                ? 'Tu acceso ha expirado. Por favor, regulariza tu cuenta.'
                : `Tu comprobación finaliza en ${diferenciaDias} día(s).`,
            diasRestantes: diferenciaDias,
          };
        }
      }
    }

    return {
      ...userData,
      estadoCuenta,
      fechaVencimientoAcceso,
      diasRestantes: diasRestantesGlobal,
      alertaVencimiento,
      tipo_usuario: tipoUsuario,
      nombre_ente: profile?.nombreEnte || null,
      cargo: profile?.cargo || null,
      estatus_normativa_girs: profile?.estatusNormativaGirs || null,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar el perfil del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil actualizado exitosamente.',
  })
  updateProfile(@GetUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Post('password/change')
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contraseña actualizada exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'La contraseña actual es incorrecta.',
  })
  changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Post('accept-news')
  @ApiOperation({ summary: 'Marcar las noticias como leídas / aceptadas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Noticias marcadas como leídas exitosamente.',
    schema: {
      example: {
        message: 'Noticias marcadas como leídas exitosamente.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado.',
  })
  acceptNews(@GetUser() user: User) {
    return this.usersService.acceptNews(user.id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Eliminar la cuenta del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'La cuenta ha sido eliminada permanentemente.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'La contraseña es incorrecta.',
  })
  deleteAccount(
    @GetUser() user: User,
    @Body() deleteAccountDto: DeleteAccountDto,
  ) {
    return this.usersService.delete(user.id, deleteAccountDto);
  }
  @Post('complete-profile')
  @ApiOperation({
    summary: 'Completar el perfil inicial del usuario (institución, cargo)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Perfil inicial completado exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El perfil inicial ya ha sido completado.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado.',
  })
  completeProfile(
    @GetUser() user: User,
    @Body() completeProfileDto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(user.id, completeProfileDto);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Eliminar usuario por ID (Admin, Eliminación Pasiva)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El usuario ha sido desactivado exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado. Se requiere rol ADMIN.',
  })
  softDeleteUser(@Param('id') id: string) {
    return this.usersService.softDeleteByAdmin(id);
  }
}
