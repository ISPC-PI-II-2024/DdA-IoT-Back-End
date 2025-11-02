#!/bin/bash

# ========================================================================
# Script de Despliegue Automático desde Repositorio Git
# ========================================================================
# Este script clona/actualiza el repositorio y despliega el servidor IoT
# Ideal para despliegue en netbook remota
# ========================================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables configurables
REPO_URL="${REPO_URL:-https://github.com/ISPC-PI-II-2024/DdA-IoT-Back-End.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/silo-iot}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/silo-iot-backups}"
LOG_FILE="${LOG_FILE:-$HOME/silo-iot-deploy.log}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determinar directorio de trabajo
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    # Si el script está en c_prototipo/, usar ese directorio
    WORK_DIR="$SCRIPT_DIR"
elif [ -f "$DEPLOY_DIR/c_prototipo/docker-compose.yml" ]; then
    # Si existe el directorio clonado, usarlo
    WORK_DIR="$DEPLOY_DIR/c_prototipo"
else
    # Usar directorio por defecto
    WORK_DIR="$DEPLOY_DIR/c_prototipo"
fi

# Funciones de utilidad
print_header() {
    echo -e "${BLUE}======================================================================"
    echo "  $1"
    echo "======================================================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS: $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" >> "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: $1" >> "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1" >> "$LOG_FILE"
}

# Verificar requisitos previos
check_requirements() {
    print_header "Verificando requisitos previos"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        print_info "Instalar Docker con: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    print_success "Docker está instalado: $(docker --version)"
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado"
        exit 1
    fi
    print_success "Docker Compose está instalado: $(docker-compose --version)"
    
    # Verificar Git
    if ! command -v git &> /dev/null; then
        print_error "Git no está instalado"
        exit 1
    fi
    print_success "Git está instalado: $(git --version)"
    
    # Verificar que Docker está corriendo
    if ! docker info &> /dev/null; then
        print_error "Docker daemon no está corriendo"
        print_info "Iniciar Docker con: sudo systemctl start docker"
        exit 1
    fi
    print_success "Docker daemon está corriendo"
}

# Crear estructura de directorios
setup_directories() {
    print_header "Configurando estructura de directorios"
    
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$DEPLOY_DIR/c_prototipo/services/silo/{mariadb,influxdb,mosquitto,grafana,nodered,telegraf}/data"
    mkdir -p "$DEPLOY_DIR/c_prototipo/services/silo/mosquitto/{config,data,log}"
    mkdir -p "$DEPLOY_DIR/c_prototipo/services/silo/telegraf/config"
    mkdir -p "$DEPLOY_DIR/c_prototipo/portainer/data"
    mkdir -p "$DEPLOY_DIR/c_prototipo/nginx-proxy-manager/data"
    
    print_success "Estructura de directorios creada"
}

# Clonar o actualizar repositorio
update_repository() {
    print_header "Actualizando repositorio desde Git"
    
    # Si estamos ejecutando desde dentro del repositorio ya clonado
    if [ -d "$SCRIPT_DIR/../.git" ]; then
        print_info "Repositorio existente detectado. Actualizando desde ubicación actual..."
        cd "$SCRIPT_DIR/.."
        git fetch origin
        git checkout "$REPO_BRANCH" || print_warning "No se pudo cambiar de rama"
        git pull origin "$REPO_BRANCH" || print_warning "No se pudo actualizar desde remoto"
        print_success "Repositorio actualizado"
        WORK_DIR="$SCRIPT_DIR"
    elif [ -d "$DEPLOY_DIR/.git" ]; then
        print_info "Repositorio existente detectado. Actualizando..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git checkout "$REPO_BRANCH" || print_warning "No se pudo cambiar de rama"
        git pull origin "$REPO_BRANCH" || print_warning "No se pudo actualizar desde remoto"
        print_success "Repositorio actualizado"
        WORK_DIR="$DEPLOY_DIR/c_prototipo"
    else
        print_info "Clonando repositorio desde: $REPO_URL"
        git clone -b "$REPO_BRANCH" "$REPO_URL" "$DEPLOY_DIR"
        print_success "Repositorio clonado exitosamente"
        WORK_DIR="$DEPLOY_DIR/c_prototipo"
    fi
}

# Hacer backup de datos existentes
create_backup() {
    print_header "Creando backup de datos"
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.tar.gz"
    
    # Backup de volúmenes Docker si existen
    if docker volume ls | grep -q "c_prototipo"; then
        print_info "Realizando backup de volúmenes Docker..."
        
        for volume in $(docker volume ls | grep "c_prototipo" | awk '{print $2}'); do
            docker run --rm -v "$volume":/source -v "$BACKUP_DIR":/backup \
                alpine tar czf "/backup/${volume}_${DATE}.tar.gz" -C /source ./ 2>/dev/null || true
        done
        
        print_success "Backup creado: $BACKUP_FILE"
    else
        print_warning "No se encontraron volúmenes para respaldar"
    fi
    
    # Limpiar backups antiguos (mantener últimos 7 días)
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
}

# Verificar y crear archivo .env
setup_env() {
    print_header "Configurando variables de entorno"
    
    cd "$WORK_DIR"
    
    if [ ! -f ".env" ]; then
        print_warning "Archivo .env no encontrado"
        
        if [ -f ".env.example" ]; then
            print_info "Creando .env desde .env.example"
            cp .env.example .env
            print_warning "IMPORTANTE: Editar .env con tus configuraciones antes de continuar"
            print_info "Editar con: nano $DEPLOY_DIR/c_prototipo/.env"
            
            # Preguntar si quiere continuar
            read -p "¿Deseas editar .env ahora? (s/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                ${EDITOR:-nano} .env
            fi
        else
            print_error "No se encontró .env.example"
            exit 1
        fi
    else
        print_success "Archivo .env encontrado"
        print_info "Si necesitas actualizar .env, edita: $DEPLOY_DIR/c_prototipo/.env"
    fi
}

# Construir frontend
build_frontend() {
    print_header "Construyendo frontend"
    
    cd "$WORK_DIR/frontend"
    
    if [ -f "package.json" ]; then
        print_info "Instalando dependencias del frontend..."
        npm install --production
        
        # Si hay script de build, ejecutarlo
        if grep -q '"build"' package.json; then
            print_info "Construyendo aplicación..."
            npm run build || print_warning "Build del frontend falló, continuando..."
        fi
        
        print_success "Frontend preparado"
    else
        print_warning "No se encontró package.json en frontend"
    fi
}

# Corregir permisos
fix_permissions() {
    print_header "Corrigiendo permisos"
    
    cd "$WORK_DIR"
    
    # Detener servicios si están corriendo
    docker-compose down 2>/dev/null || true
    
    # Corregir permisos
    sudo chown -R 1000:1000 services/silo/nodered/data 2>/dev/null || true
    sudo chown -R 472:0 services/silo/grafana/data 2>/dev/null || true
    sudo chown -R 1883:1883 services/silo/mosquitto/data 2>/dev/null || true
    sudo chown -R 1883:1883 services/silo/mosquitto/log 2>/dev/null || true
    sudo chown -R 1000:1000 services/silo/influxdb/data 2>/dev/null || true
    sudo chown -R 999:999 services/silo/mariadb/data 2>/dev/null || true
    
    # Verificar que existe mosquitto.conf
    if [ ! -f "services/silo/mosquitto/config/mosquitto.conf" ]; then
        print_info "Creando mosquitto.conf..."
        mkdir -p services/silo/mosquitto/config
        cat > services/silo/mosquitto/config/mosquitto.conf << 'EOF'
listener 1883 0.0.0.0
protocol mqtt
allow_anonymous true
listener 9001 0.0.0.0
protocol websockets
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_type all
EOF
    fi
    
    print_success "Permisos corregidos"
}

# Construir y desplegar servicios
deploy_services() {
    print_header "Construyendo y desplegando servicios"
    
    cd "$WORK_DIR"
    
    # Construir imágenes
    print_info "Construyendo imágenes Docker..."
    docker-compose build --no-cache || print_warning "Algunas imágenes fallaron al construir"
    
    # Iniciar servicios
    print_info "Iniciando servicios..."
    docker-compose up -d
    
    # Esperar a que los servicios estén listos
    print_info "Esperando a que los servicios estén listos..."
    sleep 15
    
    print_success "Servicios desplegados"
}

# Verificar estado
verify_deployment() {
    print_header "Verificando despliegue"
    
    cd "$WORK_DIR"
    
    # Ver estado de contenedores
    print_info "Estado de contenedores:"
    docker-compose ps
    
    # Verificar que los servicios críticos están corriendo
    FAILED=0
    
    if ! docker-compose ps | grep -q "Up"; then
        print_error "No hay servicios corriendo"
        FAILED=1
    fi
    
    # Verificar logs de errores
    print_info "Verificando logs de errores..."
    docker-compose logs --tail=20 | grep -i error && FAILED=1 || print_success "Sin errores críticos en logs"
    
    if [ $FAILED -eq 0 ]; then
        print_success "Despliegue verificado exitosamente"
        print_info "Servicios disponibles en:"
        print_info "  - Frontend: http://$(hostname -I | awk '{print $1}'):5000"
        print_info "  - Portainer: http://$(hostname -I | awk '{print $1}'):9000"
        print_info "  - Nginx Proxy: http://$(hostname -I | awk '{print $1}'):81"
    else
        print_warning "Algunos servicios pueden tener problemas. Revisar logs con: docker-compose logs"
    fi
}

# Función principal
main() {
    print_header "Despliegue Automático del Servidor IoT Silo"
    
    # Crear log file
    touch "$LOG_FILE"
    
    check_requirements
    setup_directories
    update_repository
    create_backup
    setup_env
    build_frontend
    fix_permissions
    deploy_services
    verify_deployment
    
    print_header "Despliegue Completado"
    print_success "Servidor IoT Silo desplegado exitosamente"
    print_info "Logs guardados en: $LOG_FILE"
    print_info "Para actualizar, ejecutar nuevamente este script"
}

# Ejecutar función principal
main "$@"

