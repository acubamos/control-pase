# Etapa de construcción con todas las dependencias
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

# Menos RAM y salida limpia
ENV NODE_OPTIONS=--max-old-space-size=256 \
    npm_config_jobs=1 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_progress=false

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copia todo el backend
COPY . .
RUN npm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage
WORKDIR /app

ENV NODE_ENV=production \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_progress=false

# Instala curl para healthchecks
RUN apk add --no-cache curl

# Copia los archivos necesarios desde la etapa de construcción
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force  # Siempre usa --omit=dev en producción
COPY --from=build-stage /app/dist ./dist

# Expone el puerto y ejecuta la aplicación
EXPOSE 3001
CMD ["node", "dist/main"]