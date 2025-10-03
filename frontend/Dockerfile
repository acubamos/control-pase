# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Argumento para controlar caché (pasado desde docker build --build-arg NO_CACHE=true)
ARG NO_CACHE=false

# Mensaje informativo
RUN if [ "$NO_CACHE" = "true" ]; then \
    echo "⚠️ Cache deshabilitado: Forzando reinstalación de dependencias"; \
fi

# Instalar pnpm
RUN npm install -g pnpm

# 1. Copia package.json y genera lockfile
COPY package.json ./
# Condición: Si NO_CACHE=true, fuerza reinstalación; si no, usa caché
RUN if [ "$NO_CACHE" = "true" ]; then \
    pnpm install --force; \  # Forzar reinstalación
else \
    pnpm install; \          # Usar caché normal
fi

# 2. Copia el resto del código
COPY . .

# 3. Compila
RUN pnpm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# 4. Copia package.json y genera dependencias de producción
COPY package.json ./
RUN pnpm install --prod  # Siempre usa --prod en producción

# 5. Copia los archivos necesarios desde la etapa de construcción
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]