// ==========================
// Carga y validación de variables de entorno
// ==========================
import dotenv from "dotenv";
import path from "path";
import Joi from "joi";

// Cargar primero .env de la raíz del proyecto y darle prioridad
// Luego cargar (sin override) el .env local si existiera, pero sin pisar variables ya definidas
const rootEnvPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: rootEnvPath, override: true });
dotenv.config({ override: false });

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().integer().default(3000),

  // Seguridad JWT propia
  JWT_SECRET: Joi.string().min(24).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  REFRESH_EXPIRES_IN: Joi.string().default("7d"), // reservado para posibles cookies

  // Google Identity Services
  GOOGLE_CLIENT_ID: Joi.string().required(),

  // CORS
  CORS_ORIGIN: Joi.string().default("*"),

  // MQTT Configuration
  MQTT_BROKER_HOST: Joi.string().default("localhost"),
  MQTT_BROKER_PORT: Joi.number().integer().default(1883),
  MQTT_BROKER_USERNAME: Joi.string().allow("").default(""),
  MQTT_BROKER_PASSWORD: Joi.string().allow("").default(""),
  MQTT_TOPICS: Joi.string().allow("").default(
    "gateway/gateway,gateway/endpoint,gateway/sensor"
  ),

  // Listas blancas para roles (en el env dentro de backend, coloquen su gmail personal)
  ADMIN_WHITELIST: Joi.string().allow("").default(""),
  ACTION_WHITELIST: Joi.string().allow("").default(""),

  // Base de Datos MySQL/MariaDB
  MYSQL_HOST: Joi.string().default("localhost"),
  MYSQL_USER: Joi.string().default("root"),
  MYSQL_ROOT_PASSWORD: Joi.string().default(""),
  MYSQL_PASSWORD: Joi.string().default(""),
  MYSQL_DATABASE: Joi.string().default("silo_db"),

  // InfluxDB
  INFLUXDB_HOST: Joi.string().default("localhost"),
  INFLUXDB_PORT: Joi.number().integer().default(8086),
  INFLUXDB_DB: Joi.string().default("metricas_silo"),
  INFLUXDB_ADMIN_USER: Joi.string().default("admin"),
  INFLUXDB_ADMIN_PASSWORD: Joi.string().default(""),
  INFLUXDB_USER: Joi.string().default("telegraf_user"),
  INFLUXDB_USER_PASSWORD: Joi.string().default(""),

  // Grafana
  GRAFANA_ADMIN_USER: Joi.string().default("admin"),
  GRAFANA_ADMIN_PASSWORD: Joi.string().default(""),

  // Configuración de Backup
  BACKUP_ENABLED: Joi.string().valid("true", "false").default("false"),
  BACKUP_SCHEDULE: Joi.string().default("0 2 * * *"),
  BACKUP_RETENTION_DAYS: Joi.number().integer().default(30),
  BACKUP_PATH: Joi.string().default("/backups"),

  // Configuración de Notificaciones
  SMTP_HOST: Joi.string().default(""),
  SMTP_PORT: Joi.number().integer().default(587),
  SMTP_USER: Joi.string().default(""),
  SMTP_PASS: Joi.string().default(""),
  WEBHOOK_URL: Joi.string().default(""),

  // Configuración de Monitoreo
  LOG_LEVEL: Joi.string()
    .valid("debug", "info", "warn", "error")
    .default("info"),
  LOG_FILE: Joi.string().default("/var/log/iot-app.log"),
  METRICS_ENABLED: Joi.string().valid("true", "false").default("false"),
  METRICS_PORT: Joi.number().integer().default(9090),

  // Configuración de Producción
  DOMAIN: Joi.string().default(""),
  SSL_EMAIL: Joi.string().email().default(""),
  REVERSE_PROXY_HOST: Joi.string().default("nginx-proxy-manager"),
  REVERSE_PROXY_PORT: Joi.number().integer().default(80),
  
  // Variables de desarrollo (opcionales)
  DEV_MODE: Joi.string().valid("true", "false").default("false"),
  DEV_USER_EMAIL: Joi.string().email().default("dev@example.com"),
  DEV_USER_NAME: Joi.string().default("Developer"),
}).unknown();

const { value, error } = schema.validate(process.env, { abortEarly: false });
if (error) {
  console.error(
    "❌ ENV ERROR:",
    error.details.map((d) => d.message).join("; ")
  );
  process.exit(1);
}

function parseList(s) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export const ENV = {
  NODE_ENV: value.NODE_ENV,
  PORT: value.PORT,
  JWT_SECRET: value.JWT_SECRET,
  JWT_EXPIRES_IN: value.JWT_EXPIRES_IN,
  REFRESH_EXPIRES_IN: value.REFRESH_EXPIRES_IN,
  GOOGLE_CLIENT_ID: value.GOOGLE_CLIENT_ID,
  CORS_ORIGIN: value.CORS_ORIGIN,
  MQTT_BROKER_HOST: value.MQTT_BROKER_HOST,
  MQTT_BROKER_PORT: value.MQTT_BROKER_PORT,
  MQTT_BROKER_USERNAME: value.MQTT_BROKER_USERNAME,
  MQTT_BROKER_PASSWORD: value.MQTT_BROKER_PASSWORD,
  MQTT_TOPICS: parseList(value.MQTT_TOPICS),
  ADMIN_WHITELIST: parseList(value.ADMIN_WHITELIST),
  ACTION_WHITELIST: parseList(value.ACTION_WHITELIST),

  // Base de Datos MySQL/MariaDB
  MYSQL_HOST: value.MYSQL_HOST,
  MYSQL_USER: value.MYSQL_USER,
  MYSQL_ROOT_PASSWORD: value.MYSQL_ROOT_PASSWORD,
  MYSQL_PASSWORD: value.MYSQL_PASSWORD,
  MYSQL_DATABASE: value.MYSQL_DATABASE,

  // InfluxDB
  INFLUXDB_HOST: value.INFLUXDB_HOST,
  INFLUXDB_PORT: value.INFLUXDB_PORT,
  INFLUXDB_DB: value.INFLUXDB_DB,
  INFLUXDB_ADMIN_USER: value.INFLUXDB_ADMIN_USER,
  INFLUXDB_ADMIN_PASSWORD: value.INFLUXDB_ADMIN_PASSWORD,
  INFLUXDB_USER: value.INFLUXDB_USER,
  INFLUXDB_USER_PASSWORD: value.INFLUXDB_USER_PASSWORD,

  // Grafana
  GRAFANA_ADMIN_USER: value.GRAFANA_ADMIN_USER,
  GRAFANA_ADMIN_PASSWORD: value.GRAFANA_ADMIN_PASSWORD,

  // Configuración de Backup
  BACKUP_ENABLED: value.BACKUP_ENABLED,
  BACKUP_SCHEDULE: value.BACKUP_SCHEDULE,
  BACKUP_RETENTION_DAYS: value.BACKUP_RETENTION_DAYS,
  BACKUP_PATH: value.BACKUP_PATH,

  // Configuración de Notificaciones
  SMTP_HOST: value.SMTP_HOST,
  SMTP_PORT: value.SMTP_PORT,
  SMTP_USER: value.SMTP_USER,
  SMTP_PASS: value.SMTP_PASS,
  WEBHOOK_URL: value.WEBHOOK_URL,

  // Configuración de Monitoreo
  LOG_LEVEL: value.LOG_LEVEL,
  LOG_FILE: value.LOG_FILE,
  METRICS_ENABLED: value.METRICS_ENABLED,
  METRICS_PORT: value.METRICS_PORT,

  // Configuración de Producción
  DOMAIN: value.DOMAIN,
  SSL_EMAIL: value.SSL_EMAIL,
  REVERSE_PROXY_HOST: value.REVERSE_PROXY_HOST,
  REVERSE_PROXY_PORT: value.REVERSE_PROXY_PORT,
  
  // Variables de desarrollo
  DEV_MODE: value.DEV_MODE,
  DEV_USER_EMAIL: value.DEV_USER_EMAIL,
  DEV_USER_NAME: value.DEV_USER_NAME,
};
