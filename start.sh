#!/bin/sh
set -e

echo "🟢 Iniciando el contenedor en Cloud Run..."

# Ejecutar las migraciones pendientes
echo "🚀 Ejecutando migraciones de Prisma en Cloud SQL..."
npx prisma migrate deploy

echo "🔥 Iniciando servidor NestJS..."

# Detectar automáticamente la ruta del archivo compilado
if [ -f "dist/src/main.js" ]; then
    echo "✅ Archivo detectado en dist/src/"
    exec node dist/src/main.js
else
    echo "✅ Archivo detectado en dist/"
    exec node dist/main.js
fi
