/*
 * GA04 Gateway simulator for Wokwi
 * Publishes data for endpoints E04 and E05 with sensors:
 *  - E04: 0F05, 0F06
 *  - E05: 0F07, 0F08
 * MQTT over WebSockets (Cloudflare) -> wss://mqtt.ispciot.org/mqtt
 */

#include <WiFi.h>
#include <AsyncMqttClient.h>
#include "ga04_config.h"

// Topics
static const char* GATEWAY_ID = "GA04";
static const char* ENDPOINT_E04 = "E04";
static const char* ENDPOINT_E05 = "E05";
static const char* SENSOR_E04_S1 = "0F05";
static const char* SENSOR_E04_S2 = "0F06";
static const char* SENSOR_E05_S1 = "0F07";
static const char* SENSOR_E05_S2 = "0F08";

// MQTT client
AsyncMqttClient mqttClient;
TimerHandle_t mqttReconnectTimer;
TimerHandle_t wifiReconnectTimer;

// Intervals
unsigned long lastPub = 0;
const unsigned long PUBLISH_INTERVAL_MS = 10000; // 10s

void publishJson(const String& topic, float v) {
  StaticJsonDocument<256> doc;
  doc["gateway_id"] = GATEWAY_ID;
  doc["endpoint_id"] = topic.substring(topic.lastIndexOf('/') - 3, topic.lastIndexOf('/'));
  doc["sensor_id"] = topic.substring(topic.lastIndexOf('/') + 1);
  doc["value"] = v;
  doc["ts"] = millis();
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(topic.c_str(), 0, false, payload.c_str());
}

void publishAllSensors() {
  // Topics: sensors/<endpoint>/<sensor>
  String t1 = String("sensors/") + ENDPOINT_E04 + "/" + SENSOR_E04_S1;
  String t2 = String("sensors/") + ENDPOINT_E04 + "/" + SENSOR_E04_S2;
  String t3 = String("sensors/") + ENDPOINT_E05 + "/" + SENSOR_E05_S1;
  String t4 = String("sensors/") + ENDPOINT_E05 + "/" + SENSOR_E05_S2;

  float v1 = 20.0 + (random(0, 200) / 10.0); // 20.0-40.0
  float v2 = 40.0 + (random(0, 500) / 10.0); // 40-90
  float v3 = 300.0 + random(0, 100);         // example ppm
  float v4 = 900.0 + random(0, 200);         // example lux

  publishJson(t1, v1);
  publishJson(t2, v2);
  publishJson(t3, v3);
  publishJson(t4, v4);
}

void onMqttConnect(bool) {
  // Status topic per gateway
  String statusTopic = String("status/") + GATEWAY_ID;
  StaticJsonDocument<128> doc;
  doc["status"] = "online";
  doc["ts"] = millis();
  String payload; serializeJson(doc, payload);
  mqttClient.publish(statusTopic.c_str(), 1, true, payload.c_str());
}

void connectToMqtt() {
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setClientId("GA04_wokwi");
  if (strlen(MQTT_USER) > 0) mqttClient.setCredentials(MQTT_USER, MQTT_PASS);
  mqttClient.connect();
}

void onWiFiEvent(WiFiEvent_t event) {
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    connectToMqtt();
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    xTimerStop(mqttReconnectTimer, 0);
    xTimerStart(wifiReconnectTimer, 0);
  }
}

void connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  mqttReconnectTimer = xTimerCreate("mqttTimer", pdMS_TO_TICKS(4000), pdFALSE, 0, reinterpret_cast<TimerCallbackFunction_t>(connectToMqtt));
  wifiReconnectTimer = xTimerCreate("wifiTimer", pdMS_TO_TICKS(4000), pdFALSE, 0, reinterpret_cast<TimerCallbackFunction_t>(connectToWifi));

  WiFi.onEvent(onWiFiEvent);
  mqttClient.onConnect(onMqttConnect);

  connectToWifi();
}

void loop() {
  const unsigned long now = millis();
  if (mqttClient.connected() && (now - lastPub >= PUBLISH_INTERVAL_MS)) {
    lastPub = now;
    publishAllSensors();
  }
  delay(10);
}



