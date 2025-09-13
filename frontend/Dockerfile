# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# 1. Copia package.json y genera nuevo lockfile
COPY package.json ./
RUN pnpm install

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
RUN pnpm install --prod

# 5. Copia los archivos necesarios
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/public ./public

ENV NODE_ENV=production
EXPOSE 3001

CMD ["pnpm", "start"]
