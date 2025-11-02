# 🖥️ Guía para Despliegue en Netbook Remota

## 🎯 Objetivo

Desplegar el servidor IoT Silo en una netbook remota que se actualiza automáticamente desde el repositorio Git.

## 🚀 Pasos Rápidos

### 1. Preparar Netbook (Primera Vez)

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Git
sudo apt update && sudo apt install -y git  # Ubuntu/Debian
# o
sudo yum install -y git  # CentOS/RHEL
```

### 2. Clonar Repositorio

```bash
cd ~
git clone https://github.com/ISPC-PI-II-2024/DdA-IoT-Back-End.git silo-iot
cd silo-iot/c_prototipo
```

### 3. Configurar Variables de Entorno

```bash
# Crear .env desde template
cp .env.example .env

# Editar con tus configuraciones
nano .env
```

**Configurar:**
- `JWT_SECRET`: Generar con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `GOOGLE_CLIENT_ID`: Tu Client ID de Google OAuth
- `ADMIN_WHITELIST`: Tu correo para acceso admin
- Contraseñas de bases de datos

### 4. Ejecutar Despliegue Automático

```bash
chmod +x deploy_auto.sh
./deploy_auto.sh
```

### 5. (Opcional) Configurar Inicio Automático

```bash
chmod +x setup_autostart.sh
./setup_autostart.sh
```

## 🔄 Actualizaciones Futuras

Para actualizar el servidor con los últimos cambios:

```bash
cd ~/silo-iot/c_prototipo
./update_server.sh
```

O directamente:
```bash
./deploy_auto.sh
```

El script automáticamente:
- ✅ Hace backup de datos
- ✅ Actualiza código desde Git
- ✅ Reconstruye imágenes
- ✅ Reinicia servicios
- ✅ Verifica que todo funciona

## 📊 Qué Hace el Script `deploy_auto.sh`

1. **Verifica requisitos:** Docker, Docker Compose, Git
2. **Actualiza repositorio:** `git pull` desde el repositorio
3. **Crea estructura:** Directorios necesarios
4. **Hace backup:** Datos existentes antes de actualizar
5. **Configura permisos:** Corrige permisos de directorios
6. **Construye imágenes:** `docker-compose build`
7. **Despliega servicios:** `docker-compose up -d`
8. **Verifica despliegue:** Comprueba que todo funciona

## ⚙️ Configuración del Inicio Automático

Si ejecutaste `setup_autostart.sh`, el servidor:

- ✅ Se despliega automáticamente al iniciar la netbook
- ✅ Se actualiza desde el repositorio al iniciar
- ✅ Se reinicia automáticamente si falla

### Gestión del Servicio

```bash
# Ver estado
sudo systemctl status silo-iot-deploy

# Iniciar manualmente
sudo systemctl start silo-iot-deploy

# Ver logs
sudo journalctl -u silo-iot-deploy -f

# Detener
sudo systemctl stop silo-iot-deploy

# Deshabilitar (si no quieres inicio automático)
sudo systemctl disable silo-iot-deploy
```

## 📝 Variables de Configuración

Puedes personalizar el comportamiento editando las variables al inicio de `deploy_auto.sh`:

```bash
# En deploy_auto.sh o como variables de entorno
export REPO_URL="https://github.com/tu-usuario/tu-repo.git"
export REPO_BRANCH="main"  # o "develop"
export DEPLOY_DIR="$HOME/silo-iot"
export BACKUP_DIR="$HOME/silo-iot-backups"
```

## ✅ Verificación Post-Despliegue

```bash
# Ver estado de contenedores
docker ps

# Ver logs
docker logs iot-backend
docker logs iot-frontend

# Verificar servicios
curl http://localhost:5000  # Frontend
curl http://localhost:3000/health  # Backend
```

## 🎯 Ventajas del Despliegue Automático

- ✅ **Actualización automática:** Siempre con el último código
- ✅ **Reproducible:** Mismo proceso en cualquier máquina
- ✅ **Backup automático:** Datos respaldados antes de cambios
- ✅ **Inicio automático:** Se despliega al arrancar la netbook
- ✅ **Logs:** Historial de todos los despliegues

## 📚 Documentación Completa

Para detalles completos, ver:
- [despliegue.md](despliegue.md) - Documentación completa
- [README_DESPLIEGUE.md](README_DESPLIEGUE.md) - Guía rápida

