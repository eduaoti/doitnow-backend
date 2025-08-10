# backend/Dockerfile
FROM node:18-alpine

# 1) Seguridad/optimización
ENV NODE_ENV=production
WORKDIR /app

# 2) Instala SOLO dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# 3) Copia código
COPY . .

# 4) Exponer puerto del API
ENV PORT=3000
EXPOSE 3000

# 5) Healthcheck (opcional pero recomendado para Azure/monitoring)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r=>{if(r.statusCode!==200)process.exit(1)})"

# 6) Arranque
CMD ["node","server.js"]
