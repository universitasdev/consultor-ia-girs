-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('POR_ACTIVAR', 'PRUEBA_GRATUITA', 'ACTIVO', 'SUSPENDIDO', 'POR_PAGAR', 'POR_RENOVAR', 'SUSCRITO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "documentacion_validada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado_cuenta" "EstadoCuenta" NOT NULL DEFAULT 'POR_ACTIVAR',
ADD COLUMN     "fecha_vencimiento_acceso" TIMESTAMP(3),
ADD COLUMN     "pago_realizado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CrmNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
