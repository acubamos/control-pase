# Etapa de construcción
#FROM node:22-alpine AS build-stage
ARG NODE_IMAGE=node@sha256:cb3143549582cc5f74f26f0992cdef4a422b22128cb517f94173a5f910fa4ee7
FROM ${NODE_IMAGE} AS build-stage
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# 1. Copia package.json y genera lockfile
COPY package.json ./
RUN pnpm install

# 2. Copia el resto del código
COPY . .

# 3. Compila
RUN pnpm run build

# Etapa de producción
#FROM node:22-alpine AS production-stage
FROM ${NODE_IMAGE} AS production-stage
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