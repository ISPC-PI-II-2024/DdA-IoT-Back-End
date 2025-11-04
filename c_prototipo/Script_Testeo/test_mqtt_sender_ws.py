#!/usr/bin/env python3
"""
==========================
Simulador MQTT (WebSocket)
==========================
Versión WS del simulador para probar MQTT sobre WebSockets contra Cloudflare.

Broker (Internet): wss://mqtt.ispciot.org/mqtt  (host=mqtt.ispciot.org, port=80 o 443, path=/mqtt)
Broker (Local):    ws://192.168.0.45:9001/mqtt

Uso: python test_mqtt_sender_ws.py --host mqtt.ispciot.org --port 80 --path /mqtt
"""

import argparse
import json
import random
import time
from datetime import datetime

import paho.mqtt.client as mqtt


# =========================
# GENERADORES DE DATOS (copiados del simulador original)
# =========================
NUM_GATEWAYS = 3
NUM_ENDPOINTS = 3
NUM_SENSORS = 4

TEMP_MIN = 15.0
TEMP_MAX = 30.0
HUMIDITY_MIN = 40
HUMIDITY_MAX = 65
BATTERY_MIN = 50
BATTERY_MAX = 100

REALISTIC_MODE = True
TEMP_TARGET = 24.0
HUMIDITY_TARGET = 55.0
TEMP_STEP_STD = 0.5
HUMIDITY_STEP_STD = 2.0
MEAN_REVERSION = 0.12
_PREV_SENSOR_VALUES = {}


def _bounded(value, min_value, max_value):
    return min(max(value, min_value), max_value)


def _next_gaussian(prev_value, target, step_std, min_value, max_value):
    gaussian_step = random.gauss(0.0, step_std)
    mean_revert = MEAN_REVERSION * (target - prev_value)
    next_value = prev_value + gaussian_step + mean_revert
    return _bounded(next_value, min_value, max_value)


def generate_uptime():
    hours = random.randint(0, 23)
    minutes = random.randint(0, 59)
    seconds = random.randint(0, 59)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def generate_gateway_data(gateway_id):
    wifi_signals = ["excelente", "buena", "regular", "débil"]
    lora_statuses = ["ok", "ok", "ok", "warning"]
    return {
        "id_gateway": gateway_id,
        "wifi_signal": random.choice(wifi_signals),
        "lora_status": random.choice(lora_statuses),
        "uptime": generate_uptime(),
    }


def generate_endpoint_data(gateway_id, num_endpoints=NUM_ENDPOINTS):
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
            "sensores": NUM_SENSORS,
        })
    return {"id_gateway": gateway_id, "endpoints": endpoints}


def generate_sensor_data(gateway_id, num_endpoints=NUM_ENDPOINTS, num_sensors=NUM_SENSORS):
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
                    init_temp = _bounded(random.gauss(TEMP_TARGET, 1.0), TEMP_MIN, TEMP_MAX)
                    init_hum = _bounded(random.gauss(HUMIDITY_TARGET, 3.0), HUMIDITY_MIN, HUMIDITY_MAX)
                    prev = {"temp": init_temp, "humedad": init_hum}
                temp_val = _next_gaussian(prev["temp"], TEMP_TARGET, TEMP_STEP_STD, TEMP_MIN, TEMP_MAX)
                hum_val = _next_gaussian(prev["humedad"], HUMIDITY_TARGET, HUMIDITY_STEP_STD, HUMIDITY_MIN, HUMIDITY_MAX)
                _PREV_SENSOR_VALUES[key] = {"temp": temp_val, "humedad": hum_val}
                temp = round(temp_val, 1)
                humedad = int(round(hum_val))
            else:
                temp = round(random.uniform(TEMP_MIN, TEMP_MAX), 1)
                humedad = random.randint(HUMIDITY_MIN, HUMIDITY_MAX)
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
                "estado": estado,
            })
        endpoints.append({"id_endpoint": endpoint_id, "sensores": sensores})
    return {"id_gateway": gateway_id, "endpoints": endpoints}


# =========================
# MQTT (WebSockets)
# =========================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Conectado al broker MQTT (WS)")
    else:
        print(f"❌ Error de conexión: {rc}")


def on_publish(client, userdata, mid):
    pass


def main():
    parser = argparse.ArgumentParser(description="MQTT Simulator over WebSockets")
    parser.add_argument("--host", default="mqtt.ispciot.org", help="MQTT host")
    parser.add_argument("--port", type=int, default=80, help="MQTT WS port (80 or 443)")
    parser.add_argument("--path", default="/mqtt", help="WebSocket path")
    parser.add_argument("--user", default="", help="Username")
    parser.add_argument("--password", default="", help="Password")
    parser.add_argument("--interval", type=int, default=30, help="Publish interval (s)")
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 Simulador MQTT (WebSocket) - Testing IoT App")
    print("=" * 60)
    print(f"📡 Broker: {args.host}:{args.port}{args.path} (transport=websockets)")
    print(f"🔄 Intervalo: {args.interval} segundos")
    print("=" * 60)
    print()

    # Mostrar ejemplos
    print("📋 Ejemplos de payload:")
    print("gateway/gateway →", json.dumps(generate_gateway_data("G01"), indent=2))
    print("gateway/endpoint →", json.dumps(generate_endpoint_data("G01", 2), indent=2))
    print("gateway/sensor →", json.dumps(generate_sensor_data("G01", 2, 4), indent=2))
    print()

    # Cliente WS
    client = mqtt.Client(client_id="mqtt_simulator_ws", transport="websockets", protocol=mqtt.MQTTv5)
    client.on_connect = on_connect
    client.on_publish = on_publish

    # Path de WebSocket
    client.ws_set_options(path=args.path)

    # TLS solo si puerto 443
    if args.port == 443:
        client.tls_set()  # usar TLS por defecto

    if args.user:
        client.username_pw_set(args.user, args.password)

    try:
        client.connect(args.host, args.port, keepalive=60)
        client.loop_start()
        time.sleep(2)

        cycle = 1
        while True:
            print(f"⏱️ Ciclo {cycle} - {datetime.now().strftime('%H:%M:%S')}")
            for g in range(1, NUM_GATEWAYS + 1):
                gateway_id = f"G{g:02d}"
                client.publish("gateway/gateway", json.dumps(generate_gateway_data(gateway_id)), qos=1)
                time.sleep(0.05)
                client.publish("gateway/endpoint", json.dumps(generate_endpoint_data(gateway_id)), qos=1)
                time.sleep(0.05)
                payload = json.dumps(generate_sensor_data(gateway_id))
                client.publish("gateway/sensor", payload, qos=1)
                time.sleep(0.05)
            print(f"✅ Ciclo completo. Esperando {args.interval} segundos...\n")
            time.sleep(args.interval)
            cycle += 1
    except KeyboardInterrupt:
        print("\n⛔ Interrumpido por usuario")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass


if __name__ == "__main__":
    main()


