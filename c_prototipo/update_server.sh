#!/bin/bash

# ========================================================================
# Script para Actualizar el Servidor desde el Repositorio
# ========================================================================
# Ejecuta actualización y redeploy del servidor
# ========================================================================

set -e

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/silo-iot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
    echo "======================================================================"
    echo "  $1"
    echo "======================================================================"
}

print_success() { echo "✓ $1"; }
print_error() { echo "✗ $1"; }

# Verificar que deploy_auto.sh existe
if [ ! -f "$SCRIPT_DIR/deploy_auto.sh" ]; then
    print_error "No se encontró deploy_auto.sh"
    exit 1
fi

print_header "Actualizando servidor desde repositorio"

# Ejecutar script de despliegue
bash "$SCRIPT_DIR/deploy_auto.sh"

print_success "Servidor actualizado"

