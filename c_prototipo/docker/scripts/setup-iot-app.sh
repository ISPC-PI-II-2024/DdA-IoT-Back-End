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

echo "🚀 Configuración inicial de la App IoT..."

# Verificar que el repositorio existe
if [ ! -d "services/iot-app/repo" ]; then
    echo "❌ Error: El repositorio no está clonado en services/iot-app/repo"
    echo "💡 Ejecuta primero:"
    echo "   cd services/iot-app"
    echo "   git clone https://github.com/ISPC-PI-II-2024/DdA-IoT-Web-App.git repo"
    exit 1
fi

# Verificar Dockerfile del backend
if [ ! -f "services/iot-app/repo/C-Prototipo/docker/backend.Dockerfile" ]; then
    echo "❌ Error: No se encuentra backend.Dockerfile"
    echo "💡 Verifica la estructura del repositorio"
    exit 1
fi

# Verificar que el frontend existe
if [ ! -d "services/iot-app/repo/C-Prototipo/frontend/public" ]; then
    echo "❌ Error: No se encuentra el frontend en frontend/public"
    exit 1
fi

echo "✅ Estructura del repositorio verificada"

# Construir y levantar servicios
echo "🔨 Construyendo backend..."
${COMPOSE_CMD} build iot-backend

echo "🚀 Iniciando servicios..."
${COMPOSE_CMD} up -d iot-backend iot-frontend

echo "⏳ Esperando a que el backend esté listo..."
sleep 10

# Verificar que el backend esté funcionando
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend funcionando correctamente"
else
    echo "⚠️  El backend no responde, revisa los logs: docker logs iot-backend"
fi

echo "🎉 Configuración completada!"
echo ""
echo "🌐 URLs de acceso:"
echo "   - Backend API: http://localhost:3000"
echo "   - Frontend: http://localhost (después de configurar NPM)"
echo ""
echo "📝 Comandos útiles:"
echo "   - Ver logs: docker logs iot-backend -f"
echo "   - Actualizar: ./scripts/update-iot-app.sh"
echo "   - Detener: ${COMPOSE_CMD} stop iot-backend iot-frontend"
