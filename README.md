## 🌐 Documentacion del proyecto ## 

> [![fdf7b5f7-1322-44c4-83a4-c33011d7d8b4.png](https://i.postimg.cc/vBjM4c1K/fdf7b5f7-1322-44c4-83a4-c33011d7d8b4.png)](https://postimg.cc/WFMxKpwm)

## 🎯 Objetivo
Diseñar y desarrollar un servidor educativo que permita datos en tiempo real, almacenarlos de forma permanente y permitir el analisis posterior de los mismos. Ademas alojar una pagina web.

## 👥 Equipo
- Macarena Carballo -[GitHub:Macarena Carballo](https://github.com/MacarenaAC)
- Raul Jara - [GitHub:Raul Jara](https://github.com/r-j28)
- Diego Ares - [GitHub: Diego Ares](https://github.com/diegote7)
- Fernando Gimenez Coria - [GitHub: Fernando Gimenez Coria](https://github.com/FerCbr)


## 📂 Estructura del repositorio
| Carpeta | Contenido |
|--------|---------|
| `a_requisitos/` | Definición del problema, objetivos y funcionalidades |
| `b_investigacion/` | Fundamentos técnicos, protocolos y arquitectura |
| `c_prototipo/` | Código del backend, pruebas y evidencias |
| `d_presentacion/` | Presentación final, guion y reflexión |
| `assets/` | Imágenes, diagramas y recursos multimedia |

## ⚙️ Tecnologías utilizadas
- **Docker & Docker Compose** - Gestión de contenedores
- **Portainer** - Interfaz web para Docker
- **Nginx Proxy Manager** - Proxy reverso y gestión de dominios
- **Mosquitto MQTT** - Broker de mensajería IoT
- **MariaDB** - Base de datos relacional
- **InfluxDB** - Base de datos de series temporales
- **Grafana** - Dashboards y visualización
- **Node-RED** - Automatización visual
- **Cloudflared** - Túnel para acceso remoto
- **Telegraf** - Agente de recolección de métricas 


## 📚 Resultados esperados
- Servidor completo, funcional para dar soporte a proyecto "Monitoreo de Silo"
- Documentación completa del proceso ABP.

## 🚀 Inicio Rápido

### Despliegue del Servidor

```bash
cd c_prototipo/docker
cp env.example .env
# Editar .env con tus credenciales

# Linux/Mac
./deploy.sh

# Windows
.\deploy.ps1
```

### Servicios Disponibles

- **Portainer:** http://localhost:9000
- **Nginx Proxy Manager:** http://localhost:81
- **Grafana:** http://localhost:3000
- **Node-RED:** http://localhost:1880
- **Adminer:** http://localhost:8080
- **Frontend:** http://localhost:3001
- **Mosquitto MQTT:** localhost:1883
- **Mosquitto WebSocket:** localhost:9001

## 📎 Enlaces útiles

### Documentación General
- [Guía Rápida - Integración Frontend](c_prototipo/GUIA_RAPIDA.md)
- [Plan de Integración Completo](c_prototipo/PLAN_INTEGRACION_COMPLETO.md)
- [Estrategia de Integración](c_prototipo/INTEGRACION_FRONTEND.md)
- [Resumen de Optimizaciones](c_prototipo/RESUMEN_OPTIMIZACION.md)
- [Documentación Técnica](c_prototipo/documentacion_tecnica.md)

### Integración con Frontend DdA-IoT-Web-App
- [Guía de Integración Frontend](c_prototipo/GUIA_INTEGRACION_FRONTEND.md)
- [Análisis del Frontend](c_prototipo/ANALISIS_FRONTEND.md)
- [Repositorio Frontend](https://github.com/ISPC-PI-II-2024/DdA-IoT-Web-App)

### Docker y Despliegue
- [Documentación Docker](c_prototipo/docker/README.md)
- [Guía de contribución](CONTRIBUTING.md)

## 📝 Últimas Actualizaciones

### ✅ Optimización e Integración de Frontend (Completado)

- **Red optimizada** con IPs fijas para cada contenedor (172.20.0.X)
- **Frontend integrado** con contenedor Nginx dedicado
- **Scripts de despliegue automático** (bash y PowerShell)
- **Health checks** implementados en servicios críticos
- **Backups automáticos** de datos importantes
- **Documentación completa** del proceso de integración
