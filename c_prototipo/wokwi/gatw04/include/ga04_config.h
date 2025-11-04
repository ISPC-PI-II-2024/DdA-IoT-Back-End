#pragma once
#include <ArduinoJson.h>

// WiFi (Wokwi: use UI to set secrets or hardcode here for quick tests)
static const char* WIFI_SSID = "Wokwi-GUEST";    // Replace if needed
static const char* WIFI_PASS = "";               // Wokwi guest has no password

// MQTT over WebSockets (Cloudflare)
// For Cloudflare Tunnel with custom domain:
// Host uses SNI for TLS at 443; AsyncMqttClient uses TCP/TLS by default.
// NOTE: AsyncMqttClient does not speak WebSockets. If you strictly require
// WebSockets at the transport layer, switch to a WebSocket-capable MQTT client.
static const char* MQTT_HOST = "mqtt.ispciot.org";
static const uint16_t MQTT_PORT = 443; // Cloudflare HTTPS
static const char* MQTT_USER = "";     // optional
static const char* MQTT_PASS = "";     // optional


