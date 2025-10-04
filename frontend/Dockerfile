# Etapa de construcción
FROM node:22.13.1-alpine AS build-stage

WORKDIR /app

# pnpm sin global: usa Corepack
#ENV NODE_OPTIONS=--max-old-space-size=256
#RUN corepack enable

# Instalar pnpm
RUN npm install -g pnpm

# inyecta la var en build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 1. Copia package.json y genera lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

# 2. Copia el resto del código
COPY . .

# 3. Compila
RUN pnpm run build

# Etapa de producción
FROM node:22.13.1-alpine AS production-stage

WORKDIR /app

# pnpm usa Corepack
#ENV NODE_ENV=production
#RUN corepack enable

# Instalar pnpm
RUN npm install -g pnpm

# 4. Copia package.json y genera dependencias de producción
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-frozen-lockfile  # Siempre usa --prod en producción

# 5. Copia los archivos necesarios desde la etapa de construcción
COPY --from=build-stage /app/.next ./.next
COPY --from=build-stage /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]