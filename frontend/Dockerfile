# Etapa de construcción
FROM node:22-alpine AS build-stage

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
FROM node:22-alpine

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