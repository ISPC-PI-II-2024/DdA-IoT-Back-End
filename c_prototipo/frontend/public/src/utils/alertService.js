// ==========================
// Servicio de Alertas y Alarmas
// Sistema de notificaciones sonoras y visuales cuando se exceden umbrales
// ==========================

import { configService } from "./configService.js";

class AlertService {
  constructor() {
    this.activeAlerts = new Map();
    this.audioContext = null;
    this.audioEnabled = true;
    this.lastAlertsSent = new Map(); // Para evitar spam de alertas
    this.alertCooldown = 10000; // 10 segundos entre alertas
  }

  /**
   * Inicializa el servicio de alertas
   */
  initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.loadConfig();
      
      // Suscribirse a cambios en la configuración avanzada para recargar umbrales
      this.configUnsubscribe = configService.onConfigChange('advanced_config', (newConfig) => {
        console.log('[AlertService] Configuración avanzada actualizada, recargando umbrales...');
        this.loadConfig();
      });
    } catch (error) {
      console.warn("[ALERT] AudioContext no disponible:", error);
      this.audioEnabled = false;
    }
  }
  
  /**
   * Limpia recursos del servicio (listeners, etc.)
   */
  cleanup() {
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }
  }

  /**
   * Carga la configuración de umbrales
   */
  loadConfig() {
    try {
      const config = configService.getAdvancedConfig();
      this.thresholds = config.thresholds || {
        tempMin: 15.0,
        tempMax: 30.0,
        tempCriticalMin: 5.0,
        tempCriticalMax: 40.0,
        humidityMin: 30.0,
        humidityMax: 80.0,
        batteryLow: 20.0,
        co2NormalMax: 1000,
        co2Warning: 1500,
        co2Critical: 2000,
        enableTempAlerts: true,
        enableHumidityAlerts: true,
        enableBatteryAlerts: true,
        enableCO2Alerts: true
      };
      console.log('[AlertService] Umbrales cargados:', this.thresholds);
    } catch (error) {
      console.error('[AlertService] Error cargando configuración de umbrales:', error);
      // Usar valores por defecto si hay error
      this.thresholds = {
        tempMin: 15.0,
        tempMax: 30.0,
        tempCriticalMin: 5.0,
        tempCriticalMax: 40.0,
        humidityMin: 30.0,
        humidityMax: 80.0,
        enableTempAlerts: true,
        enableHumidityAlerts: true
      };
    }
  }

  /**
   * Verifica si un valor está fuera de los umbrales
   */
  checkThreshold(value, min, max, type) {
    if (value === null || value === undefined) return null;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;

    if (numValue < min) return 'low';
    if (numValue > max) return 'high';
    return 'normal';
  }

  /**
   * Verifica temperatura y dispara alerta si es necesario
   * Usa tempMin/tempMax para warning y tempCriticalMin/tempCriticalMax para critical
   * @param {number} temp - Valor de temperatura
   * @param {object} deviceInfo - Información del dispositivo/sensor (opcional)
   */
  checkTemperature(temp, deviceInfo = {}) {
    if (!this.thresholds || !this.thresholds.enableTempAlerts) return;
    
    const numTemp = parseFloat(temp);
    if (isNaN(numTemp)) return;
    
    // Verificar si está fuera de los umbrales normales (warning)
    const normalStatus = this.checkThreshold(
      numTemp,
      this.thresholds.tempMin || 15,
      this.thresholds.tempMax || 30,
      'temp'
    );
    
    // Verificar si está fuera de los umbrales críticos
    const criticalStatus = this.checkThreshold(
      numTemp,
      this.thresholds.tempCriticalMin || 5,
      this.thresholds.tempCriticalMax || 40,
      'temp'
    );
    
    // Determinar severidad y tipo de alerta
    let severity = 'warning';
    let alertType = null;
    let message = '';
    let threshold = null;
    
    if (criticalStatus === 'low') {
      // Temperatura crítica baja
      severity = 'critical';
      alertType = 'temp_critical_low';
      threshold = this.thresholds.tempCriticalMin;
      message = `Temperatura CRÍTICA baja: ${numTemp.toFixed(1)}°C (umbral crítico: ${threshold}°C)`;
    } else if (criticalStatus === 'high') {
      // Temperatura crítica alta
      severity = 'critical';
      alertType = 'temp_critical_high';
      threshold = this.thresholds.tempCriticalMax;
      message = `Temperatura CRÍTICA alta: ${numTemp.toFixed(1)}°C (umbral crítico: ${threshold}°C)`;
    } else if (normalStatus === 'low') {
      // Temperatura fuera de rango normal pero no crítico (warning)
      severity = 'warning';
      alertType = 'temp_warning_low';
      threshold = this.thresholds.tempMin;
      message = `Temperatura baja: ${numTemp.toFixed(1)}°C (umbral normal: ${threshold}°C)`;
    } else if (normalStatus === 'high') {
      // Temperatura fuera de rango normal pero no crítico (warning)
      severity = 'warning';
      alertType = 'temp_warning_high';
      threshold = this.thresholds.tempMax;
      message = `Temperatura alta: ${numTemp.toFixed(1)}°C (umbral normal: ${threshold}°C)`;
    }
    
    if (alertType) {
      this.triggerAlert('temperature', {
        type: alertType,
        value: numTemp,
        threshold,
        severity,
        message,
        // Incluir información del dispositivo/sensor
        sensorId: deviceInfo.sensorId || deviceInfo.sensor_id || deviceInfo.id,
        deviceId: deviceInfo.deviceId || deviceInfo.device_id || deviceInfo.gateway_id,
        deviceType: deviceInfo.deviceType || deviceInfo.device_type,
        endpointId: deviceInfo.endpointId || deviceInfo.endpoint_id,
        ...deviceInfo
      });
    }
  }

  /**
   * Verifica humedad y dispara alerta si es necesario
   * Usa humidityMin/humidityMax para warning y critical
   * @param {number} humidity - Valor de humedad
   * @param {object} deviceInfo - Información del dispositivo/sensor (opcional)
   */
  checkHumidity(humidity, deviceInfo = {}) {
    if (!this.thresholds || !this.thresholds.enableHumidityAlerts) return;
    
    const numHumidity = parseFloat(humidity);
    if (isNaN(numHumidity)) return;
    
    // Verificar si está fuera de los umbrales normales
    const status = this.checkThreshold(
      numHumidity,
      this.thresholds.humidityMin || 30,
      this.thresholds.humidityMax || 80,
      'humidity'
    );
    
    if (status === 'low' || status === 'high') {
      // Por ahora, todas las alertas de humedad son warning
      // Se puede extender para tener niveles críticos si se agregan humidityCriticalMin/Max
      const severity = 'warning';
      const alertType = status === 'low' ? 'humidity_warning_low' : 'humidity_warning_high';
      const threshold = status === 'low' ? this.thresholds.humidityMin : this.thresholds.humidityMax;
      
      this.triggerAlert('humidity', {
        type: alertType,
        value: numHumidity,
        threshold,
        severity,
        message: status === 'low'
          ? `Humedad baja: ${numHumidity.toFixed(1)}% (umbral: ${threshold}%)`
          : `Humedad alta: ${numHumidity.toFixed(1)}% (umbral: ${threshold}%)`,
        // Incluir información del dispositivo/sensor
        sensorId: deviceInfo.sensorId || deviceInfo.sensor_id || deviceInfo.id,
        deviceId: deviceInfo.deviceId || deviceInfo.device_id || deviceInfo.gateway_id,
        deviceType: deviceInfo.deviceType || deviceInfo.device_type,
        endpointId: deviceInfo.endpointId || deviceInfo.endpoint_id,
        ...deviceInfo
      });
    }
  }

  /**
   * Verifica CO2 y dispara alerta si es necesario
   * @param {number} co2 - Valor de CO2
   * @param {object} deviceInfo - Información del dispositivo/sensor (opcional)
   */
  checkCO2(co2, deviceInfo = {}) {
    if (!this.thresholds || !this.thresholds.enableCO2Alerts) return;
    
    const numCO2 = parseFloat(co2);
    if (isNaN(numCO2)) return;
    
    let alertType = null;
    let severity = 'warning';
    
    if (numCO2 >= this.thresholds.co2Critical) {
      alertType = 'co2_critical';
      severity = 'critical';
    } else if (numCO2 >= this.thresholds.co2Warning) {
      alertType = 'co2_warning';
      severity = 'warning';
    }
    
    if (alertType) {
      this.triggerAlert('co2', {
        type: alertType,
        value: numCO2,
        threshold: numCO2 >= this.thresholds.co2Critical ? this.thresholds.co2Critical : this.thresholds.co2Warning,
        severity,
        message: `Nivel de CO₂ ${numCO2 >= this.thresholds.co2Critical ? 'CRÍTICO' : 'ELEVADO'}: ${numCO2}ppm`,
        // Incluir información del dispositivo/sensor
        sensorId: deviceInfo.sensorId || deviceInfo.sensor_id || deviceInfo.id,
        deviceId: deviceInfo.deviceId || deviceInfo.device_id || deviceInfo.gateway_id,
        deviceType: deviceInfo.deviceType || deviceInfo.device_type,
        endpointId: deviceInfo.endpointId || deviceInfo.endpoint_id,
        ...deviceInfo
      });
    }
  }

  /**
   * Dispara una alerta (sonido + popup)
   */
  triggerAlert(sensorType, alertData) {
    const alertKey = `${sensorType}_${alertData.value}`;
    const now = Date.now();
    const lastSent = this.lastAlertsSent.get(alertKey);
    
    // Evitar spam de alertas
    if (lastSent && (now - lastSent) < this.alertCooldown) {
      return;
    }
    
    this.lastAlertsSent.set(alertKey, now);
    
    // Agregar a alertas activas
    this.activeAlerts.set(alertKey, {
      ...alertData,
      timestamp: new Date().toISOString(),
      sensorType
    });
    
    // Sonido de alerta
    if (this.audioEnabled && this.audioContext) {
      this.playAlertSound(alertData.severity || 'warning');
    }
    
    // Popup de alerta (si está en PWA o modo standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      this.showAlertNotification(alertData);
    }
    
    // Disparar evento de alerta
    window.dispatchEvent(new CustomEvent('alert', {
      detail: alertData
    }));
    
    console.warn(`[ALERT] ${alertData.message}`);
  }

  /**
   * Reproduce sonido de alerta
   */
  playAlertSound(severity) {
    if (!this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Frecuencia según severidad
      const frequency = severity === 'critical' ? 800 : 600;
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("[ALERT] Error reproduciendo sonido:", error);
    }
  }

  /**
   * Muestra notificación de alerta (para PWA)
   */
  async showAlertNotification(alertData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Alerta IoT', {
        body: alertData.message,
        icon: '/icons/ISPC-logo.png',
        badge: '/icons/ISPC-logo.png',
        tag: 'iot-alert',
        requireInteraction: true
      });
    }
  }

  /**
   * Solicita permiso para notificaciones
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('[ALERT] Permiso de notificaciones:', permission);
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  /**
   * Obtiene alertas activas
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Limpia alertas antiguas (más de 5 minutos)
   */
  clearOldAlerts() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (new Date(alert.timestamp).getTime() < fiveMinutesAgo) {
        this.activeAlerts.delete(key);
      }
    }
  }

  /**
   * Desactiva el audio de alertas
   */
  disableAudio() {
    this.audioEnabled = false;
  }

  /**
   * Activa el audio de alertas
   */
  enableAudio() {
    this.audioEnabled = true;
  }
}

// Instancia singleton
export const alertService = new AlertService();

// Inicializar al cargar
if (typeof window !== 'undefined') {
  alertService.initialize();
}
