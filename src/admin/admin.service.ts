// src/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // <-- 1. Importa Prisma
import { UserRole, Prisma, TipoUsuario } from '@prisma/client';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UpdateEstadoCuentaDto } from './dto/update-estado-cuenta.dto';
import { CreateCrmNoteDto } from './dto/create-crm-note.dto';
import { UpdateCrmNoteDto } from './dto/update-crm-note.dto';
import { GetCrmNotesQueryDto } from './dto/get-crm-notes-query.dto';

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
      estadoCuenta,
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

    if (estadoCuenta) {
      where.estadoCuenta = estadoCuenta;
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
          estadoCuenta: true,
          fechaVencimientoAcceso: true,
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
        profile: true,
        crmNotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    // Calcular días restantes si tiene fecha de vencimiento
    let diasRestantes: number | null = null;
    if (user.fechaVencimientoAcceso) {
      const now = new Date();
      const remainingTime =
        user.fechaVencimientoAcceso.getTime() - now.getTime();
      diasRestantes = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    }

    // Quitamos la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      ...result,
      diasRestantes:
        diasRestantes !== null ? (diasRestantes < 0 ? 0 : diasRestantes) : null,
      isExpired: diasRestantes !== null && diasRestantes <= 0,
    };
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
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        estadoCuenta: true,
      },
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
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prev14Days = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const prev21Days = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const prev28Days = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
      usersByEstadoCuenta,
      totalServidoresPublicos,
      totalAsesoresPrivados,
      totalSuscritosActivos,
      suspensionesRecientes,
      usuariosHoy,
      usuariosSemanaActual,
      usuariosSemanaAnterior,
      usuariosMesActual,
      usuariosMesAnterior,
      // Datos para gráfico de barras (últimas 5 semanas)
      semana1,
      semana2,
      semana3,
      semana4,
      semana5,
      usuariosNoVerificados,
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
          tipoUsuario: true,
          estadoCuenta: true,
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
      this.prisma.user.groupBy({
        by: ['estadoCuenta'],
        _count: { estadoCuenta: true },
      }),
      this.prisma.user.count({ where: { tipoUsuario: 'SERVIDOR_PUBLICO' } }),
      this.prisma.user.count({ where: { tipoUsuario: 'ASESOR_PRIVADO' } }),
      this.prisma.user.count({
        where: { estadoCuenta: 'SUSCRITO', isActive: true },
      }),
      this.prisma.user.count({
        where: { estadoCuenta: 'SUSPENDIDO', updatedAt: { gte: last30Days } },
      }),
      // Comparativa
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev7Days, lt: last7Days } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev30Days, lt: last30Days } },
      }),
      // Semanas para gráfico
      this.prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev7Days, lt: last7Days } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev14Days, lt: prev7Days } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev21Days, lt: prev14Days } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: prev28Days, lt: prev21Days } },
      }),
      this.prisma.user.count({ where: { isEmailVerified: false } }),
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
        byEstadoCuenta: usersByEstadoCuenta.map((e) => ({
          estado: e.estadoCuenta,
          count: e._count.estadoCuenta,
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

      // Nueva sección de analíticas
      analytics: {
        porTipousuario: {
          servidoresPublicos: totalServidoresPublicos,
          asesoresPrivados: totalAsesoresPrivados,
        },
        cuentasSuscritasActivas: totalSuscritosActivos,
        suspensionesRecientes: suspensionesRecientes,
        crecimientoHoy: usuariosHoy,
        usuariosNoVerificados,
        comparativa: {
          semanal: {
            actual: usuariosSemanaActual,
            anterior: usuariosSemanaAnterior,
          },
          mensual: {
            actual: usuariosMesActual,
            anterior: usuariosMesAnterior,
          },
        },
        graficoCrecimiento: [
          { etiqueta: 'Semana 1', cantidad: semana1 },
          { etiqueta: 'Semana 2', cantidad: semana2 },
          { etiqueta: 'Semana 3', cantidad: semana3 },
          { etiqueta: 'Semana 4', cantidad: semana4 },
          { etiqueta: 'Semana 5', cantidad: semana5 },
        ].reverse(), // Invertir para que la última semana sea la más reciente a la derecha
      },
    };
  }

  // ==================== CRM: NOTAS Y ETIQUETAS ====================

  /**
   * 12. Crear una nota CRM con etiqueta opcional para un usuario.
   * El adminId y adminNombre se obtienen del token JWT del administrador.
   */
  async createCrmNote(
    adminId: string,
    adminNombre: string,
    userId: string,
    dto: CreateCrmNoteDto,
  ) {
    // Verificar que el usuario destinatario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const note = await this.prisma.crmNote.create({
      data: {
        content: dto.content,
        etiqueta: dto.etiqueta ?? null,
        adminId,
        adminNombre,
        userId,
      },
    });

    return {
      message: 'Nota CRM creada exitosamente.',
      note,
    };
  }

  /**
   * 13. Listar las notas CRM de un usuario con paginación y filtros.
   */
  async getCrmNotes(userId: string, query: GetCrmNotesQueryDto) {
    const { page = 1, limit = 10, etiqueta } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        tipoUsuario: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const where: Prisma.CrmNoteWhereInput = { userId };
    if (etiqueta) {
      where.etiqueta = etiqueta;
    }

    const [totalItems, notes] = await Promise.all([
      this.prisma.crmNote.count({ where }),
      this.prisma.crmNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      usuario: user,
      data: notes,
      meta: {
        totalItems,
        itemCount: notes.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * 14. Editar el contenido y/o la etiqueta de una nota CRM existente.
   */
  async updateCrmNote(noteId: string, dto: UpdateCrmNoteDto) {
    const note = await this.prisma.crmNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException(`Nota CRM con ID ${noteId} no encontrada.`);
    }

    if (!dto.content && dto.etiqueta === undefined) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar (content o etiqueta).',
      );
    }

    const updatedNote = await this.prisma.crmNote.update({
      where: { id: noteId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.etiqueta !== undefined && { etiqueta: dto.etiqueta }),
      },
    });

    return {
      message: 'Nota CRM actualizada exitosamente.',
      note: updatedNote,
    };
  }

  /**
   * 15. Eliminar una nota CRM.
   */
  async deleteCrmNote(noteId: string) {
    const note = await this.prisma.crmNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException(`Nota CRM con ID ${noteId} no encontrada.`);
    }

    await this.prisma.crmNote.delete({ where: { id: noteId } });

    return { message: 'Nota CRM eliminada exitosamente.' };
  }

  /**
   * 16. Listar TODAS las notas CRM del sistema (Global) con paginación y filtros.
   */
  async getAllCrmNotes(query: GetCrmNotesQueryDto) {
    const { page = 1, limit = 10, etiqueta } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CrmNoteWhereInput = {};
    if (etiqueta) {
      where.etiqueta = etiqueta;
    }

    const [totalItems, notes] = await Promise.all([
      this.prisma.crmNote.count({ where }),
      this.prisma.crmNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
              tipoUsuario: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: notes,
      meta: {
        totalItems,
        itemCount: notes.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * 17. Usuarios Asesores Privados con vencimiento próximo (7 días o menos).
   */
  async getExpiringPrivateAdvisors() {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + 7); // 7 días desde hoy

    const users = await this.prisma.user.findMany({
      where: {
        tipoUsuario: 'ASESOR_PRIVADO',
        fechaVencimientoAcceso: {
          not: null,
          lte: threshold,
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Incluimos los que vencieron hoy mismo
        },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        estadoCuenta: true,
        fechaVencimientoAcceso: true,
      },
      orderBy: {
        fechaVencimientoAcceso: 'asc',
      },
    });

    const result = users.map((user) => {
      const remainingTime =
        user.fechaVencimientoAcceso!.getTime() - now.getTime();
      const diasRestantes = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
      return {
        ...user,
        diasRestantes: diasRestantes < 0 ? 0 : diasRestantes,
      };
    });

    return {
      total: result.length,
      threshold: '7 días',
      data: result,
    };
  }

  /**
   * 18. Convertir un usuario a Asesor Privado con 7 días de prueba gratis.
   * Se usa cuando un usuario público o nuevo debe iniciar un ciclo de asesoría privada.
   */
  async convertToPrivateTrial(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 7); // 7 días de prueba desde ahora

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        tipoUsuario: 'ASESOR_PRIVADO',
        estadoCuenta: 'PRUEBA_GRATUITA',
        fechaVencimientoAcceso: expiresAt,
      },
      select: {
        id: true,
        email: true,
        tipoUsuario: true,
        estadoCuenta: true,
        fechaVencimientoAcceso: true,
      },
    });

    return {
      message:
        'Usuario convertido a Asesor Privado con 7 días de prueba gratis.',
      user: updatedUser,
    };
  }

  /**
   * 21. Convertir un usuario a Servidor Público con estado ACTIVO.
   * Restablece al usuario al modo público estándar sin límite de tiempo.
   */
  async convertToPublic(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        tipoUsuario: 'SERVIDOR_PUBLICO',
        estadoCuenta: 'ACTIVO',
        fechaVencimientoAcceso: null, // Los públicos no tienen vencimiento de prueba de 7 días
      },
      select: {
        id: true,
        email: true,
        tipoUsuario: true,
        estadoCuenta: true,
        fechaVencimientoAcceso: true,
      },
    });

    return {
      message: 'Usuario convertido a Servidor Público Activo.',
      user: updatedUser,
    };
  }

  /**
   * 19. REPORTE: Ver estado de pruebas de TODOS los asesores privados.
   * Muestra cuántos días les quedan a cada uno.
   */
  async getPrivateAdvisorsTrialStatus() {
    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: {
        tipoUsuario: 'ASESOR_PRIVADO',
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        estadoCuenta: true,
        fechaVencimientoAcceso: true,
      },
      orderBy: {
        fechaVencimientoAcceso: 'asc',
      },
    });

    const data = users.map((user) => {
      let diasRestantes: number | null = null;
      if (user.fechaVencimientoAcceso) {
        const remainingTime =
          user.fechaVencimientoAcceso.getTime() - now.getTime();
        diasRestantes = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...user,
        diasRestantes:
          diasRestantes !== null
            ? diasRestantes < 0
              ? 0
              : diasRestantes
            : null,
        isExpired: diasRestantes !== null && diasRestantes <= 0,
      };
    });

    return {
      total: data.length,
      data,
    };
  }

  /**
   * 20. Ver estado de prueba de UN usuario específico por su ID.
   */
  async getUserTrialStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        tipoUsuario: true,
        fechaVencimientoAcceso: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    const now = new Date();
    let diasRestantes: number | null = null;
    if (user.fechaVencimientoAcceso) {
      const remainingTime =
        user.fechaVencimientoAcceso.getTime() - now.getTime();
      diasRestantes = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    }

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      tipoUsuario: user.tipoUsuario,
      fechaVencimientoAcceso: user.fechaVencimientoAcceso,
      diasRestantes:
        diasRestantes !== null ? (diasRestantes < 0 ? 0 : diasRestantes) : null,
      isExpired: diasRestantes !== null && diasRestantes <= 0,
    };
  }
}
