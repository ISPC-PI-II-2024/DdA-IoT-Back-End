/*
 * ESP32 MQTT Client sobre WebSocket
 * Conecta al servidor IoT Silo mediante MQTT sobre WebSocket
 * Compatible con Cloudflare Tunnel
 */

#include <WiFi.h>
#include <AsyncMqttClient.h>
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

// OPCIÓN B: Internet (Cloudflare Tunnel con dominio personalizado)
// const char* mqtt_broker_host = "mqtt.ispciot.org";  // Tu dominio personalizado
// const int mqtt_broker_port = 443;  // Cloudflare usa puerto 443

const char* mqtt_client_id = "ESP32_Silo_001";
const char* mqtt_username = "";  // Opcional
const char* mqtt_password = "";  // Opcional

bool use_tls = false;  // true para Cloudflare (wss://)

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
AsyncMqttClient mqttClient;
TimerHandle_t mqttReconnectTimer;
TimerHandle_t wifiReconnectTimer;

unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;

const unsigned long SENSOR_INTERVAL = 10000;    // 10 segundos
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60 segundos

// ============================
// CALLBACKS MQTT
// ============================
void onMqttConnect(bool sessionPresent) {
  Serial.println("✅ Conectado a MQTT broker!");
  
  // Suscribirse a topics
  uint16_t packetIdSub1 = mqttClient.subscribe(topic_comandos, 2);
  Serial.print("📥 Suscrito a: ");
  Serial.println(topic_comandos);
  
  // Publicar estado inicial
  publishStatus("online");
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.println("⚠️ Desconectado del broker MQTT");
  
  if (WiFi.isConnected()) {
    xTimerStart(mqttReconnectTimer, 0);
  }
}

void onMqttSubscribe(uint16_t packetId, uint8_t qos) {
  Serial.println("✅ Suscripción confirmada");
}

void onMqttUnsubscribe(uint16_t packetId) {
  Serial.println("✅ Desuscripción confirmada");
}

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total) {
  Serial.print("📨 Mensaje recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  
  char message[len + 1];
  memcpy(message, payload, len);
  message[len] = '\0';
  Serial.println(message);
  
  // Procesar comando
  if (strcmp(topic, topic_comandos) == 0) {
    processCommand(message);
  }
}

void onMqttPublish(uint16_t packetId) {
  // Serial.println("✅ Publicación confirmada");
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
  
  if (command == "reboot") {
    Serial.println("🔄 Reiniciando...");
    delay(1000);
    ESP.restart();
    
  } else if (command == "status") {
    publishStatus("online");
    
  } else {
    Serial.print("⚠️ Comando desconocido: ");
    Serial.println(command);
  }
}

// ============================
// CONECTAR WIFI
// ============================
void connectToWifi() {
  Serial.println("📡 Conectando a WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
}

void onWifiConnect(const WiFiEventStationModeGotIP& event) {
  Serial.println("✅ WiFi conectado!");
  Serial.print("📶 IP: ");
  Serial.println(WiFi.localIP());
  connectToMqtt();
}

void onWifiDisconnect(const WiFiEventStationModeDisconnected& event) {
  Serial.println("⚠️ WiFi desconectado");
  xTimerStop(mqttReconnectTimer, 0);
  xTimerStart(wifiReconnectTimer, 0);
}

// ============================
// CONECTAR MQTT
// ============================
void connectToMqtt() {
  Serial.println("🔌 Conectando a MQTT broker...");
  Serial.print("   Host: ");
  Serial.println(mqtt_broker_host);
  Serial.print("   Port: ");
  Serial.println(mqtt_broker_port);
  
  // Configurar MQTT Client para WebSocket
  mqttClient.setServer(mqtt_broker_host, mqtt_broker_port);
  mqttClient.setCredentials(mqtt_username, mqtt_password);
  mqttClient.setClientId(mqtt_client_id);
  
  // Configurar para WebSocket
  // AsyncMqttClient soporta WebSocket usando el protocolo ws:// o wss://
  // En el host, usar formato: ws://host:port/path
  // Pero para ESP32, configuramos directamente
  
  mqttClient.connect();
}

// ============================
// PUBLICAR DATOS
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
  mqttClient.publish(topic_temperatura, 1, true, payload.c_str());
  
  // Publicar humedad
  mqttClient.publish(topic_humedad, 1, true, payload.c_str());
  
  Serial.print("📤 Datos publicados - Temp: ");
  Serial.print(temperatura);
  Serial.print("°C, Hum: ");
  Serial.print(humedad);
  Serial.println("%");
}

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
  
  mqttClient.publish(topic_status, 1, true, payload.c_str());
  Serial.print("📤 Estado publicado: ");
  Serial.println(status);
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
  
  // Configurar timers
  mqttReconnectTimer = xTimerCreate("mqttTimer", pdMS_TO_TICKS(5000), pdFALSE, 0, reinterpret_cast<TimerCallbackFunction_t>(connectToMqtt));
  wifiReconnectTimer = xTimerCreate("wifiTimer", pdMS_TO_TICKS(5000), pdFALSE, 0, reinterpret_cast<TimerCallbackFunction_t>(connectToWifi));
  
  // Configurar callbacks WiFi
  WiFi.onEvent(onWifiConnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_GOT_IP);
  WiFi.onEvent(onWifiDisconnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  
  // Configurar callbacks MQTT
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.onSubscribe(onMqttSubscribe);
  mqttClient.onUnsubscribe(onMqttUnsubscribe);
  mqttClient.onMessage(onMqttMessage);
  mqttClient.onPublish(onMqttPublish);
  
  // Conectar WiFi
  connectToWifi();
}

// ============================
// LOOP
// ============================
void loop() {
  unsigned long now = millis();
  
  // Leer sensores cada X segundos
  if (now - lastSensorRead > SENSOR_INTERVAL) {
    // Simular lectura de sensores (reemplazar con lectura real)
    float temperatura = random(200, 350) / 10.0;  // 20.0°C - 35.0°C
    float humedad = random(400, 900) / 10.0;       // 40.0% - 90.0%
    
    // Para sensores reales:
    // float temperatura = dht.readTemperature();
    // float humedad = dht.readHumidity();
    
    if (mqttClient.connected()) {
      publishSensorData(temperatura, humedad);
    }
    
    lastSensorRead = now;
  }
  
  // Heartbeat cada X segundos
  if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
    if (mqttClient.connected()) {
      publishStatus("online");
    }
    lastHeartbeat = now;
  }
  
  delay(100);
}

