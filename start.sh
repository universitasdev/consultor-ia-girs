#!/bin/sh
set -e

echo "🚀 Iniciando despliegue..."

# 1. Generar cliente Prisma
echo "🔄 Generando cliente Prisma..."
npx prisma generate

# 2. Aplicar migraciones pendientes a la base de datos
echo "🔄 Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# 3. Iniciar la aplicación
echo "🟢 Iniciando servidor NestJS..."
exec node dist/main.js