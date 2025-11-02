# 📡 Guía de Conexión MQTT sobre WebSocket

## 🎯 Objetivo

Conectar dispositivos IoT (ESP32, sensores, etc.) y clientes MQTT al servidor mediante MQTT sobre WebSocket, ya que Cloudflare Tunnel no soporta MQTT nativo (puerto 1883).

## 📊 Configuración del Servidor

### Información del Broker MQTT

- **Broker:** Mosquitto
- **Puerto TCP MQTT:** 1883 (solo red local)
- **Puerto WebSocket MQTT:** 9001 (accesible vía Cloudflare)
- **IP Local del Broker:** 172.20.0.13 (red interna Docker)
- **IP Servidor:** 192.168.0.45 (red local)
- **URL Tunnel Cloudflare:** (tu URL del túnel)

### Verificar que WebSocket está Habilitado

```bash
# En el servidor
docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf
```

Debe incluir:
```
listener 9001 0.0.0.0
protocol websockets
allow_anonymous true
```

## 🔌 Conexión desde ESP32

### Librerías Necesarias

Para ESP32, usar **AsyncMqttClient** que soporta MQTT sobre WebSocket nativamente.

**Nota:** PubSubClient no soporta WebSocket directamente. Se recomienda usar AsyncMqttClient.

#### Instalación de Librerías (PlatformIO)

En `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    links2004/WebSockets@^2.4.1
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^6.21.3
```

#### Instalación de Librerías (Arduino IDE)

1. **WebSocketsClient:**
   - Library Manager → Buscar "WebSockets" por Markus Sattler
   - Instalar versión 2.4.1 o superior

2. **PubSubClient:**
   - Library Manager → Buscar "PubSubClient" por Nick O'Leary
   - Instalar versión 2.8 o superior

### Código Ejemplo para ESP32

```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================
// CONFIGURACIÓN WIFI
// ============================
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// ============================
// CONFIGURACIÓN MQTT WEBSOCKET
// ============================
// Opción 1: Desde red local
const char* mqtt_ws_host = "192.168.0.45";  // IP del servidor
const int mqtt_ws_port = 9001;

// Opción 2: Desde internet (Cloudflare Tunnel)
// const char* mqtt_ws_host = "tu-tunnel.cloudflare.com";  // Sin protocolo
// const int mqtt_ws_port = 443;  // HTTPS para Cloudflare

const char* mqtt_client_id = "ESP32_Client_001";
const char* mqtt_username = "";  // Opcional
const char* mqtt_password = "";  // Opcional

// ============================
// TOPICS MQTT
// ============================
const char* topic_temperatura = "sensors/temperature/ESP32_001";
const char* topic_humedad = "sensors/humidity/ESP32_001";
const char* topic_comandos = "commands/ESP32_001";
const char* topic_status = "status/ESP32_001";

// Instancias
WebSocketsClient webSocket;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ============================
// CALLBACK MQTT
// ============================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print("Mensaje recibido [");
    Serial.print(topic);
    Serial.print("]: ");
    
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';
    
    Serial.println(message);
    
    // Procesar comando recibido
    if (strcmp(topic, topic_comandos) == 0) {
        // Ejemplo: comando para cambiar estado
        DynamicJsonDocument doc(1024);
        deserializeJson(doc, message);
        
        String comando = doc["command"];
        Serial.println("Comando recibido: " + comando);
        
        // Ejecutar comando según el tipo
        if (comando == "reboot") {
            ESP.restart();
        } else if (comando == "led_on") {
            // digitalWrite(LED_PIN, HIGH);
        }
    }
}

// ============================
// FUNCIÓN CONECTAR WIFI
// ============================
void setupWiFi() {
    Serial.println("Conectando a WiFi...");
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("");
    Serial.println("WiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
}

// ============================
// FUNCIÓN CONECTAR MQTT
// ============================
void connectMQTT() {
    Serial.println("Conectando a MQTT sobre WebSocket...");
    
    // Construir URL WebSocket
    String ws_url = String("ws://") + String(mqtt_ws_host) + ":" + String(mqtt_ws_port) + "/mqtt";
    
    // Para Cloudflare Tunnel (HTTPS):
    // String ws_url = String("wss://") + String(mqtt_ws_host) + "/mqtt";
    
    webSocket.begin(mqtt_ws_host, mqtt_ws_port, "/mqtt");
    
    // Configurar PubSubClient para usar WebSocket
    mqttClient.setServer(mqtt_ws_host, mqtt_ws_port);
    mqttClient.setCallback(mqttCallback);
    
    // Intentar conectar
    while (!mqttClient.connected()) {
        Serial.print("Intentando conectar MQTT...");
        
        if (mqttClient.connect(mqtt_client_id, mqtt_username, mqtt_password)) {
            Serial.println("Conectado!");
            
            // Suscribirse a topics
            mqttClient.subscribe(topic_comandos);
            mqttClient.subscribe("sensors/#");
            
            // Publicar estado
            publishStatus("online");
            
        } else {
            Serial.print("Falló, rc=");
            Serial.print(mqttClient.state());
            Serial.println(" Reintentando en 5 segundos...");
            delay(5000);
        }
    }
}

// ============================
// PUBLICAR DATOS
// ============================
void publishSensorData(float temperatura, float humedad) {
    DynamicJsonDocument doc(512);
    doc["device_id"] = "ESP32_001";
    doc["temperature"] = temperatura;
    doc["humidity"] = humedad;
    doc["timestamp"] = millis();
    doc["location"] = "Silo_Principal";
    
    String payload;
    serializeJson(doc, payload);
    
    // Publicar temperatura
    mqttClient.publish(topic_temperatura, payload.c_str());
    
    // Publicar humedad
    mqttClient.publish(topic_humedad, payload.c_str());
}

void publishStatus(const char* status) {
    DynamicJsonDocument doc(256);
    doc["device_id"] = "ESP32_001";
    doc["status"] = status;
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["timestamp"] = millis();
    
    String payload;
    serializeJson(doc, payload);
    
    mqttClient.publish(topic_status, payload.c_str());
}

// ============================
// SETUP
// ============================
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("=== ESP32 MQTT WebSocket Client ===");
    
    setupWiFi();
    delay(1000);
    connectMQTT();
}

// ============================
// LOOP
// ============================
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;

void loop() {
    // Mantener conexión MQTT
    if (!mqttClient.connected()) {
        connectMQTT();
    }
    mqttClient.loop();
    
    // Leer sensores cada 10 segundos
    if (millis() - lastSensorRead > 10000) {
        // Simular lectura de sensores (reemplazar con lectura real)
        float temp = random(200, 350) / 10.0;  // 20.0°C - 35.0°C
        float hum = random(400, 900) / 10.0;   // 40.0% - 90.0%
        
        publishSensorData(temp, hum);
        lastSensorRead = millis();
    }
    
    // Heartbeat cada 60 segundos
    if (millis() - lastHeartbeat > 60000) {
        publishStatus("online");
        lastHeartbeat = millis();
    }
    
    delay(100);
}
```

### Configuración para Cloudflare Tunnel

Si usas Cloudflare Tunnel, cambiar la URL:

```cpp
// Para Cloudflare Tunnel (HTTPS/WSS)
const char* mqtt_ws_host = "tu-tunnel-cloudflare.trycloudflare.com";  // Sin http://
const int mqtt_ws_port = 443;

// En connectMQTT(), usar wss://
String ws_url = String("wss://") + String(mqtt_ws_host) + "/mqtt";
```

**Nota:** El túnel de Cloudflare debe estar configurado para exponer el puerto 9001 del servidor Mosquitto.

## 📱 Configuración para Cliente MQTT en Celular

### App Recomendada: MQTT Explorer / MQTT Dash

#### MQTT Explorer (Android/iOS)

1. **Descargar App:** MQTT Explorer desde Play Store / App Store

2. **Configuración de Conexión:**

   **Desde Red Local:**
   ```
   Protocolo: WebSocket (WS)
   Host: 192.168.0.45
   Puerto: 9001
   Path: /mqtt
   Client ID: Mi_Celular_001
   Username: (dejar vacío si allow_anonymous = true)
   Password: (dejar vacío)
   ```

   **Desde Internet (Cloudflare):**
   ```
   Protocolo: WebSocket Secure (WSS)
   Host: tu-tunnel-cloudflare.trycloudflare.com
   Puerto: 443
   Path: /mqtt
   Client ID: Mi_Celular_001
   Username: (opcional)
   Password: (opcional)
   ```

3. **Conectar y Suscribirse:**
   - Click en "Connect"
   - Suscribirse a topics: `sensors/#`, `status/#`, `commands/#`

#### MQTT Dash (Android)

1. **Nueva Conexión:**
   - Nombre: "Servidor IoT Silo"
   - Broker: `ws://192.168.0.45:9001/mqtt` (local) o `wss://tu-tunnel.com/mqtt` (internet)
   - Client ID: `Celular_001`
   - Keep Alive: 60

2. **Crear Widgets:**
   - Widget tipo "Chart" para `sensors/temperature/#`
   - Widget tipo "Gauge" para `sensors/humidity/#`
   - Widget tipo "Button" para publicar comandos

#### MQTT Client (iOS)

1. **Agregar Conexión:**
   - Host: `192.168.0.45`
   - Port: `9001`
   - Protocol: `WebSocket`
   - Path: `/mqtt`
   - Client ID: `iPhone_001`

2. **Subscribe:**
   - Topic: `sensors/#`

## 💻 Configuración para VS Code

### Extensión: MQTT Explorer

1. **Instalar Extensión:**
   - Buscar "MQTT Explorer" en VS Code Extensions
   - Instalar extensión de MQTT

2. **Configurar Conexión:**
   - Abrir MQTT Explorer desde la barra lateral
   - Click en "+" para nueva conexión
   - Configurar:
     ```
     Name: Servidor IoT Silo
     Broker: ws://192.168.0.45:9001/mqtt
     Client ID: VSCode_001
     ```

3. **Suscribirse y Publicar:**
   - Suscribirse a `sensors/#`
   - Publicar mensajes de prueba

### Alternativa: MQTT Client Extension

1. **Instalar:** "MQTT Client" de Mark Dickson
2. **Configurar conexión:**
   ```json
   {
     "name": "IoT Silo Server",
     "host": "192.168.0.45",
     "port": 9001,
     "protocol": "ws",
     "clientId": "vscode_client",
     "path": "/mqtt"
   }
   ```

## 🔧 Configuración del Túnel Cloudflare para MQTT

### Verificar que el Túnel Expone WebSocket

El túnel debe estar configurado para exponer el puerto 9001 del servidor:

```bash
# Ver logs del túnel
docker logs silo-cloudflared

# Debe mostrar URLs expuestas
# Ejemplo: https://xxxx-xxxx-xxxx.trycloudflare.com
```

### Configuración del Túnel (Dashboard Cloudflare)

1. Ir a https://one.dash.cloudflare.com/
2. Zero Trust → Networks → Tunnels
3. Editar tu túnel
4. Agregar **Public Hostname:**
   - Subdomain: `mqtt` (o `ws`)
   - Domain: (tu dominio)
   - Service: `http://172.20.0.13:9001`
   - Path: `/mqtt`

**Nota:** Para dominios personalizados (como `ispciot.org`), es mejor configurar los Public Hostnames desde el Dashboard de Cloudflare en lugar de usar `--url` en docker-compose.

**Ver:** [CONFIGURAR_CLOUDFLARE_MQTT.md](CONFIGURAR_CLOUDFLARE_MQTT.md) para configuración completa con dominio personalizado.

## 📝 Estructura de Topics Recomendada

```
sensors/
├── temperature/
│   ├── ESP32_001      → Temperatura del sensor 001
│   └── ESP32_002      → Temperatura del sensor 002
├── humidity/
│   ├── ESP32_001      → Humedad del sensor 001
│   └── ESP32_002      → Humedad del sensor 002
└── pressure/
    └── ESP32_001      → Presión del sensor 001

status/
├── ESP32_001          → Estado del dispositivo 001
└── ESP32_002          → Estado del dispositivo 002

commands/
├── ESP32_001          → Comandos para dispositivo 001
└── ESP32_002          → Comandos para dispositivo 002

gateway/
├── gateway/            → Estado del gateway
├── endpoint/           → Datos de endpoints
└── sensor/             → Datos de sensores
```

## 🔍 Pruebas de Conexión

### Prueba 1: Desde el Servidor

```bash
# Suscribirse a un topic
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t sensors/# -v

# En otra terminal, publicar mensaje
docker exec -it silo-mosquitto mosquitto_pub -h localhost -t sensors/test -m "Mensaje de prueba"
```

### Prueba 2: Desde Navegador (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
    <title>MQTT WebSocket Test</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js"></script>
</head>
<body>
    <h1>MQTT WebSocket Test</h1>
    <div id="messages"></div>
    
    <script>
        const clientId = "web_client_" + Math.random().toString(16).substr(2, 8);
        const host = "192.168.0.45";
        const port = 9001;
        const path = "/mqtt";
        
        const client = new Paho.MQTT.Client(host, Number(port), path, clientId);
        
        client.onConnectionLost = function(responseObject) {
            console.log("Conexión perdida: " + responseObject.errorMessage);
        };
        
        client.onMessageArrived = function(message) {
            console.log("Mensaje recibido: " + message.payloadString);
            document.getElementById("messages").innerHTML += 
                "<p><strong>" + message.destinationName + ":</strong> " + message.payloadString + "</p>";
        };
        
        function connect() {
            client.connect({
                onSuccess: function() {
                    console.log("Conectado a MQTT");
                    client.subscribe("sensors/#");
                    
                    // Publicar mensaje de prueba
                    const message = new Paho.MQTT.Message("Hola desde navegador");
                    message.destinationName = "sensors/test";
                    client.send(message);
                },
                useSSL: false  // true si usas Cloudflare (wss://)
            });
        }
        
        connect();
    </script>
</body>
</html>
```

### Prueba 3: Python (Script de Prueba)

```python
import paho.mqtt.client as mqtt
import json
import time

# Configuración
BROKER_HOST = "192.168.0.45"
BROKER_PORT = 9001
TOPIC_SUBSCRIBE = "sensors/#"
TOPIC_PUBLISH = "sensors/test"

def on_connect(client, userdata, flags, rc):
    print(f"Conectado con código: {rc}")
    client.subscribe(TOPIC_SUBSCRIBE)

def on_message(client, userdata, msg):
    print(f"Mensaje recibido [{msg.topic}]: {msg.payload.decode()}")

# Crear cliente MQTT sobre WebSocket
client = mqtt.Client(
    transport="websockets",
    client_id="python_client_001"
)

client.on_connect = on_connect
client.on_message = on_message

# Conectar (usa ws:// para local, wss:// para Cloudflare)
client.connect(BROKER_HOST, BROKER_PORT, 60)

# Publicar mensaje de prueba
client.publish(TOPIC_PUBLISH, json.dumps({
    "device": "test_device",
    "value": 25.5,
    "timestamp": time.time()
}))

# Mantener conexión
client.loop_start()
time.sleep(10)
client.loop_stop()
```

## 🔒 Seguridad (Producción)

### Configurar Autenticación en Mosquitto

1. **Crear archivo de contraseñas:**
   ```bash
   docker exec -it silo-mosquitto mosquitto_passwd -c /mosquitto/config/passwd usuario1
   ```

2. **Actualizar mosquitto.conf:**
   ```
   listener 9001 0.0.0.0
   protocol websockets
   allow_anonymous false
   password_file /mosquitto/config/passwd
   ```

3. **Usar en ESP32:**
   ```cpp
   const char* mqtt_username = "usuario1";
   const char* mqtt_password = "tu_password";
   ```

## 📊 Monitoreo de Conexiones

### Ver Conexiones Activas

```bash
# Ver logs de Mosquitto
docker logs silo-mosquitto -f

# Ver conexiones WebSocket
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t '$SYS/#' -v
```

### Topics de Sistema Disponibles

- `$SYS/broker/clients/active` - Clientes conectados
- `$SYS/broker/clients/total` - Total de clientes
- `$SYS/broker/messages/sent` - Mensajes enviados
- `$SYS/broker/messages/received` - Mensajes recibidos

## ✅ Checklist de Configuración

### Servidor
- [ ] Mosquitto tiene WebSocket habilitado (puerto 9001)
- [ ] Firewall permite conexión en puerto 9001
- [ ] Cloudflare Tunnel expone puerto 9001 (si acceso externo)
- [ ] Servicios Docker corriendo correctamente

### ESP32
- [ ] Librerías instaladas (WebSocketsClient, PubSubClient)
- [ ] WiFi configurado
- [ ] URL WebSocket correcta
- [ ] Topics configurados
- [ ] Código compilado y subido

### Cliente Celular/VS Code
- [ ] App/Extensión instalada
- [ ] Conexión configurada (URL, puerto, path)
- [ ] Suscripción a topics configurada
- [ ] Conexión exitosa

## 🐛 Troubleshooting

### Error: "Connection Refused"

**Causa:** Puerto 9001 no accesible o WebSocket no habilitado

**Solución:**
```bash
# Verificar que Mosquitto está corriendo
docker ps | grep mosquitto

# Verificar configuración
docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf | grep websocket

# Reiniciar Mosquitto
docker restart silo-mosquitto
```

### Error: "WebSocket handshake failed"

**Causa:** Path incorrecto o protocolo incorrecto

**Solución:**
- Usar path `/mqtt` para WebSocket MQTT
- Verificar que URL sea `ws://host:9001/mqtt` o `wss://host/mqtt`

### Error: "SSL/TLS Error" (Cloudflare)

**Causa:** Debe usar `wss://` (WebSocket Secure) para Cloudflare

**Solución:**
- Cambiar `ws://` por `wss://`
- Usar puerto 443
- Verificar certificado SSL del túnel

### ESP32 no conecta

**Solución:**
1. Verificar WiFi conectado
2. Verificar URL y puerto correctos
3. Verificar que el servidor está accesible
4. Ver logs del ESP32 en Serial Monitor
5. Verificar que `mqttClient.loop()` se llama en `loop()`

## 📚 Recursos Adicionales

- [Documentación Mosquitto WebSocket](https://mosquitto.org/documentation/websockets/)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)
- [WebSocketsClient Library](https://github.com/Links2004/arduinoWebSockets)

## 📝 Notas Finales

- **Red Local:** Usar `ws://192.168.0.45:9001/mqtt`
- **Internet (Cloudflare):** Usar `wss://tu-tunnel.com/mqtt` (puerto 443)
- **Path WebSocket:** Siempre usar `/mqtt` para MQTT sobre WebSocket
- **Protocolo:** `ws://` para local, `wss://` para Cloudflare (HTTPS)

---

**Última actualización:** $(date +%Y-%m-%d)

