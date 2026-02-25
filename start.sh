#!/bin/sh
set -e

echo "🚀 Iniciando despliegue..."

# 1. Generar cliente y aplicar migraciones
echo "🔄 Generando cliente Prisma..."
npx prisma generate

# (Migraciones omitidas aquí porque Cloud Run tiene un timeout estricto, 
# se deben lanzar manualmente o en un paso separado de GitHub Actions)

# 2. Iniciar la aplicación
# pero con el cambio en tsconfig debería estar en dist/main.js
echo "🟢 Iniciando servidor NestJS..."
exec node dist/main.js