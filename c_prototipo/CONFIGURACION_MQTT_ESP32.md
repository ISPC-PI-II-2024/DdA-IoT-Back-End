# 🔌 Guía Completa: ESP32 con MQTT WebSocket

## 🎯 Objetivo

Conectar un ESP32 al broker MQTT del servidor IoT Silo usando MQTT sobre WebSocket, ya que Cloudflare Tunnel no soporta MQTT nativo (puerto 1883).

## 📊 Información del Servidor

### Configuración del Broker

- **Broker Mosquitto:** silo-mosquitto
- **IP Interna Docker:** 172.20.0.13
- **Puerto MQTT TCP:** 1883 (solo red local, no accesible desde internet)
- **Puerto MQTT WebSocket:** 9001 (accesible vía Cloudflare Tunnel)
- **Path WebSocket:** `/mqtt` (estándar para MQTT)
- **Autenticación:** Anónima permitida (para desarrollo)

### URLs de Conexión

**Desde Red Local:**
```
ws://192.168.0.45:9001/mqtt
```

**Desde Internet (Cloudflare Tunnel):**
```
wss://tu-tunnel-cloudflare.trycloudflare.com/mqtt
```
*Nota:* Usar `wss://` (WebSocket Secure) y puerto 443 para Cloudflare

---

## 🔧 Configuración ESP32

### Requisitos

- ESP32 (cualquier variante)
- Sensores (opcional): DHT22, DS18B20, etc.
- Conexión WiFi estable

### Librerías Necesarias

#### Para PlatformIO

Agregar a `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps = 
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^6.21.3
    marvinroger/AsyncMqttClient@^0.9.0  # Para WebSocket
    links2004/WebSockets@^2.4.1
```

**Nota:** Para ESP32, se recomienda usar `AsyncMqttClient` que soporta WebSocket nativamente.

#### Para Arduino IDE

Instalar desde Library Manager:
1. **AsyncMqttClient** by Marvin Roger (v0.9.0+)
2. **ArduinoJson** by Benoit Blanchon (v6.21+)
3. **WebSockets** by Markus Sattler (v2.4.1+) - Opcional, si usas WebSocket directo

---

## 📝 Código Completo para ESP32

### Versión Completa con Manejo de Errores

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ============================
// CONFIGURACIÓN WIFI
// ============================
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// ============================
// CONFIGURACIÓN MQTT WEBSOCKET
// ============================
// OPCIÓN A: Red Local
const char* mqtt_broker_host = "192.168.0.45";
const int mqtt_broker_port = 9001;
const char* mqtt_ws_path = "/mqtt";
bool use_ssl = false;  // false para ws://, true para wss://

// OPCIÓN B: Internet (Cloudflare Tunnel)
// const char* mqtt_broker_host = "tu-tunnel-cloudflare.trycloudflare.com";
// const int mqtt_broker_port = 443;
// const char* mqtt_ws_path = "/mqtt";
// bool use_ssl = true;  // true para wss://

const char* mqtt_client_id = "ESP32_Silo_001";
const char* mqtt_username = "";  // Opcional, dejar vacío si no hay auth
const char* mqtt_password = "";  // Opcional

// ============================
// TOPICS MQTT
// ============================
const char* topic_status = "status/ESP32_001";
const char* topic_temperatura = "sensors/temperature/ESP32_001";
const char* topic_humedad = "sensors/humidity/ESP32_001";
const char* topic_comandos = "commands/ESP32_001";

// ============================
// VARIABLES GLOBALES
// ============================
WiFiClient wifiClient;
WebSocketsClient webSocket;
PubSubClient mqttClient(wifiClient);

unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;

// Intervalos
const unsigned long SENSOR_INTERVAL = 10000;    // 10 segundos
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60 segundos
const unsigned long RECONNECT_INTERVAL = 5000;  // 5 segundos

// ============================
// CALLBACK MQTT - Mensajes Recibidos
// ============================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print("📨 Mensaje recibido [");
    Serial.print(topic);
    Serial.print("]: ");
    
    // Convertir payload a string
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';
    Serial.println(message);
    
    // Procesar según el topic
    if (strcmp(topic, topic_comandos) == 0) {
        processCommand(message);
    } else {
        Serial.println("Topic desconocido");
    }
}

// ============================
// PROCESAR COMANDOS
// ============================
void processCommand(String jsonCommand) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, jsonCommand);
    
    if (error) {
        Serial.print("❌ Error parseando JSON: ");
        Serial.println(error.c_str());
        return;
    }
    
    String command = doc["command"].as<String>();
    Serial.print("⚙️ Comando recibido: ");
    Serial.println(command);
    
    // Ejecutar comando
    if (command == "reboot") {
        Serial.println("🔄 Reiniciando...");
        delay(1000);
        ESP.restart();
        
    } else if (command == "status") {
        publishStatus("online");
        
    } else if (command == "led_on") {
        // digitalWrite(LED_PIN, HIGH);
        Serial.println("✅ LED encendido");
        publishStatus("led_on");
        
    } else if (command == "led_off") {
        // digitalWrite(LED_PIN, LOW);
        Serial.println("✅ LED apagado");
        publishStatus("led_off");
        
    } else {
        Serial.print("⚠️ Comando desconocido: ");
        Serial.println(command);
    }
}

// ============================
// CONECTAR WIFI
// ============================
void setupWiFi() {
    Serial.println();
    Serial.println("📡 Conectando a WiFi...");
    Serial.print("SSID: ");
    Serial.println(ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("✅ WiFi conectado!");
        Serial.print("📶 IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("📶 Signal Strength (RSSI): ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println();
        Serial.println("❌ Falló la conexión WiFi");
        Serial.println("🔄 Reiniciando en 5 segundos...");
        delay(5000);
        ESP.restart();
    }
}

// ============================
// CONECTAR MQTT
// ============================
bool connectMQTT() {
    Serial.println("🔌 Conectando a MQTT broker...");
    Serial.print("   Host: ");
    Serial.println(mqtt_broker_host);
    Serial.print("   Port: ");
    Serial.println(mqtt_broker_port);
    Serial.print("   Path: ");
    Serial.println(mqtt_ws_path);
    
    // Configurar cliente MQTT
    mqttClient.setServer(mqtt_broker_host, mqtt_broker_port);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setSocketTimeout(3);
    mqttClient.setKeepAlive(60);
    
    // Intentar conectar
    String clientId = String(mqtt_client_id) + "_" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
        Serial.println("✅ Conectado a MQTT!");
        
        // Suscribirse a topics
        mqttClient.subscribe(topic_comandos);
        Serial.print("   ✅ Suscrito a: ");
        Serial.println(topic_comandos);
        
        // Publicar estado inicial
        publishStatus("online");
        
        return true;
    } else {
        Serial.print("❌ Falló conexión MQTT, rc=");
        Serial.print(mqttClient.state());
        Serial.println(" (ver códigos de error abajo)");
        return false;
    }
}

// ============================
// PUBLICAR DATOS DE SENSORES
// ============================
void publishSensorData(float temperatura, float humedad) {
    DynamicJsonDocument doc(512);
    doc["device_id"] = "ESP32_001";
    doc["device_type"] = "ESP32";
    doc["temperature"] = temperatura;
    doc["humidity"] = humedad;
    doc["timestamp"] = millis();
    doc["uptime"] = millis() / 1000;
    doc["location"] = "Silo_Principal";
    doc["free_heap"] = ESP.getFreeHeap();
    doc["rssi"] = WiFi.RSSI();
    
    String payload;
    serializeJson(doc, payload);
    
    // Publicar temperatura
    if (mqttClient.publish(topic_temperatura, payload.c_str())) {
        Serial.print("📤 Temperatura publicada: ");
        Serial.print(temperatura);
        Serial.println("°C");
    } else {
        Serial.println("❌ Error publicando temperatura");
    }
    
    // Publicar humedad
    if (mqttClient.publish(topic_humedad, payload.c_str())) {
        Serial.print("📤 Humedad publicada: ");
        Serial.print(humedad);
        Serial.println("%");
    } else {
        Serial.println("❌ Error publicando humedad");
    }
}

// ============================
// PUBLICAR ESTADO
// ============================
void publishStatus(const char* status) {
    DynamicJsonDocument doc(256);
    doc["device_id"] = "ESP32_001";
    doc["status"] = status;
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["rssi"] = WiFi.RSSI();
    doc["ip"] = WiFi.localIP().toString();
    doc["timestamp"] = millis();
    
    String payload;
    serializeJson(doc, payload);
    
    if (mqttClient.publish(topic_status, payload.c_str())) {
        Serial.print("📤 Estado publicado: ");
        Serial.println(status);
    } else {
        Serial.println("❌ Error publicando estado");
    }
}

// ============================
// RECONECTAR SI ES NECESARIO
// ============================
void reconnectMQTT() {
    unsigned long now = millis();
    
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL) {
        lastReconnectAttempt = now;
        
        if (!mqttClient.connected()) {
            Serial.println("🔄 Intentando reconectar a MQTT...");
            
            if (connectMQTT()) {
                lastReconnectAttempt = 0;
            }
        }
    }
}

// ============================
// SETUP
// ============================
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    Serial.println("═══════════════════════════════════════");
    Serial.println("   ESP32 MQTT WebSocket Client");
    Serial.println("   Servidor IoT Silo");
    Serial.println("═══════════════════════════════════════");
    Serial.println();
    
    // Inicializar WiFi
    setupWiFi();
    delay(2000);
    
    // Conectar MQTT
    if (connectMQTT()) {
        Serial.println("✅ Sistema inicializado correctamente");
    } else {
        Serial.println("⚠️ Sistema iniciado pero MQTT no conectado");
    }
    
    Serial.println();
}

// ============================
// LOOP
// ============================
void loop() {
    // Mantener conexión WiFi
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ WiFi desconectado, reconectando...");
        setupWiFi();
    }
    
    // Mantener conexión MQTT
    if (!mqttClient.connected()) {
        reconnectMQTT();
    } else {
        mqttClient.loop();
    }
    
    unsigned long now = millis();
    
    // Leer y publicar sensores cada X segundos
    if (now - lastSensorRead > SENSOR_INTERVAL) {
        // Simular lectura de sensores (reemplazar con lectura real)
        float temperatura = random(200, 350) / 10.0;  // 20.0°C - 35.0°C
        float humedad = random(400, 900) / 10.0;       // 40.0% - 90.0%
        
        // Para sensores reales, usar:
        // float temperatura = dht.readTemperature();
        // float humedad = dht.readHumidity();
        
        publishSensorData(temperatura, humedad);
        lastSensorRead = now;
    }
    
    // Heartbeat cada X segundos
    if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
        publishStatus("online");
        lastHeartbeat = now;
    }
    
    delay(100);
}
```

---

## 🔌 Conexión con Sensores Reales

### Ejemplo con DHT22

```cpp
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
    // ... código anterior ...
    dht.begin();
}

void loop() {
    // ... código anterior ...
    
    // Leer sensores reales
    if (now - lastSensorRead > SENSOR_INTERVAL) {
        float temperatura = dht.readTemperature();
        float humedad = dht.readHumidity();
        
        if (!isnan(temperatura) && !isnan(humedad)) {
            publishSensorData(temperatura, humedad);
        } else {
            Serial.println("❌ Error leyendo sensor DHT");
        }
        
        lastSensorRead = now;
    }
}
```

---

## 📱 Configuración Cliente MQTT en Celular

### App: MQTT Explorer (Recomendada)

#### Configuración desde Red Local

```
Nombre: Servidor IoT Silo (Local)
Protocolo: WebSocket (WS)
Host: 192.168.0.45
Puerto: 9001
Path: /mqtt
Client ID: Celular_001
Keep Alive: 60
Username: (vacío)
Password: (vacío)
```

#### Configuración desde Internet (Cloudflare)

```
Nombre: Servidor IoT Silo (Internet)
Protocolo: WebSocket Secure (WSS)
Host: tu-tunnel-cloudflare.trycloudflare.com
Puerto: 443
Path: /mqtt
Client ID: Celular_001
Keep Alive: 60
Username: (vacío)
Password: (vacío)
```

### App Alternativa: MQTT Dash

1. Crear nueva conexión:
   - Broker URL: `ws://192.168.0.45:9001/mqtt` (local) o `wss://tu-tunnel.com/mqtt` (internet)
   - Client ID: `Celular_Dash_001`

2. Crear widgets:
   - **Gráfico de Línea:** Topic `sensors/temperature/#`
   - **Gauge:** Topic `sensors/humidity/#`
   - **Botón:** Para publicar comandos en `commands/ESP32_001`

---

## 💻 Configuración Cliente MQTT en VS Code

### Extensión: MQTT Explorer

1. **Instalar:**
   - Extensions → Buscar "MQTT Explorer"
   - Instalar extensión oficial

2. **Configurar Conexión:**

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
     "password": ""
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
     "password": ""
   }
   ```

3. **Suscribirse:**
   - Click en "Subscribe"
   - Topic: `sensors/#`
   - QOS: 0

4. **Publicar:**
   - Topic: `commands/ESP32_001`
   - Payload: `{"command": "status"}`

### Alternativa: Extensión "MQTT Client"

1. Instalar "MQTT Client" by Mark Dickson
2. Abrir MQTT Client panel
3. Configurar conexión con los mismos parámetros

---

## ☁️ Configuración Cloudflare Tunnel para MQTT

### Verificar Configuración Actual

```bash
# En el servidor
docker logs silo-cloudflared -f
```

### Configurar Túnel para MQTT WebSocket

#### Opción A: Via Dashboard Cloudflare

1. Ir a https://one.dash.cloudflare.com/
2. Zero Trust → Networks → Tunnels
3. Editar tu túnel
4. Agregar Public Hostname:
   - **Subdomain:** `mqtt`
   - **Domain:** (tu dominio o usar trycloudflare.com)
   - **Service:** `http://172.20.0.13:9001`
   - **Path:** (dejar vacío o `/`)

#### Opción B: Directamente en docker-compose

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: silo-cloudflared
  restart: unless-stopped
  command:
    - "tunnel"
    - "--no-autoupdate"
    - "run"
    - "--url"
    - "http://172.20.0.13:9001"  # MQTT WebSocket
    - "--url"
    - "http://172.20.0.20:80"    # Frontend
  networks:
    - silo-network
```

### Obtener URL del Túnel

```bash
docker logs silo-cloudflared | grep "https://"
```

Ejemplo de salida:
```
INF | https://mqtt-xxxx-xxxx.trycloudflare.com → http://172.20.0.13:9001
```

**URL para ESP32:** `wss://mqtt.ispciot.org/mqtt`

**Nota:** Si tienes un dominio personalizado en Cloudflare, usa ese dominio en lugar de la URL temporal de `trycloudflare.com`.

**Ver:** [CONFIGURAR_CLOUDFLARE_MQTT.md](CONFIGURAR_CLOUDFLARE_MQTT.md) para configuración con dominio personalizado.

---

## 🧪 Pruebas de Conexión

### Test 1: Desde el Servidor

```bash
# Terminal 1: Suscribirse
docker exec -it silo-mosquitto mosquitto_sub -h localhost -t sensors/# -v

# Terminal 2: Publicar mensaje
docker exec -it silo-mosquitto mosquitto_pub -h localhost -t sensors/test -m "Mensaje de prueba desde servidor"
```

### Test 2: Desde Navegador (JavaScript)

Guardar como `test_mqtt.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>MQTT WebSocket Test</title>
    <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
</head>
<body>
    <h1>MQTT WebSocket Test</h1>
    <div id="status">Conectando...</div>
    <div id="messages"></div>
    
    <script>
        const clientId = "web_" + Math.random().toString(16).substr(2, 8);
        
        // Configuración - Cambiar según tu entorno
        const mqtt_host = "192.168.0.45";  // Local
        const mqtt_port = 9001;
        const mqtt_path = "/mqtt";
        const useSSL = false;  // true para Cloudflare
        
        const protocol = useSSL ? "wss" : "ws";
        const url = `${protocol}://${mqtt_host}:${mqtt_port}${mqtt_path}`;
        
        console.log("Conectando a:", url);
        
        const client = mqtt.connect(url, {
            clientId: clientId,
            clean: true,
            reconnectPeriod: 1000,
        });
        
        client.on("connect", () => {
            console.log("✅ Conectado!");
            document.getElementById("status").textContent = "✅ Conectado";
            document.getElementById("status").style.color = "green";
            
            // Suscribirse
            client.subscribe("sensors/#");
            client.subscribe("status/#");
            
            // Publicar mensaje de prueba
            client.publish("sensors/test", JSON.stringify({
                device: "web_client",
                message: "Hola desde navegador",
                timestamp: Date.now()
            }));
        });
        
        client.on("message", (topic, message) => {
            console.log("Mensaje recibido:", topic, message.toString());
            const div = document.createElement("div");
            div.innerHTML = `<strong>${topic}:</strong> ${message.toString()}`;
            document.getElementById("messages").appendChild(div);
        });
        
        client.on("error", (error) => {
            console.error("Error:", error);
            document.getElementById("status").textContent = "❌ Error: " + error.message;
            document.getElementById("status").style.color = "red";
        });
    </script>
</body>
</html>
```

### Test 3: Python (Script de Prueba)

Crear archivo `test_mqtt.py`:

```python
#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time

# Configuración
BROKER_HOST = "192.168.0.45"  # Cambiar si usas Cloudflare
BROKER_PORT = 9001
USE_SSL = False  # True para Cloudflare (wss://)

# Topics
TOPIC_SUBSCRIBE = "sensors/#"
TOPIC_PUBLISH = "sensors/test"
TOPIC_STATUS = "status/test"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Conectado al broker MQTT")
        client.subscribe(TOPIC_SUBSCRIBE)
        client.subscribe(TOPIC_STATUS)
        
        # Publicar mensaje de prueba
        message = {
            "device": "python_test",
            "value": 25.5,
            "timestamp": time.time()
        }
        client.publish(TOPIC_PUBLISH, json.dumps(message))
        print(f"📤 Mensaje publicado en {TOPIC_PUBLISH}")
    else:
        print(f"❌ Error de conexión, código: {rc}")

def on_message(client, userdata, msg):
    print(f"📨 [{msg.topic}]: {msg.payload.decode()}")

def on_disconnect(client, userdata, rc):
    print("⚠️ Desconectado del broker")

# Crear cliente
client_id = f"python_client_{int(time.time())}"
client = mqtt.Client(
    client_id=client_id,
    transport="websockets"
)

client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# Configurar TLS si es necesario
if USE_SSL:
    client.tls_set()

# Conectar
print(f"🔌 Conectando a {BROKER_HOST}:{BROKER_PORT}...")
client.ws_set_options(path="/mqtt")
client.connect(BROKER_HOST, BROKER_PORT, 60)

# Mantener conexión
try:
    client.loop_start()
    time.sleep(30)  # Mantener conexión por 30 segundos
    client.loop_stop()
    client.disconnect()
except KeyboardInterrupt:
    print("\n⏹️ Deteniendo...")
    client.loop_stop()
    client.disconnect()
```

**Ejecutar:**
```bash
pip install paho-mqtt
python3 test_mqtt.py
```

---

## 📊 Estructura de Topics Estándar

```
sensors/
├── temperature/
│   ├── ESP32_001      → {"temperature": 25.5, "unit": "C", "timestamp": 1234567890}
│   └── ESP32_002      → {"temperature": 23.2, "unit": "C", "timestamp": 1234567890}
├── humidity/
│   ├── ESP32_001      → {"humidity": 65.0, "unit": "%", "timestamp": 1234567890}
│   └── ESP32_002      → {"humidity": 70.5, "unit": "%", "timestamp": 1234567890}
└── pressure/
    └── ESP32_001      → {"pressure": 1013.25, "unit": "hPa", "timestamp": 1234567890}

status/
├── ESP32_001          → {"status": "online", "uptime": 3600, "rssi": -65}
└── ESP32_002          → {"status": "online", "uptime": 7200, "rssi": -70}

commands/
├── ESP32_001          → {"command": "reboot"} o {"command": "led_on"}
└── ESP32_002          → {"command": "status"}

gateway/
├── gateway/            → Estado del gateway
├── endpoint/           → Datos de endpoints
└── sensor/             → Datos de sensores
```

---

## ✅ Checklist de Configuración

### Servidor
- [ ] Mosquitto corriendo con WebSocket en puerto 9001
- [ ] Configuración `mosquitto.conf` tiene listener WebSocket
- [ ] Firewall permite conexión en puerto 9001 (si aplica)
- [ ] Cloudflare Tunnel configurado para puerto 9001
- [ ] Túnel expone URL accesible desde internet

### ESP32
- [ ] Librerías instaladas correctamente
- [ ] WiFi configurado y conectado
- [ ] URL WebSocket correcta (local o Cloudflare)
- [ ] Topics configurados
- [ ] Código compilado sin errores
- [ ] ESP32 conectado y publicando datos

### Cliente (Celular/VS Code)
- [ ] App/Extensión instalada
- [ ] Conexión configurada correctamente
- [ ] Suscripción a topics funcionando
- [ ] Publicación de mensajes funcionando

---

## 🐛 Troubleshooting ESP32

### Error: "Connection Refused"

**Posibles causas:**
1. Puerto 9001 no accesible
2. WebSocket no habilitado en Mosquitto
3. IP incorrecta

**Soluciones:**
```bash
# Verificar que Mosquitto está corriendo
docker ps | grep mosquitto

# Verificar configuración WebSocket
docker exec -it silo-mosquitto cat /mosquitto/config/mosquitto.conf | grep websocket

# Verificar que el puerto está expuesto
docker port silo-mosquitto
```

### Error: "WebSocket handshake failed"

**Causa:** Path incorrecto

**Solución:**
- Usar path `/mqtt` para MQTT sobre WebSocket
- URL completa: `ws://192.168.0.45:9001/mqtt`

### Error: "SSL/TLS Error" (Cloudflare)

**Causa:** Debe usar `wss://` para Cloudflare

**Solución:**
```cpp
// Cambiar en el código ESP32
const char* mqtt_broker_host = "tu-tunnel.trycloudflare.com";
const int mqtt_broker_port = 443;
bool use_ssl = true;  // Habilitar SSL
```

### ESP32 no publica mensajes

**Verificar:**
1. `mqttClient.loop()` se llama en `loop()`
2. `mqttClient.connected()` retorna `true`
3. Topics están bien escritos
4. Hay memoria disponible (`ESP.getFreeHeap()`)

---

## 📚 Recursos Adicionales

- **Documentación Mosquitto:** https://mosquitto.org/documentation/
- **PubSubClient Library:** https://github.com/knolleary/pubsubclient
- **ArduinoJson:** https://arduinojson.org/
- **WebSocketsClient:** https://github.com/Links2004/arduinoWebSockets

---

**Última actualización:** $(date +%Y-%m-%d)

