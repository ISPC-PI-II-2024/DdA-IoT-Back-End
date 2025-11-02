# 🚀 Guía de Despliegue - Servidor IoT Silo

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Despliegue Automático desde Repositorio](#despliegue-automático-desde-repositorio) ⭐ **NUEVO**
3. [Preparación del Entorno](#preparación-del-entorno)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Configuración de Permisos](#configuración-de-permisos)
6. [Construcción y Despliegue Manual](#construcción-y-despliegue-manual)
7. [Configuración de Autenticación](#configuración-de-autenticación)
8. [Configuración de Cloudflare Tunnel](#configuración-de-cloudflare-tunnel)
9. [Inicio Automático del Servidor](#inicio-automático-del-servidor) ⭐ **NUEVO**
10. [Verificación y Pruebas](#verificación-y-pruebas)
11. [Troubleshooting](#troubleshooting)
12. [Actualizaciones](#actualizaciones)

---

## 📌 Requisitos Previos

### Software Necesario

- **Docker** (versión 20.10 o superior)
- **Docker Compose** (versión 1.29 o superior)
- **Git** (para clonar repositorios)
- **SSH** (para acceso remoto al servidor)
- **Nano/Vim** (editor de texto en el servidor)

### Verificar Instalación

```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar que el servicio Docker está corriendo
sudo systemctl status docker
```

### Configuración del Sistema

```bash
# Agregar usuario al grupo docker (si es necesario)
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🚀 Despliegue Automático desde Repositorio

### Para Netbook Remota - Despliegue Inicial

Este método es ideal para despliegue en netbook remota que se actualiza automáticamente desde el repositorio Git.

#### Paso 1: Preparar la Netbook

```bash
# 1. Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Instalar Git
sudo apt update
sudo apt install -y git  # Ubuntu/Debian
# o
sudo yum install -y git  # CentOS/RHEL

# 3. Clonar el repositorio del proyecto
cd ~
git clone https://github.com/ISPC-PI-II-2024/DdA-IoT-Back-End.git silo-iot
cd silo-iot/c_prototipo
```

#### Paso 2: Configurar Variables de Entorno

```bash
# 1. Copiar template de .env
cp .env.example .env

# 2. Editar con tus configuraciones
nano .env

# Configurar al menos:
# - JWT_SECRET (generar nuevo)
# - GOOGLE_CLIENT_ID
# - Contraseñas de bases de datos
# - ADMIN_WHITELIST (tu correo)
```

#### Paso 3: Ejecutar Despliegue Automático

```bash
# Dar permisos de ejecución
chmod +x deploy_auto.sh

# Ejecutar despliegue
./deploy_auto.sh
```

El script automáticamente:
- ✅ Verifica requisitos (Docker, Git)
- ✅ Clona/actualiza el repositorio
- ✅ Crea estructura de directorios
- ✅ Hace backup de datos existentes
- ✅ Configura permisos
- ✅ Construye imágenes Docker
- ✅ Despliega todos los servicios
- ✅ Verifica que todo funciona

#### Paso 4: Configurar Inicio Automático (Opcional)

Para que el servidor se despliegue automáticamente al iniciar la netbook:

```bash
# Configurar servicio systemd
chmod +x setup_autostart.sh
./setup_autostart.sh
```

Esto creará un servicio systemd que:
- Se ejecuta automáticamente al iniciar el sistema
- Actualiza el código desde el repositorio
- Despliega todos los servicios
- Se reinicia si falla

### Actualizar Servidor Remoto

Para actualizar el servidor con los últimos cambios del repositorio:

```bash
cd ~/silo-iot/c_prototipo

# Opción 1: Ejecutar script de actualización
chmod +x update_server.sh
./update_server.sh

# Opción 2: Ejecutar despliegue automático directamente
./deploy_auto.sh

# Opción 3: Si está configurado como servicio
sudo systemctl start silo-iot-deploy
```

### Variables de Configuración del Script

Puedes personalizar el comportamiento del script con variables de entorno:

```bash
# En ~/.bashrc o antes de ejecutar el script
export REPO_URL="https://github.com/tu-usuario/tu-repo.git"
export REPO_BRANCH="main"  # o "develop"
export DEPLOY_DIR="$HOME/silo-iot"
export BACKUP_DIR="$HOME/silo-iot-backups"

# Ejecutar script
./deploy_auto.sh
```

### Ventajas del Despliegue Automático

- ✅ **Actualización automática:** Código siempre actualizado desde el repo
- ✅ **Backup automático:** Datos respaldados antes de cada actualización
- ✅ **Reproducible:** Mismo proceso en cualquier máquina
- ✅ **Verificación incluida:** Verifica que todo funciona correctamente
- ✅ **Logs:** Guarda logs de cada despliegue
- ✅ **Recuperación:** Fácil de restaurar si algo falla

---

## 🗂️ Preparación del Entorno

### 1. Estructura de Directorios

El proyecto debe tener la siguiente estructura:

```
c_prototipo/
├── backend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   └── package.json
├── docker-compose.yml
├── backend.Dockerfile
├── frontend.Dockerfile
├── .env
├── init/
│   └── 01-init.sql
├── services/
│   └── silo/
│       ├── mariadb/
│       ├── influxdb/
│       ├── mosquitto/
│       ├── grafana/
│       ├── nodered/
│       └── telegraf/
├── portainer/
└── nginx-proxy-manager/
```

### 2. Crear Estructura de Directorios

```bash
cd c_prototipo

# Crear directorios si no existen
mkdir -p services/silo/{mariadb,influxdb,mosquitto,grafana,nodered,telegraf}/{data,config}
mkdir -p services/silo/mosquitto/log
mkdir -p portainer/data
mkdir -p nginx-proxy-manager/data
mkdir -p init
```

---

## 🔧 Configuración de Variables de Entorno

### 1. Crear Archivo .env

Crear archivo `.env` en `c_prototipo/`:

```bash
cd c_prototipo
nano .env
```

### 2. Plantilla de Variables (.env)

```env
# =========================
# Node / Server
# =========================
NODE_ENV=production
PORT=3000

# =========================
# JWT (Generar una nueva clave segura)
# =========================
# Generar: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=tu_jwt_secret_aqui_minimo_24_caracteres
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# =========================
# Google Identity (OAuth)
# =========================
GOOGLE_CLIENT_ID=tu_google_client_id_aqui

# =========================
# Listas Blancas de Usuarios
# =========================
# IMPORTANTE: Agregar tu correo aquí para acceso admin
ADMIN_WHITELIST=tu_email@gmail.com,otro_admin@email.com
ACTION_WHITELIST=

# =========================
# CORS
# =========================
# Agregar orígenes permitidos (protocolo+host+puerto)
CORS_ORIGIN=http://192.168.0.45:5000,http://localhost:5000,https://tu-dominio.cloudflare.com

# =========================
# Base de Datos MariaDB/MySQL
# =========================
MYSQL_ROOT_PASSWORD=root_password_seguro_aqui
MYSQL_DATABASE=silo_db
MYSQL_USER=silo_user
MYSQL_PASSWORD=user_password_seguro_aqui

# =========================
# InfluxDB
# =========================
INFLUXDB_HOST=silo-influxdb
INFLUXDB_PORT=8086
INFLUXDB_DB=metricas_silo
INFLUXDB_ADMIN_USER=admin
INFLUXDB_ADMIN_PASSWORD=admin_password_seguro_aqui
INFLUXDB_USER=telegraf_user
INFLUXDB_USER_PASSWORD=telegraf_password_aqui

# =========================
# Grafana
# =========================
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=grafana_password_seguro_aqui

# =========================
# MQTT Broker
# =========================
MQTT_BROKER_HOST=silo-mosquitto
MQTT_BROKER_PORT=1883
MQTT_BROKER_USERNAME=
MQTT_BROKER_PASSWORD=

# =========================
# Modo de Desarrollo (Opcional)
# =========================
DEV_MODE=false
DEV_USER_EMAIL=dev@localhost.com
DEV_USER_NAME=Desarrollador Local

# =========================
# Cloudflare Tunnel (Opcional)
# =========================
CLOUDFLARE_TUNNEL_TOKEN=tu_token_aqui
```

### 3. Generar JWT Secret

```bash
# En el servidor o localmente
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiar el resultado en `JWT_SECRET`.

---

## 🔐 Configuración de Autenticación

### Agregar Usuario Administrador

**Importante:** El sistema usa la base de datos para determinar roles. Hay dos métodos:

#### Método 1: Directamente en la Base de Datos (Recomendado)

1. Conectar a MariaDB:
   ```bash
   # Usar Adminer o conexión directa
   docker exec -it silo-mariadb mysql -u root -p${MYSQL_ROOT_PASSWORD}
   ```

2. Seleccionar la base de datos:
   ```sql
   USE silo_db;
   ```

3. Ver usuarios existentes:
   ```sql
   SELECT * FROM usuarios_google;
   ```

4. Agregar o actualizar usuario como admin:
   ```sql
   -- Si el usuario ya existe
   UPDATE usuarios_google 
   SET admin = TRUE, activo = TRUE 
   WHERE mail = 'tu_email@gmail.com';
   
   -- Si el usuario no existe, crearlo
   INSERT INTO usuarios_google (mail, admin, action, activo) 
   VALUES ('tu_email@gmail.com', TRUE, FALSE, TRUE);
   ```

5. Verificar:
   ```sql
   SELECT mail, admin, action, activo FROM usuarios_google WHERE mail = 'tu_email@gmail.com';
   ```

#### Método 2: Usando Adminer (Interfaz Web)

1. Acceder a Adminer: http://192.168.0.45:8080
2. Conectar a MariaDB:
   - Sistema: `MySQL`
   - Servidor: `silo-mariadb`
   - Usuario: `root`
   - Contraseña: (tu `MYSQL_ROOT_PASSWORD`)
   - Base de datos: `silo_db`
3. Ir a la tabla `usuarios_google`
4. Editar o insertar usuario con `admin = 1`

#### Verificar Configuración

```bash
# Verificar que el usuario está en la base de datos
docker exec -it silo-mariadb mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE silo_db; SELECT mail, admin FROM usuarios_google WHERE admin = TRUE;"

# Reiniciar backend si hiciste cambios
docker-compose restart iot-backend

# Ver logs para confirmar
docker logs iot-backend | grep -i admin
```

### Proceso de Autenticación

1. El usuario inicia sesión con Google OAuth en el frontend
2. El frontend envía el token de Google al backend en `/api/auth/google`
3. El backend verifica el token con Google y obtiene el email del usuario
4. El backend consulta la base de datos `usuarios_google`:
   - Si `admin = TRUE` → rol = `"admin"`
   - Si `action = TRUE` → rol = `"action"`
   - Si no → rol = `"readonly"`
5. El backend genera un JWT con el rol incluido
6. El frontend guarda el JWT y lo usa para futuras peticiones

### Nota sobre ADMIN_WHITELIST

La variable `ADMIN_WHITELIST` en el `.env` está disponible pero el sistema actual determina roles desde la base de datos. La whitelist puede ser usada para scripts de migración o configuración inicial.

---

## 📁 Configuración de Permisos

### Ejecutar Script de Permisos

```bash
cd c_prototipo

# Si existe script de permisos
chmod +x fix_permissions.sh
sudo ./fix_permissions.sh
```

### Configuración Manual de Permisos

```bash
# Node-RED
sudo chown -R 1000:1000 services/silo/nodered/data

# Grafana
sudo chown -R 472:0 services/silo/grafana/data

# Mosquitto
sudo chown -R 1883:1883 services/silo/mosquitto/data
sudo chown -R 1883:1883 services/silo/mosquitto/log

# InfluxDB
sudo chown -R 1000:1000 services/silo/influxdb/data

# MariaDB
sudo chown -R 999:999 services/silo/mariadb/data

# Telegraf (si tiene directorio de config)
sudo chown -R $USER:$USER services/silo/telegraf/config
```

---

## 🐳 Construcción y Despliegue Manual

> **Nota:** Si usas el despliegue automático (`deploy_auto.sh`), puedes saltar esta sección.

### Para despliegue manual (sin Git):

### 1. Construir Imágenes

```bash
cd c_prototipo

# Construir todas las imágenes
docker-compose build

# O construir servicios específicos
docker-compose build iot-backend
docker-compose build iot-frontend
```

### 2. Iniciar Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs de inicio
docker-compose logs -f
```

### 3. Verificar Estado

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Todos deben mostrar "Up" (sin "Restarting")
```

### 4. Servicios Disponibles

| Servicio | URL Local | Puerto |
|----------|-----------|--------|
| **Frontend** | http://192.168.0.45:5000 | 5000 |
| **Backend API** | http://192.168.0.45:3000 | 3000 |
| **Portainer** | http://192.168.0.45:9000 | 9000 |
| **Nginx Proxy** | http://192.168.0.45:81 | 81 |
| **Grafana** | http://192.168.0.45:3000 | (interno) |
| **Node-RED** | http://192.168.0.45:1880 | 1880 |
| **Mosquitto MQTT** | 192.168.0.45:1883 | 1883 |
| **Mosquitto WebSocket** | ws://192.168.0.45:9001 | 9001 |

---

## ☁️ Configuración de Cloudflare Tunnel

### Opción A: Túnel Manual (Rápido)

```bash
# Detener túnel actual si existe
docker stop silo-cloudflared 2>/dev/null
docker rm silo-cloudflared 2>/dev/null

# Crear túnel temporal
docker run -d --name silo-cloudflared --restart unless-stopped \
  --network c_prototipo_silo-network \
  cloudflare/cloudflared:latest tunnel \
  --url http://iot-frontend:80 \
  --url http://iot-backend:3000

# Ver URL del túnel
docker logs silo-cloudflared -f
```

### Opción B: Configuración Permanente

1. Obtener token de Cloudflare:
   - Ir a https://one.dash.cloudflare.com/
   - Zero Trust → Networks → Tunnels
   - Create tunnel
   - Copiar el token

2. Agregar al .env:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=tu_token_aqui
   ```

3. Descomentar cloudflared en docker-compose.yml:
   ```yaml
   cloudflared:
     image: cloudflare/cloudflared:latest
     container_name: silo-cloudflared
     restart: unless-stopped
     command:
       - "tunnel"
       - "--no-autoupdate"
       - "run"
       - "--token"
       - "${CLOUDFLARE_TUNNEL_TOKEN}"
     networks:
       - silo-network
   ```

4. Reiniciar:
   ```bash
   docker-compose up -d cloudflared
   ```

---

## ✅ Verificación y Pruebas

### 1. Verificar Estado de Contenedores

```bash
docker-compose ps
```

Todos deben mostrar "Up" sin "Restarting".

### 2. Verificar Logs

```bash
# Ver todos los logs
docker-compose logs

# Ver logs de un servicio específico
docker-compose logs iot-backend
docker-compose logs iot-frontend

# Seguir logs en tiempo real
docker-compose logs -f
```

### 3. Probar Endpoints

```bash
# Health check del backend
curl http://localhost:3000/health

# Verificar configuración
curl http://localhost:3000/api/config
```

### 4. Probar Frontend

1. Abrir navegador: http://192.168.0.45:5000
2. Intentar login con Google OAuth
3. Verificar que aparece tu correo en ADMIN_WHITELIST
4. Verificar acceso a dashboard

### 5. Probar MQTT

```bash
# Suscribirse a un topic
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t test/topic

# En otra terminal, publicar
docker exec -it silo-mosquitto mosquitto_pub -h localhost -t test/topic -m "Hola mundo"
```

---

## 🐛 Troubleshooting

### Problema: Contenedor no inicia

```bash
# Ver logs detallados
docker logs <nombre-contenedor> -n 50

# Verificar errores
docker-compose logs <servicio>
```

### Problema: Error de permisos

```bash
# Ejecutar script de permisos
sudo ./fix_permissions.sh

# O manualmente
sudo chown -R 1000:1000 services/silo/nodered/data
sudo chown -R 472:0 services/silo/grafana/data
```

### Problema: No puedo acceder como admin

1. Verificar que tu correo está en ADMIN_WHITELIST:
   ```bash
   grep ADMIN_WHITELIST .env
   ```

2. Reiniciar backend:
   ```bash
   docker-compose restart iot-backend
   ```

3. Verificar logs:
   ```bash
   docker logs iot-backend | grep -i admin
   ```

### Problema: Backend no conecta a base de datos

```bash
# Verificar que MariaDB está corriendo
docker-compose ps silo-mariadb

# Ver logs de MariaDB
docker logs silo-mariadb

# Verificar variables de entorno
docker exec iot-backend env | grep MYSQL
```

### Problema: Frontend no se conecta al backend

```bash
# Verificar que backend está corriendo
docker-compose ps iot-backend

# Verificar logs del backend
docker logs iot-backend

# Verificar CORS_ORIGIN incluye la URL del frontend
grep CORS_ORIGIN .env
```

### Problema: Cloudflare Tunnel error 502

```bash
# Verificar que el túnel apunta al puerto correcto
# Frontend usa puerto 80 internamente (no 5000)
docker logs silo-cloudflared

# Reiniciar túnel
docker restart silo-cloudflared
```

---

## ⚙️ Inicio Automático del Servidor

### Configurar Servicio Systemd (Netbook Remota)

Para que el servidor se despliegue automáticamente al iniciar la netbook:

```bash
cd c_prototipo

# Configurar servicio
chmod +x setup_autostart.sh
./setup_autostart.sh
```

Esto crea un servicio systemd que:
- Se ejecuta al inicio del sistema
- Actualiza código desde el repositorio
- Despliega todos los servicios automáticamente

### Gestión del Servicio

```bash
# Ver estado
sudo systemctl status silo-iot-deploy

# Iniciar manualmente
sudo systemctl start silo-iot-deploy

# Detener
sudo systemctl stop silo-iot-deploy

# Ver logs
sudo journalctl -u silo-iot-deploy -f

# Deshabilitar (si no quieres inicio automático)
sudo systemctl disable silo-iot-deploy
```

### Verificación de Inicio Automático

```bash
# Reiniciar la netbook
sudo reboot

# Después de reiniciar, verificar que los servicios están corriendo
docker ps
docker-compose -f ~/silo-iot/c_prototipo/docker-compose.yml ps
```

---

## 🔄 Actualizaciones

### Actualización Automática desde Repositorio

**Método Recomendado (con script):**

```bash
cd ~/silo-iot/c_prototipo

# Ejecutar script de actualización
./update_server.sh

# O directamente
./deploy_auto.sh
```

El script automáticamente:
1. Hace backup de datos
2. Actualiza código desde Git
3. Reconstruye imágenes
4. Reinicia servicios
5. Verifica que todo funciona

### Actualización Manual

```bash
cd ~/silo-iot/c_prototipo

# 1. Hacer backup
docker-compose down

# 2. Actualizar código
git pull origin main

# 3. Reconstruir imágenes
docker-compose build

# 4. Reiniciar servicios
docker-compose up -d

# 5. Verificar
docker-compose ps
```

### Actualizar Variables de Entorno

```bash
# 1. Editar .env
nano .env

# 2. Reiniciar servicios afectados
docker-compose restart iot-backend

# 3. Verificar cambios
docker logs iot-backend
```

### Agregar Nuevo Usuario Admin

1. Editar `.env`:
   ```env
   ADMIN_WHITELIST=admin1@email.com,admin2@email.com,tu_email@gmail.com
   ```

2. Reiniciar backend:
   ```bash
   docker-compose restart iot-backend
   ```

---

## 📊 Monitoreo

### Portainer

Acceder a http://192.168.0.45:9000 para:
- Ver estado de contenedores
- Ver logs en tiempo real
- Monitorear recursos (CPU, RAM)
- Gestionar contenedores

### Logs Persistentes

Los logs se guardan en:
- Mosquitto: `services/silo/mosquitto/log/mosquitto.log`
- Grafana: `services/silo/grafana/data/logs/`

### Métricas

- **Grafana:** http://192.168.0.45:3000 (puerto interno, configurar proxy)
- **InfluxDB:** Datos de series temporales en `services/silo/influxdb/data`

---

## 📝 Notas Importantes

### Seguridad

- ⚠️ **NUNCA** commitar el archivo `.env` al repositorio
- Usar contraseñas seguras en producción
- El `JWT_SECRET` debe ser único y seguro
- El token de Cloudflare debe mantenerse confidencial

### Backup

Realizar backups regulares de:
- Base de datos MariaDB: `services/silo/mariadb/data`
- Base de datos InfluxDB: `services/silo/influxdb/data`
- Configuración Grafana: `services/silo/grafana/data`
- Configuración Portainer: `portainer/data`

### Red

Todos los servicios corren en la red Docker `silo-network`:
- Red: `bridge`
- Comunicación interna por nombres de servicio
- Ejemplo: `silo-mariadb`, `silo-mosquitto`, `iot-backend`

---

## ✅ Checklist de Despliegue

### Antes de Desplegar

- [ ] Docker y Docker Compose instalados
- [ ] Estructura de directorios creada
- [ ] Archivo `.env` configurado
- [ ] `JWT_SECRET` generado
- [ ] `ADMIN_WHITELIST` configurado con tu correo
- [ ] `GOOGLE_CLIENT_ID` configurado
- [ ] Permisos de directorios corregidos

### Despliegue

- [ ] Servicios construidos (`docker-compose build`)
- [ ] Servicios iniciados (`docker-compose up -d`)
- [ ] Todos los contenedores en estado "Up"
- [ ] Logs sin errores críticos
- [ ] Frontend accesible
- [ ] Backend responde a `/health`

### Post-Despliegue

- [ ] Login con Google OAuth funciona
- [ ] Acceso admin funciona
- [ ] MQTT funciona
- [ ] Conexión a bases de datos funciona
- [ ] Cloudflare Tunnel configurado (si aplica)
- [ ] Portainer accesible
- [ ] Grafana configurado

---

## 📞 Soporte

Para problemas o dudas:
1. Revisar logs: `docker-compose logs`
2. Verificar estado: `docker-compose ps`
3. Consultar esta documentación
4. Revisar configuración en `.env`

---

---

## 📝 Notas Adicionales

### Para Netbook Remota

- **Primera vez:** Ejecutar `deploy_auto.sh` después de configurar `.env`
- **Actualizaciones:** Ejecutar `update_server.sh` para obtener últimos cambios
- **Inicio automático:** Configurar con `setup_autostart.sh` si quieres despliegue automático al iniciar
- **Variables personalizadas:** Editar `.env` según tu entorno

### Ubicación de Archivos

- **Código:** `~/silo-iot/` (o `$DEPLOY_DIR`)
- **Backups:** `~/silo-iot-backups/` (o `$BACKUP_DIR`)
- **Logs:** `~/silo-iot-deploy.log`
- **Configuración:** `~/silo-iot/c_prototipo/.env`

### Comandos Rápidos

```bash
# Actualizar servidor
cd ~/silo-iot/c_prototipo && ./update_server.sh

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar todo
docker-compose restart
```

---

**Última actualización:** $(date +%Y-%m-%d)

