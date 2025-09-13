##### Etapa 1 : build #############################################
FROM node:22.18.0-alpine AS builder
WORKDIR /app

# 1. Copia solo los manifests para aprovechar la caché
COPY package.json package-lock.json ./

# 2. Instala **todo**
RUN npm ci

# 3. Copia el resto del código
COPY . .

# 4. Compila
RUN npm run build

##### Etapa 2 : producción ########################################
FROM node:22.18.0-alpine AS production
WORKDIR /app

# 5. Copia artefacto ya compilado
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]
