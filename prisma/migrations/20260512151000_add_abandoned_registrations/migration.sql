-- CreateTable
CREATE TABLE "abandoned_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "telefono" TEXT,
    "tipo_usuario" "TipoUsuario",
    "registered_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abandoned_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abandoned_registration_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "registration_id" TEXT NOT NULL,

    CONSTRAINT "abandoned_registration_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abandoned_registrations_email_key" ON "abandoned_registrations"("email");

-- AddForeignKey
ALTER TABLE "abandoned_registration_notes" ADD CONSTRAINT "abandoned_registration_notes_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "abandoned_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
