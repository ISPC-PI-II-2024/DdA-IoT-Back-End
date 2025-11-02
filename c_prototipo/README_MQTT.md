# 📡 Guía Rápida de MQTT sobre WebSocket

## 🎯 Información Rápida

### URLs de Conexión

**Red Local:**
```
ws://192.168.0.45:9001/mqtt
```

**Internet (Cloudflare Tunnel con Dominio Personalizado):**
```
wss://mqtt.ispciot.org/mqtt
```

**Nota:** Si usas un dominio personalizado en Cloudflare, configura el subdominio `mqtt` en el Dashboard de Cloudflare Zero Trust.

**Ver:** [CONFIGURAR_CLOUDFLARE_MQTT.md](CONFIGURAR_CLOUDFLARE_MQTT.md) para configuración completa.

### Configuración Básica

- **Protocolo Local:** `ws://` (WebSocket)
- **Protocolo Internet:** `wss://` (WebSocket Secure)
- **Puerto Local:** `9001`
- **Puerto Cloudflare:** `443`
- **Path:** `/mqtt` (siempre)

---

## 🚀 Inicio Rápido

### ESP32

1. **Instalar librerías:**
   - PlatformIO: Ver `platformio.ini` en código ejemplo
   - Arduino IDE: AsyncMqttClient, ArduinoJson

2. **Configurar WiFi:**
   ```cpp
   const char* ssid = "TU_WIFI";
   const char* password = "TU_PASSWORD";
   ```

3. **Configurar MQTT:**
   ```cpp
   const char* mqtt_broker_host = "192.168.0.45";  // Local
   // o
   const char* mqtt_broker_host = "tu-tunnel.com";  // Internet
   const int mqtt_broker_port = 9001;  // 9001 local, 443 internet
   ```

4. **Usar código:** Ver `ESP32_MQTT_WEBSOCKET.ino`

### Celular (MQTT Explorer)

```
Protocolo: WebSocket (WS) o WebSocket Secure (WSS)
Host: 192.168.0.45  (local) o tu-tunnel.com  (internet)
Puerto: 9001  (local) o 443  (internet)
Path: /mqtt
```

### VS Code

Instalar extensión "MQTT Explorer" y configurar conexión con los mismos parámetros.

---

## 📚 Documentación Completa

- **[CONFIGURACION_MQTT_ESP32.md](CONFIGURACION_MQTT_ESP32.md)** - Guía completa para ESP32
- **[GUIA_CLIENTES_MQTT.md](GUIA_CLIENTES_MQTT.md)** - Configuración de clientes
- **[ESP32_MQTT_WEBSOCKET.ino](ESP32_MQTT_WEBSOCKET.ino)** - Código completo para ESP32

---

**Última actualización:** $(date +%Y-%m-%d)

