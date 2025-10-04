# Etapa de construcción
FROM node:22.18.0-alpine3.22 AS build-stage

WORKDIR /app

# Configuración para reducir el tamaño y mejorar el rendimiento
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=256 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_progress=false

# Usar corepack en lugar de instalar pnpm globalmente
RUN corepack enable

# Inyectar la variable de entorno para la compilación
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 1. Copiar solo los archivos necesarios para instalar dependencias
COPY package.json pnpm-lock.yaml ./

# 2. Instalar dependencias con --frozen-lockfile para garantizar consistencia
RUN pnpm install --frozen-lockfile && \
    pnpm prune --prod

# 3. Copiar el resto del código fuente
COPY . .

# 4. Compilar la aplicación
RUN pnpm run build && \
    # Limpiar archivos innecesarios después de la compilación
    rm -rf node_modules/.cache && \
    rm -rf .next/cache

# Etapa de producción - imagen más ligera
FROM node:22.18.0-alpine3.22 AS production-stage

WORKDIR /app

# Configuración de entorno para producción
ENV NODE_ENV=production

# Usar corepack en lugar de instalar pnpm globalmente
RUN corepack enable && \
    # Instalar solo los paquetes necesarios para ejecutar la aplicación
    apk add --no-cache dumb-init

# Copiar solo los archivos necesarios desde la etapa de construcción
COPY --from=build-stage /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/public ./public
COPY --from=build-stage /app/next.config.mjs ./

# Usar un usuario no root para mayor seguridad
USER node

EXPOSE 3000

# Usar dumb-init como proceso init para manejar señales correctamente
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pnpm", "start"]