# 📁 Estructura del Proyecto DdA-IoT-Back-End

## 📊 Resumen General

Proyecto de servidor IoT educativo para monitoreo de silos, desarrollado con metodología ABP (Aprendizaje Basado en Proyectos). Organizado en 4 fases principales siguiendo el ciclo de desarrollo de software.

---

## 🌳 Árbol de Directorios Completo

```
DdA-IoT-Back-End-fernandoGC/
│
├── 📄 README.md                    # Documentación principal del proyecto
├── 📄 LICENSE                      # Licencia del proyecto
├── 📄 CONTRIBUTING.md              # Guía de contribución
│
├── 📂 a_requisitos/                # Fase 1: Análisis y Requisitos
│   ├── 1_propuesta_proyecto.md
│   ├── 2_objetivos.md
│   └── 3_funcionalidades.md
│
├── 📂 b_investigacion/             # Fase 2: Investigación Técnica
│   ├── 1_estado_del_arte.md
│   └── 2_protocolos_iot.md
│
├── 📂 c_prototipo/                 # Fase 3: Implementación (Código Principal)
│   │
│   ├── 📂 backend/                 # Backend Node.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   └── src/
│   │       ├── server.js           # Punto de entrada
│   │       ├── config/             # Configuración
│   │       │   ├── env.js
│   │       │   └── security.js
│   │       ├── controllers/        # Controladores REST API
│   │       │   ├── auth.controllers.js
│   │       │   ├── CO2.controllers.js
│   │       │   ├── config.controllers.js
│   │       │   ├── data.controllers.js
│   │       │   ├── gateway.controllers.js
│   │       │   └── temperature.controllers.js
│   │       ├── routes/             # Rutas API
│   │       │   ├── auth.routes.js
│   │       │   ├── CO2.routes.js
│   │       │   ├── config.routes.js
│   │       │   ├── config.system.routes.js
│   │       │   ├── data.routes.js
│   │       │   ├── gateway.routes.js
│   │       │   └── temperature.routes.js
│   │       ├── middlewares/        # Middlewares
│   │       │   ├── auth.middlewares.js
│   │       │   └── data.middlewares.js
│   │       ├── service/            # Servicios de negocio
│   │       │   ├── data.service.js
│   │       │   ├── jwt.service.js
│   │       │   ├── mqtt.service.js
│   │       │   └── user.service.js
│   │       ├── db/                # Base de datos
│   │       │   └── index.js
│   │       └── sw/                # Service Workers / WebSockets
│   │           ├── handlers.js
│   │           ├── index.js
│   │           └── uWebSockets.js
│   │
│   ├── 📂 frontend/                # Frontend (SPA)
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   └── public/
│   │       ├── index.html
│   │       ├── manifest.webmanifest
│   │       ├── style.css
│   │       ├── sw.js              # Service Worker (PWA)
│   │       ├── config.json
│   │       ├── assets/
│   │       │   └── image.jpg
│   │       ├── icons/             # Iconos PWA y logos
│   │       │   ├── github.png
│   │       │   ├── instagram.png
│   │       │   ├── ISPC-logo.png
│   │       │   ├── linkedin.png
│   │       │   ├── Proyecto-logo.jpg
│   │       │   └── youtube.png
│   │       └── src/
│   │           ├── app.js         # Aplicación principal
│   │           ├── loader.js
│   │           ├── api.js         # Cliente API
│   │           ├── ws.js          # WebSocket client
│   │           ├── pwa-install.js # PWA installer
│   │           ├── components/    # Componentes UI
│   │           │   ├── alertWidget.js
│   │           │   ├── chartWidget.js
│   │           │   ├── deviceSelector.js
│   │           │   ├── deviceVisualization.js
│   │           │   ├── footer.js
│   │           │   ├── generalStatusWidget.js
│   │           │   ├── heroSection.js
│   │           │   ├── loadingIndicator.js
│   │           │   ├── mqttLogsWidget.js
│   │           │   ├── mqttTopicsManager.js
│   │           │   ├── navbar.js
│   │           │   ├── systemStatusWidget.js
│   │           │   └── temperatureChart.js
│   │           ├── pages/         # Páginas/Vistas
│   │           │   ├── configuracion.js
│   │           │   ├── configuracionAvanzada.js
│   │           │   ├── dashboard.js
│   │           │   ├── dispositivos.js
│   │           │   ├── login.js
│   │           │   ├── notFound.js
│   │           │   └── sobreNosotros.js
│   │           ├── router/        # Enrutamiento
│   │           │   └── index.js
│   │           ├── state/         # Estado global
│   │           │   └── store.js
│   │           └── utils/         # Utilidades
│   │               ├── alertService.js
│   │               ├── cacheService.js
│   │               ├── configService.js
│   │               ├── deviceService.js
│   │               ├── dom.js
│   │               ├── logger.js
│   │               ├── mqttTopicsService.js
│   │               └── storage.js
│   │
│   ├── 📂 services/               # Servicios Docker (Datos persistentes)
│   │   └── silo/
│   │       ├── grafana/           # Grafana (Dashboards)
│   │       │   └── data/
│   │       ├── influxdb/          # InfluxDB (Series temporales)
│   │       │   └── data/
│   │       ├── mariadb/           # MariaDB (Datos relacionales)
│   │       │   └── data/
│   │       ├── mosquitto/         # Mosquitto MQTT Broker
│   │       │   ├── config/
│   │       │   │   └── mosquitto.conf
│   │       │   ├── data/
│   │       │   └── log/
│   │       ├── nodered/           # Node-RED (Automatización)
│   │       │   └── data/
│   │       └── telegraf/          # Telegraf (Métricas)
│   │           └── config/
│   │               └── telegraf.conf
│   │
│   ├── 📂 init/                   # Scripts de inicialización SQL
│   │   └── 01-init.sql
│   │
│   ├── 📂 portainer/              # Portainer (Gestión Docker)
│   │   └── data/
│   │
│   ├── 📂 nginx-proxy-manager/    # Nginx Proxy Manager
│   │   └── data/
│   │
│   ├── 📂 wokwi/                  # Simulaciones Wokwi (ESP32)
│   │   ├── GA04/
│   │   │   ├── ga04_gateway.ino
│   │   │   ├── ga04_config.h
│   │   │   ├── CaptivePortal.h
│   │   │   ├── diagram.json
│   │   │   └── README.md
│   │   └── gatw04/
│   │       ├── diagram.json
│   │       ├── platformio.ini
│   │       ├── wokwi.toml
│   │       ├── include/
│   │       ├── lib/
│   │       ├── src/
│   │       │   └── main.cpp
│   │       └── test/
│   │
│   ├── 📂 Script_Testeo/          # Scripts de prueba MQTT
│   │   ├── test_mqtt_sender.py
│   │   ├── test_mqtt_sender_ws.py
│   │   ├── requirements.txt
│   │   └── TEST_MQTT_README.md
│   │
│   ├── 🐳 docker-compose.yml      # Orquestación de servicios
│   ├── 🐳 backend.Dockerfile      # Dockerfile para backend
│   ├── 🐳 frontend.Dockerfile     # Dockerfile para frontend
│   │
│   ├── 📄 ESP32_MQTT_WEBSOCKET.ino # Código Arduino ESP32
│   │
│   ├── 🔧 deploy_auto.sh          # Script de despliegue (Linux/Mac)
│   ├── 🔧 update_server.sh         # Script de actualización
│   ├── 🔧 setup_autostart.sh       # Script de autostart
│   │
│   └── 📚 Documentación Adicional:
│       ├── README_DESPLIEGUE.md
│       ├── README_MQTT.md
│       ├── MQTT_WEBSOCKET_GUIA.md
│       ├── GUIA_CLIENTES_MQTT.md
│       ├── GUIA_NETBOOK_REMOTA.md
│       ├── CONFIGURACION_MQTT_ESP32.md
│       ├── CONFIGURAR_CLOUDFLARE_MQTT.md
│       ├── SOLUCION_ERRORES_UPDATE.md
│       └── despliegue.md
│
└── 📂 d_presentacion/             # Fase 4: Presentación
    ├── guion_exposicion.md
    ├── presentacion_final.pdf
    └── retroalimentacion.md
```

---

## ✅ Verificación de Estructura

### **Estructura General** ✅
- ✅ Organización clara por fases (a → b → c → d)
- ✅ Separación lógica de backend y frontend
- ✅ Documentación bien organizada
- ✅ Servicios Docker con datos persistentes

### **Backend** ✅
- ✅ Arquitectura MVC bien definida:
  - Controllers: Lógica de negocio
  - Routes: Definición de endpoints
  - Middlewares: Validación y autenticación
  - Services: Lógica reutilizable
- ✅ Configuración centralizada
- ✅ Integración con bases de datos (MariaDB, InfluxDB)
- ✅ Servicio MQTT implementado
- ✅ WebSockets para tiempo real

### **Frontend** ✅
- ✅ SPA (Single Page Application) bien estructurada
- ✅ Componentes modulares
- ✅ PWA (Progressive Web App) implementada
- ✅ Router para navegación
- ✅ Estado global gestionado
- ✅ Utilidades organizadas

### **Docker & DevOps** ✅
- ✅ Docker Compose para orquestación
- ✅ Dockerfiles separados para backend y frontend
- ✅ Scripts de despliegue (bash y PowerShell mencionados en README)
- ✅ Health checks implementados
- ✅ Red Docker definida (silo-network)

### **Servicios IoT** ✅
- ✅ Mosquitto MQTT Broker configurado
- ✅ InfluxDB para series temporales
- ✅ MariaDB para datos relacionales
- ✅ Grafana para visualización
- ✅ Node-RED para automatización
- ✅ Telegraf para métricas

### **Documentación** ✅
- ✅ README principal completo
- ✅ Documentación técnica específica
- ✅ Guías de configuración
- ✅ Documentación de despliegue

---

## ⚠️ Observaciones y Recomendaciones

### **1. Archivos de Configuración**
- ⚠️ **Falta `.env.example`**: El README y `deploy_auto.sh` mencionan `.env.example` pero NO existe en el repositorio
- ✅ **Recomendación**: Crear `.env.example` en `c_prototipo/` con todas las variables necesarias del docker-compose.yml
- ✅ **Variables detectadas en docker-compose.yml**:
  - `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
  - `INFLUXDB_DB`, `INFLUXDB_ADMIN_USER`, `INFLUXDB_ADMIN_PASSWORD`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_IN`
  - `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_BROKER_USERNAME`, `MQTT_BROKER_PASSWORD`
  - `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`
  - `GOOGLE_CLIENT_ID`, `ADMIN_WHITELIST`, `ACTION_WHITELIST`
  - `CORS_ORIGIN`, `DEV_MODE`, `DEV_USER_EMAIL`, `DEV_USER_NAME`
  - `CLOUDFLARE_TUNNEL_TOKEN` (comentado)

### **2. Scripts de Despliegue**
- ⚠️ **Falta `deploy.ps1`**: El README menciona `deploy.ps1` para Windows, pero solo existe `deploy_auto.sh`
- ✅ **Recomendación**: Crear `deploy.ps1` para usuarios Windows

### **3. Directorio `assets/`**
- ⚠️ **Mención en README**: El README menciona carpeta `assets/` en la raíz, pero no existe
- ✅ **Recomendación**: Crear la carpeta o actualizar el README si no es necesaria

### **4. Cloudflared**
- ℹ️ **Comentado en docker-compose.yml**: El servicio Cloudflared está comentado
- ✅ **Estado**: Normal si no se está usando actualmente

### **5. Archivos de Datos**
- ⚠️ **Datos persistentes**: Los directorios `services/`, `portainer/`, `nginx-proxy-manager/` contienen datos de ejecución
- ✅ **`.gitignore` encontrado**: Solo excluye `node_modules/`, `*.zip`, `.cursorignore`, `.cursor/`
- ⚠️ **Problema**: Los datos de bases de datos, configuraciones y logs NO están excluidos
- ✅ **Recomendación**: Actualizar `.gitignore` para excluir:
  - `services/silo/*/data/`
  - `services/silo/*/log/`
  - `portainer/data/`
  - `nginx-proxy-manager/data/`
  - `.env` (archivo de configuración con credenciales)

### **6. Testing**
- ⚠️ **Scripts de prueba**: Existe `Script_Testeo/` pero no hay tests unitarios del backend
- ✅ **Recomendación**: Considerar agregar tests (Jest, Mocha, etc.)

---

## 📊 Estadísticas del Proyecto

### **Por Tipo de Archivo:**
- **Backend (Node.js)**: ~15 archivos principales
- **Frontend (JavaScript)**: ~30 archivos principales
- **Docker**: 2 Dockerfiles + 1 docker-compose.yml
- **Documentación**: 31 archivos .md
- **Código Hardware**: 2 proyectos Wokwi + 1 archivo .ino
- **Scripts**: 3 scripts de despliegue/configuración

### **Servicios Docker:**
- 11 servicios principales definidos en docker-compose.yml
- 6 bases de datos/servicios de datos persistentes
- 2 aplicaciones (backend + frontend)

---

## 🎯 Conclusión

La estructura del proyecto está **bien organizada** y sigue buenas prácticas:

✅ **Fortalezas:**
- Organización clara por fases del ABP
- Separación de responsabilidades (backend/frontend)
- Arquitectura MVC bien implementada
- Documentación completa
- Dockerización completa
- PWA implementada

⚠️ **Áreas de mejora:**
- Agregar scripts de despliegue para Windows
- Verificar/crear archivos de configuración faltantes
- Considerar tests automatizados
- Revisar `.gitignore` para datos sensibles

**Estado General: ✅ Estructura Sólida y Bien Organizada**

