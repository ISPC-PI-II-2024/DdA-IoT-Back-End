# 📱 Guía de Configuración de Clientes MQTT

## 🎯 Información del Servidor

### Broker MQTT

- **Host (Red Local):** `192.168.0.45`
- **Host (Internet/Cloudflare):** `tu-tunnel-cloudflare.trycloudflare.com`
- **Puerto TCP:** `1883` (solo red local)
- **Puerto WebSocket:** `9001` (red local)
- **Puerto WebSocket (Cloudflare):** `443` (internet)
- **Path WebSocket:** `/mqtt`
- **Protocolo Local:** `ws://` (WebSocket)
- **Protocolo Internet:** `wss://` (WebSocket Secure)

---

## 📱 Configuración para Celular

### Opción A: MQTT Explorer (Android/iOS)

**Descarga:**
- Android: Play Store - "MQTT Explorer"
- iOS: App Store - "MQTT Explorer"

#### Configuración desde Red Local:

```
Nombre de Conexión: Servidor IoT Silo (Local)
Protocolo: WebSocket (WS)
Host: 192.168.0.45
Puerto: 9001
Path: /mqtt
Client ID: Mi_Celular_001
Username: (dejar vacío)
Password: (dejar vacío)
Keep Alive: 60
Clean Session: ✅
```

#### Configuración desde Internet (Cloudflare):

```
Nombre de Conexión: Servidor IoT Silo (Internet)
Protocolo: WebSocket Secure (WSS)
Host: tu-tunnel-cloudflare.trycloudflare.com
Puerto: 443
Path: /mqtt
Client ID: Mi_Celular_001
Username: (dejar vacío)
Password: (dejar vacío)
Keep Alive: 60
Clean Session: ✅
SSL/TLS: Habilitado
```

**Uso:**
1. Tap en "Connect"
2. Esperar confirmación de conexión
3. Suscribirse a topics: Tap en "Subscribe"
   - Topic: `sensors/#`
   - Topic: `status/#`
   - Topic: `commands/#`
4. Ver mensajes en tiempo real

---

### Opción B: MQTT Dash (Android)

**Descarga:** Play Store - "MQTT Dash"

#### Configurar Conexión:

1. **Nueva Conexión:**
   ```
   Nombre: Servidor IoT Silo
   Broker URL: ws://192.168.0.45:9001/mqtt  (local)
   O: wss://tu-tunnel.com/mqtt  (internet)
   Client ID: Celular_Dash_001
   Keep Alive: 60
   ```

2. **Crear Dashboard:**
   - Widget tipo "Chart" → Topic: `sensors/temperature/#`
   - Widget tipo "Gauge" → Topic: `sensors/humidity/#`
   - Widget tipo "Button" → Publicar en `commands/ESP32_001`

---

### Opción C: MQTT Client (iOS)

**Descarga:** App Store - "MQTT Client"

#### Configuración:

```
Nombre: IoT Silo Server
Host: 192.168.0.45  (local)
O: tu-tunnel.com  (internet)
Port: 9001  (local)
O: 443  (internet)
Protocol: WebSocket
Path: /mqtt
Client ID: iPhone_001
Username: (vacío)
Password: (vacío)
```

---

## 💻 Configuración para VS Code

### Extensión: MQTT Explorer

#### Instalación:

1. Abrir VS Code
2. Ir a Extensions (Ctrl+Shift+X)
3. Buscar "MQTT Explorer"
4. Instalar extensión oficial

#### Configurar Conexión:

1. Abrir panel MQTT Explorer (icono en barra lateral)
2. Click en "+" para nueva conexión
3. Configurar:

**Red Local:**
```json
{
  "name": "IoT Silo Server (Local)",
  "host": "192.168.0.45",
  "port": 9001,
  "protocol": "ws",
  "path": "/mqtt",
  "clientId": "VSCode_001",
  "username": "",
  "password": "",
  "keepAlive": 60,
  "clean": true
}
```

**Internet (Cloudflare):**
```json
{
  "name": "IoT Silo Server (Cloudflare)",
  "host": "tu-tunnel-cloudflare.trycloudflare.com",
  "port": 443,
  "protocol": "wss",
  "path": "/mqtt",
  "clientId": "VSCode_001",
  "username": "",
  "password": "",
  "keepAlive": 60,
  "clean": true,
  "rejectUnauthorized": false
}
```

#### Uso:

1. **Conectar:**
   - Seleccionar conexión
   - Click en "Connect"

2. **Suscribirse:**
   - Click en "Subscribe"
   - Ingresar topic: `sensors/#`
   - QOS: 0
   - Click "Subscribe"

3. **Publicar:**
   - Click en "Publish"
   - Topic: `commands/ESP32_001`
   - Payload: `{"command": "status"}`
   - Click "Publish"

4. **Ver Mensajes:**
   - Los mensajes aparecen en el panel
   - Filtrar por topic
   - Ver historial

---

### Extensión Alternativa: MQTT Client

**Instalación:**
- Buscar "MQTT Client" by Mark Dickson
- Instalar

**Configuración:**

1. Abrir Command Palette (Ctrl+Shift+P)
2. Ejecutar: "MQTT: New Connection"
3. Configurar:

```
Connection Name: IoT Silo Server
Host: 192.168.0.45
Port: 9001
Protocol: ws
Path: /mqtt
Client ID: VSCode_MQTT_001
Username: 
Password: 
```

---

## 🧪 Prueba Rápida de Conexión

### Desde Terminal (Linux/Mac)

```bash
# Instalar cliente MQTT
sudo apt install mosquitto-clients  # Ubuntu/Debian
# o
brew install mosquitto  # Mac

# Nota: mosquitto_sub/pub solo funciona con TCP (puerto 1883), no WebSocket
# Para WebSocket, usar herramientas web o scripts
```

### Desde Navegador (JavaScript)

Abrir consola del navegador (F12) y ejecutar:

```javascript
// Instalar librería: <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>

const clientId = "test_" + Math.random().toString(16).substr(2, 8);
const host = "192.168.0.45";  // Cambiar si usas Cloudflare
const port = 9001;

const client = mqtt.connect(`ws://${host}:${port}/mqtt`, {
    clientId: clientId,
    clean: true,
    reconnectPeriod: 1000
});

client.on("connect", () => {
    console.log("✅ Conectado!");
    client.subscribe("sensors/#");
    
    // Publicar mensaje de prueba
    client.publish("sensors/test", JSON.stringify({
        device: "test",
        value: 25.5,
        timestamp: Date.now()
    }));
});

client.on("message", (topic, message) => {
    console.log(`📨 [${topic}]:`, message.toString());
});
```

---

## 📊 Topics Recomendados para Suscribirse

### Topics de Sensores

```
sensors/temperature/#     → Todas las temperaturas
sensors/humidity/#         → Todas las humedades
sensors/pressure/#         → Todas las presiones
sensors/#                  → Todos los sensores
```

### Topics de Estado

```
status/#                   → Estado de todos los dispositivos
status/ESP32_001           → Estado específico del ESP32_001
```

### Topics de Comandos

```
commands/#                 → Todos los comandos
commands/ESP32_001         → Comandos para ESP32_001
```

### Topics del Sistema

```
$SYS/#                     → Información del broker (si está habilitado)
$SYS/broker/clients/active → Clientes conectados
```

---

## 🔍 Monitoreo en Tiempo Real

### Ver Mensajes en VS Code

1. Suscribirse a `sensors/#`
2. Ver mensajes aparecer en tiempo real
3. Filtrar por topic o dispositivo
4. Copiar mensajes para análisis

### Ver Mensajes en Celular

1. App MQTT Explorer
2. Suscribirse a topics deseados
3. Ver lista de mensajes
4. Filtrar y buscar mensajes específicos

---

## ⚠️ Notas Importantes

### WebSocket vs TCP

- **TCP (puerto 1883):** Solo funciona en red local
- **WebSocket (puerto 9001):** Funciona en red local e internet (vía Cloudflare)
- **Path obligatorio:** Siempre usar `/mqtt` para MQTT sobre WebSocket

### Protocolos

- **Red Local:** Usar `ws://` (WebSocket sin SSL)
- **Internet (Cloudflare):** Usar `wss://` (WebSocket Secure con SSL)

### Puerto Correcto

- **WebSocket Local:** Puerto `9001`
- **WebSocket Cloudflare:** Puerto `443` (HTTPS)

---

## ✅ Checklist de Configuración Cliente

### Celular
- [ ] App instalada (MQTT Explorer, MQTT Dash, etc.)
- [ ] Conexión configurada (host, puerto, path)
- [ ] Protocolo correcto (ws:// local, wss:// internet)
- [ ] Suscripción a topics configurada
- [ ] Mensajes recibiendo correctamente

### VS Code
- [ ] Extensión MQTT instalada
- [ ] Conexión configurada
- [ ] Suscripción a topics
- [ ] Publicación de mensajes funcionando

---

## 🎯 Ejemplo de Uso

### Suscribirse y Ver Datos

1. **Conectar** al broker
2. **Suscribirse** a `sensors/#`
3. **Ver mensajes** llegar en tiempo real desde ESP32
4. **Publicar comando** en `commands/ESP32_001`:
   ```json
   {"command": "status"}
   ```
5. **Ver respuesta** del ESP32 en `status/ESP32_001`

---

**Última actualización:** $(date +%Y-%m-%d)

