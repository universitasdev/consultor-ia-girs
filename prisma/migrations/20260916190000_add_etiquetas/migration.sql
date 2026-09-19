-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "autor_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_etiquetas" (
    "documento_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,

    CONSTRAINT "documento_etiquetas_pkey" PRIMARY KEY ("documento_id","etiqueta_id")
);

-- AlterTable: drop free-text etiquetas column if present
ALTER TABLE "documentos" DROP COLUMN IF EXISTS "etiquetas";

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_nombre_key" ON "etiquetas"("nombre");
CREATE INDEX "etiquetas_nombre_idx" ON "etiquetas"("nombre");
CREATE INDEX "documento_etiquetas_etiqueta_id_idx" ON "documento_etiquetas"("etiqueta_id");
CREATE INDEX "documentos_estado_created_at_idx" ON "documentos"("estado", "created_at");

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
