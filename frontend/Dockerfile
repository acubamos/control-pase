# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# 1. Copia solo los manifests para aprovechar la caché
COPY package.json package-lock.json ./

# 2. Instala **todo**
RUN npm install

# 3. Copia el resto del código
COPY . .

# 4. Compila
RUN npm run build

# Etapa de producción
FROM nginx:1.29.0-alpine3.22 AS production-stage

WORKDIR /app

# 5. Copia artefacto ya compilado
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]