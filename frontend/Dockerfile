# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Configurar el registry correcto ANTES de instalar
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set @radix-ui:registry https://registry.npmjs.org/

# Copiar package.json
COPY package.json package-lock.json* ./

# Verificar la conexión y el paquete
RUN npm ping
RUN npm view @radix-ui/react-sheet@1.0.5

# Instalar dependencias
RUN npm install --legacy-peer-deps

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
