# 🔧 Solución de Errores en Actualización

## ❌ Problemas Detectados

### 1. Error de Permisos al Actualizar Git

**Error:**
```
error: unable to unlink old 'c_prototipo/services/silo/mosquitto/config/mosquitto.conf': Permiso denegado
```

**Causa:** El archivo `mosquitto.conf` tiene permisos incorrectos (pertenece a otro usuario).

**Solución:**

```bash
# Corregir permisos antes de actualizar
sudo chown $USER:$USER c_prototipo/services/silo/mosquitto/config/mosquitto.conf

# O desde el directorio raíz del repositorio
sudo chown -R $USER:$USER c_prototipo/services/silo/mosquitto/config/
```

**Prevención:** El script `deploy_auto.sh` ahora corrige permisos automáticamente antes de actualizar.

---

### 2. Error al Construir Backend (Permission Denied)

**Error:**
```
ERROR: failed to build: failed to solve: error from sender: 
open /home/fernandogc/silo-iot/c_prototipo/portainer/data/bin: permission denied
```

**Causa:** Docker está intentando incluir directorios de datos en el build context, y algunos tienen permisos incorrectos.

**Solución Manual:**

```bash
# Opción 1: Corregir permisos de directorios problemáticos
sudo chown -R $USER:$USER c_prototipo/portainer/data/

# Opción 2: Construir desde el directorio del backend directamente
cd c_prototipo/services/frontend/src/C-Prototipo/backend
docker build -f docker/backend.Dockerfile -t iot-backend .
cd ~/silo-iot/c_prototipo

# Opción 3: Excluir directorios de datos del build
# Crear/actualizar .dockerignore en el directorio raíz
echo "portainer/data/*" >> .dockerignore
echo "services/silo/*/data/*" >> .dockerignore
```

**Prevención:** El script `deploy_auto.sh` ahora construye el backend desde su directorio específico.

---

### 3. Error de Cloudflare Tunnel - Hostname Incorrecto

**Error:**
```
error="Unable to reach the origin service. The service may be down or it may not be responding to traffic from cloudflared: dial tcp: lookup iot-frontend on 127.0.0.11:53: no such host"
```

**Causa:** El túnel está intentando usar el nombre del contenedor `iot-frontend` pero no puede resolverlo (problema de red Docker).

**Solución:**

El log muestra que la configuración se actualizó correctamente al final:
```json
{"hostname":"mqtt.ispciot.org", "originRequest":{}, "path":"/", "service":"http://silo-mosquitto:9001"}
```

Pero todavía hay errores de conexión. Verificar:

1. **Verificar que los contenedores están en la misma red:**
   ```bash
   docker network inspect c_prototipo_silo-network
   ```

2. **Verificar que el contenedor tiene el nombre correcto:**
   ```bash
   docker ps | grep mosquitto
   # Debe mostrar: silo-mosquitto
   ```

3. **Verificar que el servicio está escuchando:**
   ```bash
   docker exec -it silo-mosquitto netstat -tlnp | grep 9001
   # Debe mostrar que está escuchando en 0.0.0.0:9001
   ```

4. **Probar conexión desde dentro del túnel:**
   ```bash
   docker exec -it silo-cloudflared ping silo-mosquitto
   ```

---

### 4. Error de MQTT - Connection Refused

**Error en logs:**
```
error="dial tcp 172.18.0.13:9001: connect: connection refused"
```

**Causa:** El túnel está intentando conectarse a una IP incorrecta o el puerto 9001 no está abierto.

**Solución:**

1. **Verificar que Mosquitto está escuchando en puerto 9001:**
   ```bash
   docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf | grep 9001
   ```

2. **Verificar que el puerto está expuesto:**
   ```bash
   docker ps | grep mosquitto
   # Debe mostrar: 0.0.0.0:9001->9001/tcp
   ```

3. **Verificar la configuración del túnel en Cloudflare Dashboard:**
   - El servicio debe ser: `http://silo-mosquitto:9001`
   - NO debe ser: `http://iot-frontend:9001` (esto es incorrecto)

4. **Reiniciar servicios:**
   ```bash
   docker-compose restart silo-mosquitto
   docker-compose restart silo-cloudflared
   ```

---

## ✅ Soluciones Implementadas en el Script

El script `deploy_auto.sh` ahora:

1. **Corrige permisos automáticamente** antes de actualizar Git
2. **Resetea cambios en archivos de datos** antes de hacer pull
3. **Construye el backend desde su directorio** para evitar problemas de build context
4. **Excluye directorios problemáticos** del build

---

## 🔍 Verificación Post-Actualización

### 1. Verificar Servicios

```bash
docker-compose ps
```

Todos deben mostrar "Up" sin "Restarting".

### 2. Verificar MQTT

```bash
# Verificar que Mosquitto está corriendo
docker ps | grep mosquitto

# Verificar configuración WebSocket
docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf | grep websocket

# Probar conexión local
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t test/# -v &
docker exec -it silo-mosquitto mosquitto_pub -h localhost -t test/mensaje -m "Hola"
```

### 3. Verificar Cloudflare Tunnel

```bash
# Ver configuración actual
docker logs silo-cloudflared | grep "mqtt.ispciot.org"

# Debe mostrar algo como:
# "hostname":"mqtt.ispciot.org", "service":"http://silo-mosquitto:9001"
```

### 4. Probar Conexión MQTT desde Internet

Usar un cliente MQTT (celular, VS Code) y conectar a:
```
wss://mqtt.ispciot.org/mqtt
```

---

## 📝 Pasos de Corrección Manual

Si los problemas persisten después de actualizar el script:

### Paso 1: Corregir Permisos

```bash
cd ~/silo-iot/c_prototipo

# Corregir permisos de mosquitto.conf
sudo chown $USER:$USER services/silo/mosquitto/config/mosquitto.conf

# Corregir permisos de otros archivos problemáticos
sudo chown -R $USER:$USER portainer/data/ 2>/dev/null || true
```

### Paso 2: Resetear Git

```bash
cd ~/silo-iot

# Ver archivos modificados
git status

# Resetear archivos de datos (no subir al repo)
git checkout -- c_prototipo/services/silo/*/data/
git checkout -- c_prototipo/services/silo/*/log/
git checkout -- c_prototipo/portainer/data/
git checkout -- c_prototipo/nginx-proxy-manager/data/

# Actualizar código
git pull origin main
```

### Paso 3: Reconstruir Backend

```bash
cd ~/silo-iot/c_prototipo

# Detener servicios
docker-compose down

# Construir backend desde su directorio
cd services/frontend/src/C-Prototipo/backend
docker build -f docker/backend.Dockerfile -t iot-backend .

# Volver y levantar servicios
cd ~/silo-iot/c_prototipo
docker-compose up -d
```

### Paso 4: Verificar Configuración Cloudflare

1. Ir a https://one.dash.cloudflare.com/
2. Zero Trust → Networks → Tunnels
3. Editar tu túnel
4. Verificar que `mqtt.ispciot.org` apunta a:
   - Service: `http://silo-mosquitto:9001`
   - NO a: `http://iot-frontend:9001` (incorrecto)

---

## 🔄 Script de Corrección Rápida

```bash
#!/bin/bash
# Script de corrección rápida

cd ~/silo-iot/c_prototipo

echo "Corrigiendo permisos..."
sudo chown $USER:$USER services/silo/mosquitto/config/mosquitto.conf
sudo chown -R $USER:$USER portainer/data/ 2>/dev/null || true

echo "Reseteando archivos de datos en Git..."
git checkout -- services/silo/*/data/ 2>/dev/null || true
git checkout -- services/silo/*/log/ 2>/dev/null || true
git checkout -- portainer/data/ 2>/dev/null || true

echo "Reconstruyendo backend..."
cd services/frontend/src/C-Prototipo/backend
docker build -f docker/backend.Dockerfile -t iot-backend . || echo "Error construyendo backend"

echo "Reiniciando servicios..."
cd ~/silo-iot/c_prototipo
docker-compose restart silo-mosquitto
docker-compose restart silo-cloudflared

echo "✅ Corrección completada"
```

---

**Última actualización:** $(date +%Y-%m-%d)

