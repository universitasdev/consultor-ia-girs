# 1. Usar la imagen oficial de Node.js
FROM node:20-alpine

ENV PORT=3000

# 2. Crear el directorio de la aplicación
WORKDIR /usr/src/app

# 3. Copiar los archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instalar dependencias de producción y desarrollo (necesarias para compilar)
RUN npm install

# 5. Generar el cliente de Prisma en tiempo de construcción
RUN npx prisma generate

# 6. Copiar el resto del código fuente del proyecto
COPY . .

# 7. COMPILAR EL PROYECTO (genera la carpeta dist/ dentro de la imagen)
RUN rm -rf dist tsconfig.tsbuildinfo tsconfig.build.tsbuildinfo
RUN npm run build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js no fue generado" && exit 1)

# 8. Darle permisos de ejecución al script de arranque
RUN chmod +x ./start.sh

EXPOSE 3000

# 9. Comando de inicio delegando al script de arranque
CMD ["sh", "./start.sh"]
