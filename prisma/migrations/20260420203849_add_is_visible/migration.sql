-- AlterTable: Add isVisible field to User (defaults to true for all existing rows)
ALTER TABLE "User" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;
