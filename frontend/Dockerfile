# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# 1. Copia solo los manifests para aprovechar la caché
COPY package.json ./

# Instalar dependencias
#RUN npm install --legacy-peer-deps

# 2. Instala **todo**
RUN apt-get update && apt-get install -y python3
RUN npm config set python /usr/bin/python3
RUN npm install --legacy-peer-deps --force

# 3. Copia el resto del código
COPY . .

# 4. Compila
RUN npm run build

# Etapa de producción
FROM nginx:1.29.0-alpine3.22 AS production-stage

WORKDIR /app

# 5. Copia artefacto ya compilado
COPY --from=build-stage /app/.output ./.output

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]
