# 📖 Guía Rápida de Despliegue Automático

## 🚀 Despliegue Rápido en Netbook Remota

### Paso 1: Instalar Requisitos

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Git
sudo apt update && sudo apt install -y git
```

### Paso 2: Clonar Repositorio

```bash
cd ~
git clone https://github.com/ISPC-PI-II-2024/DdA-IoT-Back-End.git silo-iot
cd silo-iot/c_prototipo
```

### Paso 3: Configurar Variables

```bash
# Crear .env desde template
cp .env.example .env

# Editar con tus configuraciones
nano .env
```

**Configurar mínimo:**
- `JWT_SECRET` (generar con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `GOOGLE_CLIENT_ID`
- Contraseñas de bases de datos
- `ADMIN_WHITELIST` (tu correo para admin)

### Paso 4: Ejecutar Despliegue Automático

```bash
chmod +x deploy_auto.sh
./deploy_auto.sh
```

El script hace todo automáticamente:
- ✅ Verifica requisitos
- ✅ Actualiza código desde Git
- ✅ Crea estructura de directorios
- ✅ Hace backup de datos
- ✅ Configura permisos
- ✅ Construye imágenes Docker
- ✅ Despliega servicios
- ✅ Verifica que todo funciona

### Paso 5: (Opcional) Configurar Inicio Automático

```bash
chmod +x setup_autostart.sh
./setup_autostart.sh
```

Esto hace que el servidor se despliegue automáticamente al iniciar la netbook.

## 🔄 Actualizar Servidor

```bash
cd ~/silo-iot/c_prototipo
./update_server.sh
```

## 📋 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `deploy_auto.sh` | Despliegue completo desde repositorio Git |
| `update_server.sh` | Actualizar servidor con últimos cambios |
| `setup_autostart.sh` | Configurar inicio automático al arrancar |

## 📚 Documentación Completa

Ver [despliegue.md](despliegue.md) para documentación detallada.

