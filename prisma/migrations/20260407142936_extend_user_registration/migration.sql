/*
  Warnings:

  - You are about to drop the column `institucion` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the `Acta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `acta_compliance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `acta_observaciones` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nombre_ente` to the `UserProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('SERVIDOR_PUBLICO', 'ASESOR_PRIVADO');

-- CreateEnum
CREATE TYPE "EstatusNormativaGIRS" AS ENUM ('VIGENTE', 'EN_MORA', 'EN_REVISION');

-- DropForeignKey
ALTER TABLE "Acta" DROP CONSTRAINT "Acta_userId_fkey";

-- DropForeignKey
ALTER TABLE "acta_compliance" DROP CONSTRAINT "acta_compliance_userId_fkey";

-- DropForeignKey
ALTER TABLE "acta_observaciones" DROP CONSTRAINT "acta_observaciones_actaId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "estado" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "tipo_usuario" "TipoUsuario";

-- AlterTable
ALTER TABLE "UserProfile" RENAME COLUMN "institucion" TO "nombre_ente";
ALTER TABLE "UserProfile" ADD COLUMN "estatus_normativa_girs" "EstatusNormativaGIRS";
ALTER TABLE "UserProfile" ALTER COLUMN "cargo" DROP NOT NULL;

-- DropTable
DROP TABLE "Acta";

-- DropTable
DROP TABLE "acta_compliance";

-- DropTable
DROP TABLE "acta_observaciones";

-- DropEnum
DROP TYPE "ActaStatus";

-- DropEnum
DROP TYPE "ActaType";
