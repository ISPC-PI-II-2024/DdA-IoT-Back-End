# ==========================
# Dockerfile para Backend Node.js
# Aplicación IoT con Express + WebSocket + MQTT
# ==========================

# Usar imagen oficial de Node.js LTS Alpine para menor tamaño
FROM node:20-alpine

# Metadatos del contenedor
LABEL maintainer="ISPC 2025 - Desarrollo de Aplicaciones IoT"
LABEL description="Backend para aplicación IoT con Express, WebSocket y MQTT"
LABEL version="1.0.0"

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar cache de Docker)
COPY backend/package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente del backend
COPY backend/src ./src

# Cambiar propietario de archivos al usuario nodejs
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto (configurable via ENV, por defecto 3000 para compatibilidad con docker-compose)
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Health check para verificar que el servicio esté funcionando
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar la aplicación
CMD ["node", "src/server.js"]
