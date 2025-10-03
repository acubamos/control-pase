# Etapa de construcción con todas las dependencias
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Argumento para controlar caché (pasado desde docker build --build-arg NO_CACHE=true)
ARG NO_CACHE=false

# Mensaje informativo
RUN if [ "$NO_CACHE" = "true" ]; then \
    echo "⚠️ Cache deshabilitado: Forzando reinstalación de dependencias"; \
fi

# Instalar dependencias
COPY package*.json ./
# Condición: Si NO_CACHE=true, fuerza reinstalación; si no, usa caché normal
RUN if [ "$NO_CACHE" = "true" ]; then \
    npm install --force; \  # Forzar reinstalación
else \
    npm install; \          # Usar caché normal
fi

# Copia todo el backend
COPY . .
RUN npm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage
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