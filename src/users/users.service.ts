// src/users/users.service.ts
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { DeleteAccountDto } from '../auth/dto/delete-account.dto'; // Importa el nuevo DTO
import { CompleteProfileDto } from '../auth/dto/complete-profile.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Llama a Prisma para actualizar el usuario en la base de datos
    const updatedUser = await this.prisma.user.update({
      where: { id: id }, // Busca al usuario por su ID
      data: updateUserDto, // Aplica los nuevos datos del DTO
    });

    // Usa el método estático para devolver el usuario actualizado sin la contraseña
    return JwtStrategy.excludePassword(updatedUser);
  }
  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({ where: { id } });

    // --- 👇 AÑADE ESTA COMPROBACIÓN AQUÍ ---
    if (!user) {
      // Esto no debería pasar si el usuario está autenticado,
      // pero es una buena práctica de seguridad manejarlo.
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    // -----------------------------------------

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password, // Ahora TypeScript sabe que 'user' no es null aquí
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Contraseña actualizada exitosamente.' };
  }
  async delete(id: string, deleteAccountDto: DeleteAccountDto) {
    const { password } = deleteAccountDto;

    // 1. Busca al usuario completo para obtener su contraseña hasheada
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      // Esto es una salvaguarda, no debería ocurrir si el token es válido
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // 2. Compara la contraseña proporcionada con la de la BD
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('La contraseña es incorrecta.');
    }

    // 3. Si la contraseña es correcta, desactiva al usuario (Soft Delete)
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'La cuenta ha sido desactivada exitosamente.' };
  }

  async completeProfile(
    userId: string,
    completeProfileDto: CompleteProfileDto,
  ) {
    const { nombre_ente, cargo, estatus_normativa_girs, plazoEntregaActa } =
      completeProfileDto;

    // Verifica si el usuario ya tiene un perfil
    const profile = await this.prisma.$transaction(async (tx) => {
      // 1. Usamos 'upsert' en lugar de 'create'.
      // Esto soluciona el bucle: si el perfil ya existe (pero la bandera está mal),
      // simplemente lo actualiza. Si no existe, lo crea.
      const userProfile = await tx.userProfile.upsert({
        where: { userId: userId },
        update: {
          // Qué hacer si SÍ existe
          nombreEnte: nombre_ente,
          cargo,
          estatusNormativaGirs: estatus_normativa_girs,
          plazoEntregaActa,
        },
        create: {
          // Qué hacer si NO existe
          nombreEnte: nombre_ente,
          cargo,
          estatusNormativaGirs: estatus_normativa_girs,
          plazoEntregaActa,
          userId: userId, // Conecta directamente con el ID del usuario
        },
      });

      // 2. Actualizar el 'User' para poner la bandera en 'true'
      await tx.user.update({
        where: { id: userId },
        data: {
          profileCompleted: true, // <-- ¡La parte clave!
        },
      });

      console.log(`[completeProfile] User ${userId}: Transacción completada.`);
      return userProfile; // Devolvemos el perfil creado/actualizado
    });

    return profile;
  }

  async softDeleteByAdmin(userId: string) {
    // 1. Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // 2. Desactivar (Soft Delete)
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return {
      message:
        'El usuario ha sido desactivado exitosamente (Eliminación Pasiva).',
    };
  }
}
