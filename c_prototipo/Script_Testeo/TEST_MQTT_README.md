# 📡 Simulador MQTT - Guía de Uso

## Descripción
Script Python que simula gateways IoT enviando datos MQTT a los 3 tópicos principales del sistema.

## Instalación

### Opción 1: Ejecutar desde el Host (fuera de Docker)
```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar simulador
python test_mqtt_sender.py
```

### Opción 2: Ejecutar desde Docker
```bash
# Primero, asegúrate que el contenedor de mosquitto esté corriendo
docker-compose up -d silo-mosquitto

# Ejecutar el script dentro de la misma red de Docker
# Necesitarás modificar MQTT_BROKER_HOST a "silo-mosquitto" en el script

python test_mqtt_sender.py
```

## Configuración

Edita las constantes en `test_mqtt_sender.py`:

```python
# Host del broker MQTT
MQTT_BROKER_HOST = "localhost"  # o "silo-mosquitto" desde Docker

# Número de dispositivos a simular
NUM_GATEWAYS = 3      # G01, G02, G03
NUM_ENDPOINTS = 3     # E01, E02, E03 (por gateway)
NUM_SENSORS = 4       # 0F01-0F04 (por endpoint)

# Rangos de valores
TEMP_MIN = 15.0
TEMP_MAX = 30.0
HUMIDITY_MIN = 40
HUMIDITY_MAX = 80
BATTERY_MIN = 50
BATTERY_MAX = 100
```

## Tópicos Publicados

### 1. gateway/gateway
Estado del gateway (cada 30 segundos)

**Ejemplo:**
```json
{
  "id_gateway": "G01",
  "wifi_signal": "excelente",
  "lora_status": "ok",
  "uptime": "19:47:23"
}
```

### 2. gateway/endpoint
Endpoints conectados al gateway (cada 30 segundos)

**Ejemplo:**
```json
{
  "id_gateway": "G01",
  "endpoints": [
    {
      "id": "E01",
      "bateria": 99,
      "cargando": true,
      "lora": "ok",
      "sensores": 2
    },
    {
      "id": "E02",
      "bateria": 85,
      "cargando": false,
      "lora": "ok",
      "sensores": 2
    }
  ]
}
```

### 3. gateway/sensor
Datos de sensores por endpoint (cada 30 segundos)

**Ejemplo:**
```json
{
  "id_gateway": "G01",
  "endpoints": [
    {
      "id_endpoint": "E01",
      "sensores": [
        {
          "id": "0F01",
          "posicion": 1,
          "temp": 17.7,
          "humedad": 62,
          "estado": "ok"
        },
        {
          "id": "0F02",
          "posicion": 2,
          "temp": 20.8,
          "humedad": 63,
          "estado": "ok"
        }
      ]
    }
  ]
}
```

## Volumen de Datos

Con la configuración por defecto (3 gateways, 3 endpoints, 4 sensores):

- **Gateways:** 3 (G01, G02, G03)
- **Endpoints por gateway:** 3 (E01, E02, E03)
- **Sensores por endpoint:** 4 (0F01-0F04)
- **Total de endpoints:** 3 × 3 = 9
- **Total de sensores:** 3 × 3 × 4 = 36

Cada ciclo envía:
- 3 mensajes a `gateway/gateway`
- 3 mensajes a `gateway/endpoint` 
- 3 mensajes a `gateway/sensor`
- **Total: 9 mensajes cada 30 segundos**

## Detener el Simulador

Presiona `Ctrl+C` para detener el simulador de forma segura.

## Troubleshooting

### Error: Connection refused
- Verifica que el broker MQTT esté corriendo
- Verifica el puerto (default: 1883)
- Si usas Docker, verifica que el contenedor esté en la misma red

### Error: Module paho.mqtt.client not found
```bash
pip install paho-mqtt
```

### Los datos no aparecen en la aplicación
- Verifica que la aplicación esté conectada al mismo broker
- Verifica los logs del backend para confirmar recepción MQTT
- Verifica que los tópicos estén activos en la base de datos

## Ejemplos de Uso

### Ejecutar con más gateways
```python
NUM_GATEWAYS = 5  # Simular 5 gateways
NUM_ENDPOINTS = 5  # 5 endpoints por gateway
NUM_SENSORS = 8    # 8 sensores por endpoint
```

### Cambiar intervalo de envío
Edita la línea:
```python
time.sleep(30)  # Cambiar a 10 para enviar cada 10 segundos
```

### Probar con rangos específicos
```python
TEMP_MIN = 10.0
TEMP_MAX = 35.0
HUMIDITY_MIN = 30
HUMIDITY_MAX = 90
```

## Integración con la App

Los datos enviados por este simulador serán:

1. **Recibidos por el backend** (`backend/src/service/mqtt.service.js`)
2. **Guardados en la base de datos** (`dispositivos` table)
3. **Procesados en tiempo real** y enviados via WebSocket
4. **Mostrados en el dashboard** en los widgets correspondientes

### Verificar recepción de datos

1. Abre el dashboard en `http://localhost:5000/#/dashboard`
2. Verifica el widget "Estado del Sistema" (debe mostrar gateways, endpoints y sensores)
3. Revisa el widget "📡 Logs MQTT en Tiempo Real" para ver los mensajes llegando
4. Ve a `http://localhost:5000/#/dispositivos` para ver la estructura jerárquica

## Datos Aleatorios Generados

- **Temperatura:** 15.0°C - 30.0°C (aleatorio)
- **Humedad:** 40% - 80% (aleatorio)
- **Batería:** 50% - 100% (aleatorio)
- **WiFi Signal:** excelente, buena, regular, débil (aleatorio)
- **LoRa Status:** mayormente "ok" (con ocasional "warning")
- **Cargando:** true si batería < 95%

