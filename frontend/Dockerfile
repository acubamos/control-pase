# Etapa de construcción
FROM node:22.18.0-alpine AS build-stage
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar archivos del proyecto
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:1.29.0-alpine3.22 AS production-stage

# Copiar los archivos construidos desde la etapa de construcción
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copiamos el archivo de configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]