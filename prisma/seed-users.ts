// prisma/seed-users.ts
/**
 * Seed de usuarios de prueba para desarrollo local.
 *
 * Crea 3 usuarios con los 3 roles principales del sistema:
 *   1. ADMIN            → admin@test.com       / Admin123!
 *   2. ADMIN_VISUALIZADOR → visualizador@test.com / Visual123!
 *   3. USER (estándar)  → usuario@test.com     / User123!
 *
 * Todos quedan con isEmailVerified=true para poder hacer login directamente.
 *
 * Uso:
 *   npx tsx prisma/seed-users.ts
 */

import {
  PrismaClient,
  UserRole,
  TipoUsuario,
  EstadoCuenta,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const SEED_USERS = [
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    nombre: 'Carlos',
    apellido: 'Administrador',
    role: UserRole.ADMIN,
    tipoUsuario: TipoUsuario.SERVIDOR_PUBLICO,
    estadoCuenta: EstadoCuenta.ACTIVO,
    profileData: {
      nombreEnte: 'Alcaldía Municipal de Prueba',
      cargo: 'Administrador del Sistema',
    },
  },
  {
    email: 'visualizador@test.com',
    password: 'Visual123!',
    nombre: 'María',
    apellido: 'Visualizador',
    role: UserRole.ADMIN_VISUALIZADOR,
    tipoUsuario: TipoUsuario.SERVIDOR_PUBLICO,
    estadoCuenta: EstadoCuenta.ACTIVO,
    profileData: {
      nombreEnte: 'Dirección de Urbanismo',
      cargo: 'Analista de Visualización',
    },
  },
  {
    email: 'usuario@test.com',
    password: 'User123!',
    nombre: 'Luis',
    apellido: 'Servidor',
    role: UserRole.USER,
    tipoUsuario: TipoUsuario.SERVIDOR_PUBLICO,
    estadoCuenta: EstadoCuenta.ACTIVO,
    profileData: {
      nombreEnte: 'Gobernación del Estado',
      cargo: 'Técnico Municipal',
    },
  },
] as const;

async function main() {
  console.log('\n🌱 ============================================');
  console.log('   SEED DE USUARIOS DE PRUEBA (desarrollo)');
  console.log('==============================================\n');

  for (const userData of SEED_USERS) {
    const { profileData, password, ...userFields } = userData;

    // Verificar si el usuario ya existe para no duplicar
    const existing = await prisma.user.findUnique({
      where: { email: userFields.email },
    });

    if (existing) {
      console.log(
        `⏭️  Usuario ya existe, omitiendo: ${userFields.email} (role: ${userFields.role})`,
      );
      continue;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const created = await prisma.user.create({
      data: {
        ...userFields,
        password: hashedPassword,
        isEmailVerified: true, // Ya verificado → puede hacer login directamente
        isActive: true,
        profileCompleted: true,
        profile: {
          create: profileData,
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        nombre: true,
        estadoCuenta: true,
      },
    });

    console.log(`✅ Creado: ${created.email}`);
    console.log(`   ID:       ${created.id}`);
    console.log(`   Rol:      ${created.role}`);
    console.log(`   Estado:   ${created.estadoCuenta}`);
    console.log(`   Password: ${password}`);
    console.log('');
  }

  console.log('==============================================');
  console.log('📋 RESUMEN DE CREDENCIALES PARA PRUEBAS:');
  console.log('----------------------------------------------');
  console.log('ADMIN           → admin@test.com       / Admin123!');
  console.log('ADMIN_VISUAL    → visualizador@test.com / Visual123!');
  console.log('USER estándar   → usuario@test.com     / User123!');
  console.log('==============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
