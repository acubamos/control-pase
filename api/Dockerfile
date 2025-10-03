# Etapa de construcción con todas las dependencias
FROM node:22-alpine AS build-stage
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copia todo el backend
COPY . .
RUN npm run build

# Etapa de producción
FROM node:22-alpine AS production-stage
WORKDIR /app

# Instala curl para healthchecks
RUN apk add --no-cache curl

# Copia los archivos necesarios desde la etapa de construcción
COPY package*.json ./
RUN npm install --omit=dev  # Siempre usa --omit=dev en producción
COPY --from=build-stage /app/dist ./dist

# Expone el puerto y ejecuta la aplicación
EXPOSE 3001
CMD ["node", "dist/main"]