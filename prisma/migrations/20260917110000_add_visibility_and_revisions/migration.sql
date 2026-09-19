-- CreateEnum
CREATE TYPE "AccionRevision" AS ENUM ('APROBADO', 'RECHAZADO', 'REENVIADO');

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN IF NOT EXISTS "visible_en_biblioteca" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "documento_revisiones" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "accion" "AccionRevision" NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_revisiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documentos_estado_visible_en_biblioteca_idx" ON "documentos"("estado", "visible_en_biblioteca");
CREATE INDEX IF NOT EXISTS "documento_revisiones_documento_id_created_at_idx" ON "documento_revisiones"("documento_id", "created_at");
CREATE INDEX IF NOT EXISTS "documento_revisiones_actor_id_created_at_idx" ON "documento_revisiones"("actor_id", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "documento_revisiones" ADD CONSTRAINT "documento_revisiones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "documento_revisiones" ADD CONSTRAINT "documento_revisiones_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
