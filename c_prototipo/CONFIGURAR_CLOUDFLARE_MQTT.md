# ☁️ Configuración Cloudflare Tunnel para MQTT WebSocket

## 🎯 Objetivo

Configurar un subdominio en Cloudflare (`mqtt.ispciot.org`) para acceder al broker MQTT sobre WebSocket desde internet.

## 📋 Requisitos Previos

- ✅ Dominio en Cloudflare: `ispciot.org`
- ✅ Tunnel de Cloudflare configurado y funcionando
- ✅ Servidor IoT Silo desplegado
- ✅ Mosquitto corriendo con WebSocket en puerto 9001

## 🔧 Configuración del Subdominio

### Paso 1: Configurar Public Hostname en Cloudflare Dashboard

1. **Ir al Dashboard de Cloudflare Zero Trust:**
   - URL: https://one.dash.cloudflare.com/
   - Login con tu cuenta de Cloudflare

2. **Navegar a Networks → Tunnels:**
   - Click en "Networks" (menú lateral)
   - Click en "Tunnels"
   - Seleccionar tu túnel existente (o crear uno nuevo)

3. **Agregar Public Hostname:**
   - Click en "Configure" en tu túnel
   - Ir a la sección "Public Hostname"
   - Click en "Add a public hostname"

4. **Configurar Subdominio para MQTT:**
   ```
   Subdomain: mqtt
   Domain: ispciot.org
   Service Type: HTTP
   URL: http://172.20.0.13:9001
   Path: (dejar vacío o /)
   ```

   **Configuración detallada:**
   - **Subdomain:** `mqtt`
   - **Domain:** `ispciot.org`
   - **Service:** `http://172.20.0.13:9001`
     - `172.20.0.13` es la IP interna del contenedor Mosquitto en Docker
   - **Path:** Dejar vacío o poner `/`
   - **Origin Server Name:** (opcional, dejar vacío)

5. **Guardar configuración:**
   - Click en "Save hostname"
   - El túnel se actualizará automáticamente

### Paso 2: Verificar Configuración DNS (Automático)

Cloudflare configurará automáticamente el registro DNS `CNAME`:
```
mqtt.ispciot.org → (tu-tunnel-id).cfargotunnel.com
```

No necesitas configurar DNS manualmente, Cloudflare lo hace automáticamente.

---

## 📡 URL de Conexión MQTT

### Una vez configurado, la URL será:

```
wss://mqtt.ispciot.org/mqtt
```

**Desglose:**
- **Protocolo:** `wss://` (WebSocket Secure)
- **Host:** `mqtt.ispciot.org`
- **Path:** `/mqtt` (siempre necesario para MQTT sobre WebSocket)
- **Puerto:** `443` (puerto HTTPS estándar, no se especifica)

---

## 🔌 Configuración en Dispositivos

### ESP32

```cpp
// Configuración para internet (Cloudflare)
const char* mqtt_broker_host = "mqtt.ispciot.org";
const int mqtt_broker_port = 443;
const char* mqtt_ws_path = "/mqtt";
bool use_tls = true;  // Usar WSS (WebSocket Secure)
```

### Cliente Celular (MQTT Explorer)

```
Protocolo: WebSocket Secure (WSS)
Host: mqtt.ispciot.org
Puerto: 443
Path: /mqtt
Client ID: Mi_Celular_001
SSL/TLS: Habilitado
```

### Cliente VS Code

```json
{
  "name": "IoT Silo Server (Cloudflare)",
  "host": "mqtt.ispciot.org",
  "port": 443,
  "protocol": "wss",
  "path": "/mqtt",
  "clientId": "VSCode_001",
  "username": "",
  "password": ""
}
```

---

## 🧪 Pruebas de Conexión

### Test 1: Verificar que el Túnel Está Activo

```bash
# En el servidor
docker logs silo-cloudflared | grep mqtt
```

Debe mostrar algo como:
```
INF | https://mqtt.ispciot.org → http://172.20.0.13:9001
```

### Test 2: Probar Conexión desde Navegador

Abrir consola del navegador (F12) y ejecutar:

```javascript
const clientId = "test_" + Math.random().toString(16).substr(2, 8);
const client = mqtt.connect('wss://mqtt.ispciot.org/mqtt', {
    clientId: clientId,
    clean: true,
    reconnectPeriod: 1000
});

client.on('connect', () => {
    console.log('✅ Conectado a MQTT!');
    client.subscribe('sensors/#');
    
    // Publicar mensaje de prueba
    client.publish('sensors/test', JSON.stringify({
        device: 'test',
        value: 25.5,
        timestamp: Date.now()
    }));
});

client.on('message', (topic, message) => {
    console.log('📨 Mensaje:', topic, message.toString());
});
```

### Test 3: Desde el Servidor (Verificación Local)

```bash
# Suscribirse a un topic
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t sensors/# -v

# En otra terminal, publicar mensaje
docker exec -it silo-mosquitto mosquitto_pub -h localhost -t sensors/test -m "Mensaje de prueba desde servidor"
```

---

## 🔍 Verificar Configuración Actual

### Ver Hostnames Configurados en el Túnel

En Cloudflare Dashboard:
1. Networks → Tunnels
2. Click en tu túnel
3. Ver sección "Public Hostname"
4. Debe aparecer:
   - `app.ispciot.org` → (frontend)
   - `mqtt.ispciot.org` → (MQTT WebSocket)

### Ver Logs del Túnel

```bash
# Ver logs en tiempo real
docker logs silo-cloudflared -f

# Debe mostrar algo como:
# INF | https://mqtt.ispciot.org → http://172.20.0.13:9001
```

---

## 📊 Resumen de URLs

### URLs del Servidor IoT Silo

| Servicio | Subdominio | URL Completa |
|----------|-----------|--------------|
| Frontend | `app.ispciot.org` | `https://app.ispciot.org` |
| MQTT WebSocket | `mqtt.ispciot.org` | `wss://mqtt.ispciot.org/mqtt` |
| Backend API | `api.ispciot.org` | `https://api.ispciot.org` (opcional) |

### Configuración Recomendada

1. **Frontend:** `app.ispciot.org` → `http://172.20.0.20:80`
2. **MQTT:** `mqtt.ispciot.org` → `http://172.20.0.13:9001`
3. **Backend:** `api.ispciot.org` → `http://172.20.0.21:3000` (opcional)

---

## 🔧 Configuración Avanzada

### Múltiples Hostnames en un Solo Túnel

Puedes agregar múltiples hostnames al mismo túnel:

1. **Agregar más Public Hostnames:**
   - Click en "Add a public hostname"
   - Configurar cada subdominio

2. **Ejemplo de configuración completa:**
   ```
   app.ispciot.org     → http://172.20.0.20:80      (Frontend)
   mqtt.ispciot.org    → http://172.20.0.13:9001    (MQTT WebSocket)
   api.ispciot.org     → http://172.20.0.21:3000    (Backend API)
   ```

### Verificar IPs de los Contenedores

```bash
# Ver IP del contenedor Mosquitto
docker inspect silo-mosquitto | grep IPAddress

# Debe mostrar: "IPAddress": "172.20.0.13"
```

---

## ✅ Checklist de Configuración

- [ ] Cloudflare Tunnel configurado y corriendo
- [ ] Public Hostname `mqtt.ispciot.org` agregado
- [ ] Túnel apunta a `http://172.20.0.13:9001`
- [ ] Mosquitto corriendo con WebSocket en puerto 9001
- [ ] Logs del túnel muestran URL `mqtt.ispciot.org`
- [ ] Prueba de conexión desde navegador exitosa
- [ ] ESP32 configurado con `mqtt.ispciot.org`
- [ ] Cliente MQTT (celular/VS Code) conectado exitosamente

---

## 🐛 Troubleshooting

### Error: "Connection Refused"

**Causa:** El túnel no está exponiendo el puerto 9001 o Mosquitto no está corriendo.

**Solución:**
```bash
# Verificar que Mosquitto está corriendo
docker ps | grep mosquitto

# Verificar configuración WebSocket
docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf | grep websocket

# Verificar logs del túnel
docker logs silo-cloudflared | grep mqtt
```

### Error: "SSL/TLS Error"

**Causa:** Debe usar `wss://` (WebSocket Secure) para Cloudflare.

**Solución:**
- Usar `wss://mqtt.ispciot.org/mqtt` (con `wss://`)
- NO usar `ws://mqtt.ispciot.org/mqtt` (sin SSL)

### Error: "WebSocket handshake failed"

**Causa:** Path incorrecto o configuración del túnel.

**Solución:**
- Verificar que el path sea `/mqtt`
- Verificar que el túnel apunta a `http://172.20.0.13:9001`
- Verificar que Mosquitto está escuchando en puerto 9001

### El Subdominio No Resuelve

**Causa:** DNS no configurado o túnel no corriendo.

**Solución:**
```bash
# Verificar que el túnel está corriendo
docker ps | grep cloudflared

# Ver logs del túnel
docker logs silo-cloudflared

# Verificar DNS (desde tu máquina)
nslookup mqtt.ispciot.org
# Debe resolver a la IP del túnel de Cloudflare
```

---

## 📚 Recursos Adicionales

- [Documentación Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Configurar Public Hostnames](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configure-tunnels/local-management/ingress/)
- [MQTT sobre WebSocket](https://mosquitto.org/documentation/websockets/)

---

## 📝 Notas Finales

- **URL de Conexión:** `wss://mqtt.ispciot.org/mqtt`
- **Protocolo:** Siempre usar `wss://` (WebSocket Secure) para Cloudflare
- **Puerto:** No especificar puerto (usa 443 por defecto)
- **Path:** Siempre usar `/mqtt` para MQTT sobre WebSocket
- **Configuración:** Una vez configurado, funciona automáticamente

---

**Última actualización:** $(date +%Y-%m-%d)

