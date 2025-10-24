#!/usr/bin/env bash
set -euo pipefail

# Detectar Docker Compose (v2 plugin o v1 binario)
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ Docker Compose no encontrado. Instala Docker Compose v2 (plugin) o docker-compose v1."
  exit 1
fi

# Comprobar acceso a Docker (permiso/grupo)
if ! docker info >/dev/null 2>&1; then
  echo "⚠️  No se pudo acceder a Docker. Si ves 'permission denied', ejecuta el script con sudo o agrega tu usuario al grupo docker:"
  echo "   sudo usermod -aG docker $(whoami) && newgrp docker"
fi

# Ir al directorio del compose (este script vive en scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="${SCRIPT_DIR%/scripts}"
cd "$COMPOSE_DIR"

echo "🔄 Actualizando App IoT..."

# Navegar al repositorio
cd services/iot-app/repo

echo "📥 Obteniendo últimos cambios de GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Error al actualizar desde GitHub"
    echo "💡 Verifica tu conexión y credenciales de GitHub"
    exit 1
fi

cd "$COMPOSE_DIR"

echo "🔨 Reconstruyendo backend..."
${COMPOSE_CMD} build --no-cache iot-backend

echo "🔄 Reiniciando servicios..."
${COMPOSE_CMD} up -d iot-backend iot-frontend

echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar salud
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Actualización completada exitosamente!"
else
    echo "⚠️  Los servicios se reiniciaron pero verifica los logs"
    echo "💡 Revisa: docker logs iot-backend"
fi
