-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE_REVISION', 'PUBLICADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MacroTipoDocumento" AS ENUM ('LEGISLACION', 'ORDENANZA', 'INSTRUMENTO_INTERNACIONAL', 'SENTENCIA', 'SENTENCIA_INTERNACIONAL', 'DOCTRINA');

-- CreateEnum
CREATE TYPE "LegibilidadPdf" AS ENUM ('PDF_TEXTO', 'SOLO_IMAGEN');

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "macro_tipo" "MacroTipoDocumento" NOT NULL,
    "carpeta_slug" TEXT NOT NULL,
    "titulo_integro" TEXT NOT NULL,
    "titulo_breve" TEXT NOT NULL,
    "parametros_especificos" JSONB NOT NULL,
    "ente_emisor" TEXT NOT NULL,
    "fecha_publicacion" DATE,
    "categorias" TEXT,
    "etiquetas" TEXT,
    "resumen_descriptivo" TEXT NOT NULL,
    "resumen_corto" TEXT,
    "palabras_clave" TEXT,
    "legibilidad_pdf" "LegibilidadPdf" NOT NULL DEFAULT 'PDF_TEXTO',
    "archivo_path" TEXT NOT NULL,
    "archivo_url" VARCHAR(2048) NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "motivo_rechazo" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_autor_id_estado_idx" ON "documentos"("autor_id", "estado");

-- CreateIndex
CREATE INDEX "documentos_macro_tipo_estado_idx" ON "documentos"("macro_tipo", "estado");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
