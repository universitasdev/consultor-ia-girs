-- AlterEnum: add CIUDADANO to TipoUsuario (non-destructive)
ALTER TYPE "TipoUsuario" ADD VALUE 'CIUDADANO';

-- AlterTable: allow citizens without nombre_ente
ALTER TABLE "UserProfile" ALTER COLUMN "nombre_ente" DROP NOT NULL;
