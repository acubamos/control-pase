# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# 1. Copia solo los manifests para aprovechar la caché
COPY package.json ./

# Instalar dependencias
#RUN npm install --legacy-peer-deps
# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python
# 2. Instala **todo**

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
