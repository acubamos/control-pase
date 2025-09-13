# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# 1. Copia solo los manifests para aprovechar la caché
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production --ignore-scripts

# 2. Copia el resto del código
COPY . .

# 3. Compila
RUN npm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage

WORKDIR /app

# 4. Copia solo los archivos necesarios
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]
