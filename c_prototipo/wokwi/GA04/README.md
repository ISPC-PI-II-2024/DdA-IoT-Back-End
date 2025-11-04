# GA04 – Wokwi Simulation (ESP32 → MQTT over WebSockets)

## Topology
- Gateway: `GA04`
- Endpoints:
  - `E04` → Sensors: `0F05`, `0F06`
  - `E05` → Sensors: `0F07`, `0F08`

Publishes JSON to topics:
- `sensors/E04/0F05`, `sensors/E04/0F06`
- `sensors/E05/0F07`, `sensors/E05/0F08`
- Status: `status/GA04`

## Cloudflare WebSocket URL
- Internet: `wss://mqtt.ispciot.org/mqtt` (Cloudflare)
- Local (debug): `ws://192.168.0.45:9001/mqtt`

## How to run in Wokwi
1. Open this folder in Wokwi (diagram.json)
2. Ensure WiFi SSID is set in `ga04_config.h` (Wokwi-GUEST is OK)
3. Click Run. The ESP32 connects WiFi, then MQTT, and publishes every 10s

## Notes
- For physical devices, add a captive portal class to configure WiFi and broker
- If you need strict WebSocket transport on-device, switch to a WebSocket-capable MQTT client library


