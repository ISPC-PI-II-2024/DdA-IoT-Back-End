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
    } catch (error) {
      console.warn("[ALERT] AudioContext no disponible:", error);
      this.audioEnabled = false;
    }
  }

  /**
   * Carga la configuración de umbrales
   */
  loadConfig() {
    const config = configService.getAdvancedConfig();
    this.thresholds = config.thresholds || {};
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
   */
  checkTemperature(temp) {
    if (!this.thresholds.enableTempAlerts) return;
    
    const status = this.checkThreshold(
      temp,
      this.thresholds.tempCriticalMin,
      this.thresholds.tempCriticalMax,
      'temp'
    );
    
    if (status === 'low' || status === 'high') {
      this.triggerAlert('temperature', {
        type: status === 'low' ? 'temp_critical_low' : 'temp_critical_high',
        value: temp,
        threshold: status === 'low' ? this.thresholds.tempCriticalMin : this.thresholds.tempCriticalMax,
        message: status === 'low' 
          ? `Temperatura CRÍTICA baja: ${temp}°C (umbral: ${this.thresholds.tempCriticalMin}°C)`
          : `Temperatura CRÍTICA alta: ${temp}°C (umbral: ${this.thresholds.tempCriticalMax}°C)`
      });
    }
  }

  /**
   * Verifica humedad y dispara alerta si es necesario
   */
  checkHumidity(humidity) {
    if (!this.thresholds.enableHumidityAlerts) return;
    
    const status = this.checkThreshold(
      humidity,
      this.thresholds.humidityMin,
      this.thresholds.humidityMax,
      'humidity'
    );
    
    if (status === 'low' || status === 'high') {
      this.triggerAlert('humidity', {
        type: status === 'low' ? 'humidity_low' : 'humidity_high',
        value: humidity,
        threshold: status === 'low' ? this.thresholds.humidityMin : this.thresholds.humidityMax,
        message: status === 'low'
          ? `Humedad baja: ${humidity}% (umbral: ${this.thresholds.humidityMin}%)`
          : `Humedad alta: ${humidity}% (umbral: ${this.thresholds.humidityMax}%)`
      });
    }
  }

  /**
   * Verifica CO2 y dispara alerta si es necesario
   */
  checkCO2(co2) {
    if (!this.thresholds.enableCO2Alerts) return;
    
    let alertType = null;
    let severity = 'warning';
    
    if (co2 >= this.thresholds.co2Critical) {
      alertType = 'co2_critical';
      severity = 'critical';
    } else if (co2 >= this.thresholds.co2Warning) {
      alertType = 'co2_warning';
      severity = 'warning';
    }
    
    if (alertType) {
      this.triggerAlert('co2', {
        type: alertType,
        value: co2,
        threshold: co2 >= this.thresholds.co2Critical ? this.thresholds.co2Critical : this.thresholds.co2Warning,
        severity,
        message: `Nivel de CO₂ ${co2 >= this.thresholds.co2Critical ? 'CRÍTICO' : 'ELEVADO'}: ${co2}ppm`
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
