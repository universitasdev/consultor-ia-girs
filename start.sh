#!/bin/sh
set -e

echo "🚀 Iniciando despliegue..."

# 1. Generar cliente Prisma
echo "🔄 Generando cliente Prisma..."
npx prisma generate

# 2. Arreglar migración fallida anterior (si existe) y aplicar pendientes
echo "🔄 Resolviendo migraciones fallidas previas..."
npx prisma migrate resolve --rolled-back "20260620155500_add_admin_visualizador_role" || true

echo "🔄 Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# 3. Iniciar la aplicación
echo "🟢 Iniciando servidor NestJS..."
exec node dist/main.js