#!/bin/sh
set -e

echo "🟢 Iniciando el contenedor en Cloud Run..."

# 1. Ejecutar las migraciones pendientes directamente en db_urbanistico
echo "🚀 Ejecutando migraciones de Prisma en Cloud SQL..."
npx prisma migrate deploy

# 2. Arrancar la aplicación de NestJS desde la carpeta dist ya compilada
echo "🔥 Iniciando servidor NestJS..."
exec node dist/main.js
