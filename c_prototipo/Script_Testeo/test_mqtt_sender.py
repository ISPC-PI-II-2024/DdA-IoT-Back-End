#!/usr/bin/env python3
"""
==========================
Simulador MQTT para Testing
==========================
Publica datos simulados a los 3 tópicos MQTT cada 30 segundos:
- gateway/gateway: Estado del gateway
- gateway/endpoint: Endpoints conectados
- gateway/sensor: Datos de sensores

Uso: python test_mqtt_sender.py
"""

import paho.mqtt.client as mqtt
import json
import random
import time
from datetime import datetime

# =========================
# CONFIGURACIÓN MQTT
# =========================
# Si ejecutas desde el host (fuera de Docker), usar localhost
# Si ejecutas desde Docker, usar silo-mosquitto
MQTT_BROKER_HOST = "localhost"  # Cambiar a "silo-mosquitto" para ejecución en Docker
MQTT_BROKER_PORT = 1883
MQTT_BROKER_USERNAME = ""
MQTT_BROKER_PASSWORD = ""

# Número de gateways, endpoints y sensores a simular
NUM_GATEWAYS = 3
NUM_ENDPOINTS = 3
NUM_SENSORS = 4

# =========================
# CONFIGURACIÓN DE RANGOS
# =========================
TEMP_MIN = 15.0
TEMP_MAX = 30.0
HUMIDITY_MIN = 40
HUMIDITY_MAX = 65
BATTERY_MIN = 50
BATTERY_MAX = 100

# Generar datos más realistas con variación en estados
REALISTIC_MODE = True  # Activar para estados más variados

# =========================
# MODELO GAUSSIANO (REALISTA)
# =========================
# Objetivos de operación y parámetros del modelo
TEMP_TARGET = 24.0
HUMIDITY_TARGET = 55.0

# Desviación de los incrementos gaussianos
TEMP_STEP_STD = 0.5
HUMIDITY_STEP_STD = 2.0

# Factor de reversión a la media (0..1). Valores más altos vuelven más rápido al objetivo
MEAN_REVERSION = 0.12

# Estado previo por sensor para continuidad temporal entre ciclos
_PREV_SENSOR_VALUES = {}  # clave: (gateway_id, endpoint_id, sensor_id) → {"temp": float, "humedad": float}


def _bounded(value, min_value, max_value):
    """Limita un valor entre mínimos y máximos."""
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value


def _next_gaussian(prev_value, target, step_std, min_value, max_value):
    """
    Siguiente valor con:
    - incremento gaussiano ~ N(0, step_std^2)
    - reversión a la media hacia 'target'
    - límites [min_value, max_value]
    """
    gaussian_step = random.gauss(0.0, step_std)
    mean_revert = MEAN_REVERSION * (target - prev_value)
    next_value = prev_value + gaussian_step + mean_revert
    return _bounded(next_value, min_value, max_value)


def generate_uptime():
    """Genera un tiempo de actividad aleatorio"""
    hours = random.randint(0, 23)
    minutes = random.randint(0, 59)
    seconds = random.randint(0, 59)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def generate_sensor_id(index):
    """Genera ID de sensor (0F01, 0F02, etc.)"""
    return f"0F{index:02d}"


def generate_gateway_data(gateway_id):
    """Genera datos para el tópico gateway/gateway"""
    wifi_signals = ["excelente", "buena", "regular", "débil"]
    lora_statuses = ["ok", "ok", "ok", "warning"]  # Mayormente ok
    lora_status = random.choice(lora_statuses)
    
    return {
        "id_gateway": gateway_id,
        "wifi_signal": random.choice(wifi_signals),
        "lora_status": lora_status,
        "uptime": generate_uptime()
    }


def generate_endpoint_data(gateway_id, num_endpoints=NUM_ENDPOINTS):
    """Genera datos para el tópico gateway/endpoint"""
    endpoints = []
    
    for i in range(1, num_endpoints + 1):
        endpoint_id = f"E{i:02d}"
        bateria = random.randint(BATTERY_MIN, BATTERY_MAX)
        cargando = bateria < 95
        
        endpoints.append({
            "id": endpoint_id,
            "bateria": bateria,
            "cargando": cargando,
            "lora": "ok",
            "sensores": NUM_SENSORS
        })
    
    return {
        "id_gateway": gateway_id,
        "endpoints": endpoints
    }


def generate_sensor_data(gateway_id, num_endpoints=NUM_ENDPOINTS, num_sensors=NUM_SENSORS):
    """Genera datos para el tópico gateway/sensor"""
    endpoints = []
    
    for e in range(1, num_endpoints + 1):
        endpoint_id = f"E{e:02d}"
        sensores = []
        
        for s in range(1, num_sensors + 1):
            sensor_id = f"0F{s:02d}"

            if REALISTIC_MODE:
                key = (gateway_id, endpoint_id, sensor_id)
                prev = _PREV_SENSOR_VALUES.get(key)

                if prev is None:
                    # Inicializar cerca del objetivo con pequeña dispersión
                    init_temp = _bounded(random.gauss(TEMP_TARGET, 1.0), TEMP_MIN, TEMP_MAX)
                    init_hum = _bounded(random.gauss(HUMIDITY_TARGET, 3.0), HUMIDITY_MIN, HUMIDITY_MAX)
                    prev = {"temp": init_temp, "humedad": init_hum}

                temp_val = _next_gaussian(prev["temp"], TEMP_TARGET, TEMP_STEP_STD, TEMP_MIN, TEMP_MAX)
                hum_val = _next_gaussian(prev["humedad"], HUMIDITY_TARGET, HUMIDITY_STEP_STD, HUMIDITY_MIN, HUMIDITY_MAX)

                # Persistir para el siguiente ciclo
                _PREV_SENSOR_VALUES[key] = {"temp": temp_val, "humedad": hum_val}

                temp = round(temp_val, 1)
                humedad = int(round(hum_val))
            else:
                temp = round(random.uniform(TEMP_MIN, TEMP_MAX), 1)
                humedad = random.randint(HUMIDITY_MIN, HUMIDITY_MAX)

            # Determinar estado del sensor basado en valores y nuevos máximos
            if temp < 10:
                estado = "temp_critical_low"
            elif temp > 30:
                estado = "temp_critical_high"
            elif temp < 18 or temp > 28:
                estado = "temp_out_of_range"
            elif humedad < 25 or humedad > 65:
                estado = "humidity_out_of_range"
            else:
                estado = "ok"

            sensores.append({
                "id": sensor_id,
                "posicion": s,
                "temp": temp,
                "humedad": humedad,
                "estado": estado
            })
        
        endpoints.append({
            "id_endpoint": endpoint_id,
            "sensores": sensores
        })
    
    return {
        "id_gateway": gateway_id,
        "endpoints": endpoints
    }


def on_connect(client, userdata, flags, rc):
    """Callback cuando se conecta al broker"""
    if rc == 0:
        print("✅ Conectado al broker MQTT")
    else:
        print(f"❌ Error de conexión: {rc}")


def on_publish(client, userdata, mid):
    """Callback cuando se publica un mensaje"""
    pass  # No necesitamos hacer nada aquí


def main():
    """Función principal"""
    print("=" * 60)
    print("🚀 Simulador MQTT - Testing IoT App")
    print("=" * 60)
    print(f"📡 Broker: {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
    print(f"🔄 Intervalo: 30 segundos")
    print(f"🔢 Gateways: G01-G{NUM_GATEWAYS:02d}")
    print(f"🔢 Endpoints: E01-E{NUM_ENDPOINTS:02d} (por gateway)")
    print(f"🔢 Sensores: 0F01-0F{NUM_SENSORS:02d} (por endpoint)")
    print("=" * 60)
    print()
    
    # Mostrar ejemplo de datos que se enviarán
    print("📋 Ejemplo de datos que se enviarán:")
    print()
    
    # Ejemplo gateway
    print("Tópico: gateway/gateway")
    gateway_example = generate_gateway_data("G01")
    print(json.dumps(gateway_example, indent=2))
    print()
    
    # Ejemplo endpoint
    print("Tópico: gateway/endpoint")
    endpoint_example = generate_endpoint_data("G01", 2)
    print(json.dumps(endpoint_example, indent=2))
    print()
    
    # Ejemplo sensor
    print("Tópico: gateway/sensor")
    sensor_example = generate_sensor_data("G01", 2, 4)
    print(json.dumps(sensor_example, indent=2))
    print()
    print("=" * 60)
    print()
    
    # Crear cliente MQTT
    client = mqtt.Client(client_id="mqtt_simulator", clean_session=True)
    
    # Configurar callbacks
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    # Conectar al broker
    try:
        if MQTT_BROKER_USERNAME and MQTT_BROKER_PASSWORD:
            client.username_pw_set(MQTT_BROKER_USERNAME, MQTT_BROKER_PASSWORD)
        
        client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        client.loop_start()
        
        # Esperar a que se conecte
        time.sleep(2)
        
        print("📤 Comenzando a enviar datos...")
        print()
        
        cycle = 1
        while True:
            print(f"⏱️ Ciclo {cycle} - {datetime.now().strftime('%H:%M:%S')}")
            
            # Enviar datos para cada gateway
            for g in range(1, NUM_GATEWAYS + 1):
                gateway_id = f"G{g:02d}"
                
                # 1. Gateway status
                gateway_data = generate_gateway_data(gateway_id)
                client.publish("gateway/gateway", json.dumps(gateway_data), qos=1)
                print(f"  ✓ gateway/gateway → {gateway_id}")
                time.sleep(0.1)
                
                # 2. Endpoints
                endpoint_data = generate_endpoint_data(gateway_id)
                client.publish("gateway/endpoint", json.dumps(endpoint_data), qos=1)
                print(f"  ✓ gateway/endpoint → {gateway_id} ({len(endpoint_data['endpoints'])} endpoints)")
                time.sleep(0.1)
                
                # 3. Sensors
                sensor_data = generate_sensor_data(gateway_id)
                client.publish("gateway/sensor", json.dumps(sensor_data), qos=1)
                
                # Contar total de sensores
                total_sensores = sum(len(ep['sensores']) for ep in sensor_data['endpoints'])
                print(f"  ✓ gateway/sensor → {gateway_id} ({total_sensores} sensores)")
                time.sleep(0.1)
            
            print()
            print(f"✅ Ciclo completo. Esperando 30 segundos...")
            print("-" * 60)
            print()
            
            # Esperar 30 segundos antes del próximo ciclo
            time.sleep(30)
            cycle += 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Deteniendo simulador...")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("👋 Simulador detenido")


if __name__ == "__main__":
    main()

