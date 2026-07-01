/*
  Warnings:

  - Added the required column `updated_at` to the `CrmNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EtiquetaCrm" AS ENUM ('POR_CONTACTAR', 'CONTACTADO', 'PAGO_REALIZADO', 'POR_ENVIAR_DOC', 'ENVIO_DOC', 'NO_TIENE_DOC', 'NO_ENVIO_DOC_PLANIFICAR');

-- AlterTable
ALTER TABLE "ChatHistory" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_user" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CrmNote" ADD COLUMN     "etiqueta" "EtiquetaCrm",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
