# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# 1. Copia solo los manifests para aprovechar la caché
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --prod --no-frozen-lockfile --legacy-peer-deps

# 2. Copia el resto del código
COPY . .

# 3. Compila
RUN pnpm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage

WORKDIR /app

# 4. Copia solo los archivos necesarios
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3001

CMD ["pnpm", "start"]
