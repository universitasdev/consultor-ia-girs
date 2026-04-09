// src/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // <-- 1. Importa Prisma
import { UserRole, Prisma, TipoUsuario } from '@prisma/client';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UpdateEstadoCuentaDto } from './dto/update-estado-cuenta.dto';

@Injectable()
export class AdminService {
  // 2. Inyecta Prisma
  constructor(private prisma: PrismaService) {}

  // 3. Añade la lógica para cambiar el rol
  async updateUserRole(userId: string, newRole: UserRole) {
    // Verifica que el usuario exista
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    // Actualiza el rol del usuario
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Quitamos la contraseña antes de devolver
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser;
    return result;
  }

  // 4. Método específico para ascender a PRO
  async upgradeUserToPro(userId: string) {
    return this.updateUserRole(userId, UserRole.PAID_USER);
  }

  // 5. Método para listar todos los usuarios
  // 5. Método para listar todos los usuarios (con paginación y filtros)
  async findAllUsers(query: GetUsersQueryDto) {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      isActive,
      estado,
      municipio,
      tipoUsuario,
    } = query;
    const skip = (page - 1) * limit;

    // Construir el filtro dinámicamente
    const where: Prisma.UserWhereInput = {
      role: {
        not: UserRole.ADMIN,
      },
    };

    // Si se envía isActive, filtrar por estado de cuenta; si no, mostrar todos
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (role) {
      where.role = role;
    }

    if (estado) {
      where.estado = { contains: estado, mode: 'insensitive' };
    }

    if (municipio) {
      where.municipio = { contains: municipio, mode: 'insensitive' };
    }

    if (tipoUsuario) {
      where.tipoUsuario = tipoUsuario as TipoUsuario;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Ejecutar dos consultas: una para el conteo total y otra para los datos
    const [totalItems, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          role: true,
          telefono: true,
          estado: true,
          municipio: true,
          tipoUsuario: true,
          isEmailVerified: true,
          isActive: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
          // Excluimos password explícitamente al no seleccionarlo
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: users,
      meta: {
        totalItems,
        itemCount: users.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  // 6. Método para ver detalle completo de un usuario
  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true, // Incluimos el perfil para ver todos los detalles
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    // Quitamos la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // 7. Método de eliminación masiva (Soft Delete)
  async bulkDeleteUsers(userIds: string[]) {
    // Actualizamos 'isActive: false' para todos los IDs de la lista
    const result = await this.prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Proceso de eliminación masiva completado.',
      totalRequested: userIds.length,
      affectedCount: result.count,
    };
  }

  // 8. Toggle activar/desactivar usuario
  async toggleUserActive(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
        isActive: true,
      },
    });

    return {
      message: updatedUser.isActive
        ? 'Usuario activado exitosamente.'
        : 'Usuario desactivado exitosamente.',
      user: updatedUser,
    };
  }

  // 8.5 Actualizar Estado de Cuenta manualmente
  async updateEstadoCuenta(id: string, dto: UpdateEstadoCuentaDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
      estadoCuenta: dto.estadoCuenta,
    };

    if (dto.fechaVencimientoAcceso) {
      dataToUpdate.fechaVencimientoAcceso = new Date(
        dto.fechaVencimientoAcceso,
      );
    } // Nota: Si envían explícitamente null en el DTO, se podría procesar, pero por ahora lo dejamos simple.

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        estadoCuenta: true,
        fechaVencimientoAcceso: true,
      },
    });

    return {
      message: 'Estado de cuenta actualizado manualmente.',
      user: updatedUser,
    };
  }

  // 9. Soft delete individual (libera email, no permite eliminar admins)
  async softDeleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('No puedes eliminar a otro administrador.');
    }

    // Liberar el email para futuros registros añadiendo sufijo _deleted_
    const deletedEmail = `${user.email}_deleted_${Date.now()}`;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: deletedEmail,
        hashedRefreshToken: null,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        isActive: true,
      },
    });

    return {
      message: 'Usuario eliminado pasivamente. El email ha sido liberado.',
      user: updatedUser,
    };
  }

  // 10. Ver historial de conversaciones de un usuario
  async getUserConversations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nombre: true, apellido: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const messages = await this.prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        userMessage: true,
        botResponse: true,
        createdAt: true,
      },
    });

    // Contar sesiones únicas
    const uniqueSessions = [...new Set(messages.map((m) => m.sessionId))];

    return {
      user,
      totalMessages: messages.length,
      totalSessions: uniqueSessions.length,
      messages,
    };
  }

  // 11. Métricas del dashboard
  async getDashboardMetrics() {
    const umbral48Horas = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      adminCount,
      usersByRole,
      totalChatMessages,
      totalChatSessions,
      recentUsers,
      usuariosPorVencer,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.chatHistory.count(),
      this.prisma.chatHistory.findMany({
        distinct: ['sessionId'],
        select: { sessionId: true },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          estadoCuenta: 'PRUEBA_GRATUITA',
          fechaVencimientoAcceso: {
            lte: umbral48Horas,
          },
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          tipoUsuario: true,
          fechaVencimientoAcceso: true,
        },
        orderBy: { fechaVencimientoAcceso: 'asc' },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        verified: verifiedUsers,
        admins: adminCount,
        byRole: usersByRole.map((r) => ({
          role: r.role,
          count: r._count.role,
        })),
      },
      chat: {
        totalMessages: totalChatMessages,
        totalSessions: totalChatSessions.length,
      },
      alertas: {
        proximosAVencer: usuariosPorVencer,
        cantidadVencimientos: usuariosPorVencer.length,
      },
      recentUsers,
    };
  }
}
