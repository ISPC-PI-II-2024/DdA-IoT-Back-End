#!/bin/bash

# ========================================================================
# Script para Configurar Inicio Automático del Servidor
# ========================================================================
# Crea un servicio systemd que ejecuta el despliegue automático al inicio
# ========================================================================

set -e

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/silo-iot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="silo-iot-deploy"

# Determinar directorio de trabajo
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    WORK_DIR="$SCRIPT_DIR"
else
    WORK_DIR="$DEPLOY_DIR/c_prototipo"
fi

print_header() {
    echo "======================================================================"
    echo "  $1"
    echo "======================================================================"
}

print_success() { echo "✓ $1"; }
print_error() { echo "✗ $1"; }

# Verificar que el script de deploy existe
if [ ! -f "$SCRIPT_DIR/deploy_auto.sh" ]; then
    print_error "No se encontró deploy_auto.sh"
    exit 1
fi

# Hacer el script ejecutable
chmod +x "$SCRIPT_DIR/deploy_auto.sh"

# Crear servicio systemd
print_header "Creando servicio systemd"

sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null <<EOF
[Unit]
Description=Servidor IoT Silo - Despliegue Automático
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$USER
Group=$USER
WorkingDirectory=$WORK_DIR
ExecStart=$SCRIPT_DIR/deploy_auto.sh
Environment="WORK_DIR=$WORK_DIR"
StandardOutput=journal
StandardError=journal

# Reiniciar si falla
Restart=on-failure
RestartSec=30

# Tiempo de espera
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar servicio
sudo systemctl enable "${SERVICE_NAME}.service"

print_success "Servicio creado y habilitado"
print_info "El servidor se desplegará automáticamente al iniciar la netbook"
print_info "Para verificar estado: sudo systemctl status ${SERVICE_NAME}"
print_info "Para ejecutar ahora: sudo systemctl start ${SERVICE_NAME}"

