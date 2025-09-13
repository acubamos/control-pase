# Etapa de construcción con todas las dependencias
FROM node:22.13.1-alpine AS build-stage
WORKDIR /app

#Arrelgar DNS

# Copia solo los archivos necesarios
COPY package*.json ./
RUN npm install

# Copia todo el backend
COPY . .
RUN npm run build

# Etapa produccion
FROM node:22.13.1-alpine AS production-stage
WORKDIR /app

# Copia los archivos necesarios desde la etapa de construcción
COPY package*.json ./
#RUN npm ci --omit=dev
RUN npm install
COPY --from=build-stage /app/dist ./dist

# Expone el puerto y ejecuta la aplicación
EXPOSE 3001
CMD ["node", "dist/main"]
