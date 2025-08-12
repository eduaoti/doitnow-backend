# backend/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Etapa base: dependencias del sistema y carpeta de trabajo
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Init process para manejar señales (evita procesos zombie)
RUN apk add --no-cache tini

# Copiamos sólo manifiestos para aprovechar cache en npm ci
COPY package*.json ./

# ─────────────────────────────────────────────────────────────────────────────
# Etapa DEV: dependencias completas (incluye devDeps) + hot reload
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development

# Instala TODAS las deps (incluye dev) para nodemon, etc.
RUN npm ci

# Copia el código fuente
COPY . .

# Usuario no-root
USER node

# Puerto del API
ENV PORT=3000
EXPOSE 3000

# (Opcional) Si tu server soporta HTTPS local con certs montados:
# Monta tus llaves en: -v $(pwd)/certs:/certs
ENV USE_HTTPS=false \
    SSL_KEY_PATH=/certs/key.pem \
    SSL_CERT_PATH=/certs/cert.pem

# tini como ENTRYPOINT y script de dev como CMD
ENTRYPOINT ["tini","-g","--"]
CMD ["npm","run","dev"]


# ─────────────────────────────────────────────────────────────────────────────
# Etapa PROD builder: instala sólo dependencias de producción y construye
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS prod-builder
ENV NODE_ENV=production

# Instala SOLO dependencias de producción
RUN npm ci --omit=dev

# Copia el resto del código
COPY . .

# ─────────────────────────────────────────────────────────────────────────────
# Etapa PROD runtime: imagen mínima para ejecutar el servidor
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app

# tini nuevamente en la imagen final
RUN apk add --no-cache tini

# Copiamos del builder lo necesario
COPY --from=prod-builder /app /app

# Usuario no-root
USER node

# Variables de entorno comunes
ENV NODE_ENV=production \
    PORT=3000 \
    USE_HTTPS=false \
    SSL_KEY_PATH=/certs/key.pem \
    SSL_CERT_PATH=/certs/cert.pem

EXPOSE 3000

# Healthcheck (requiere que tengas /health en tu API)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r=>{if(r.statusCode!==200)process.exit(1)})"

ENTRYPOINT ["tini","-g","--"]
CMD ["node","server.js"]
