# Etapa de construcción con todas las dependencias
#FROM node:22-alpine AS build-stage
ARG NODE_IMAGE=node@sha256:cb3143549582cc5f74f26f0992cdef4a422b22128cb517f94173a5f910fa4ee7
FROM ${NODE_IMAGE} AS build-stage
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copia todo el backend
COPY . .
RUN npm run build

# Etapa de producción
#FROM node:22-alpine AS production-stage
FROM ${NODE_IMAGE} AS production-stage
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