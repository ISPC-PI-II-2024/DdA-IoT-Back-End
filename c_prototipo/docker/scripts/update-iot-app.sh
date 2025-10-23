#!/bin/bash
cd ~/docker

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

cd ~/docker

echo "🔨 Reconstruyendo backend..."
docker-compose build --no-cache iot-backend

echo "🔄 Reiniciando servicios..."
docker-compose up -d iot-backend iot-frontend

echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar salud
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Actualización completada exitosamente!"
else
    echo "⚠️  Los servicios se reiniciaron pero verifica los logs"
    echo "💡 Revisa: docker logs iot-backend"
fi
