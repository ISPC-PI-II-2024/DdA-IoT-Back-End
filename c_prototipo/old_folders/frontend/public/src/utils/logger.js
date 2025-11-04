// ==========================
// Servicio de logging mejorado para el frontend
// ==========================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS.INFO;
    this.logs = [];
    this.maxLogs = 500;
    this.enableConsole = true;
    this.enableStorage = true;
    this.enableStyles = true;
  }

  setLogLevel(level) {
    if (typeof level === 'string') {
      this.logLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
    } else {
      this.logLevel = level;
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, context, message, ...args) {
    const timestamp = this.getTimestamp();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] [${context}] ${message}${formattedArgs}`;
  }

  addLog(level, context, message, ...args) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level,
      context,
      message,
      args,
      fullMessage: this.formatMessage(level, context, message, ...args)
    };

    this.logs.push(logEntry);

    // Mantener solo los últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Guardar en localStorage si está habilitado
    if (this.enableStorage) {
      try {
        localStorage.setItem('app_logs', JSON.stringify(this.logs));
      } catch (e) {
        // Ignorar errores de localStorage (cuota excedida, etc)
      }
    }
  }

  debug(context, message, ...args) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      this.addLog('DEBUG', context, message, ...args);
      if (this.enableConsole) {
        console.debug(`%c[DEBUG] [${context}]`, 'color: #888; font-weight: normal;', message, ...args);
      }
    }
  }

  info(context, message, ...args) {
    if (this.logLevel <= LOG_LEVELS.INFO) {
      this.addLog('INFO', context, message, ...args);
      if (this.enableConsole) {
        console.info(`%c[INFO] [${context}]`, 'color: #2196F3; font-weight: bold;', message, ...args);
      }
    }
  }

  warn(context, message, ...args) {
    if (this.logLevel <= LOG_LEVELS.WARN) {
      this.addLog('WARN', context, message, ...args);
      if (this.enableConsole) {
        console.warn(`%c[WARN] [${context}]`, 'color: #FF9800; font-weight: bold;', message, ...args);
      }
    }
  }

  error(context, message, ...args) {
    if (this.logLevel <= LOG_LEVELS.ERROR) {
      this.addLog('ERROR', context, message, ...args);
      if (this.enableConsole) {
        console.error(`%c[ERROR] [${context}]`, 'color: #F44336; font-weight: bold;', message, ...args);
      }
    }
  }

  getLogs(level = null, context = null) {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level.toUpperCase());
    }

    if (context) {
      filtered = filtered.filter(log => log.context === context);
    }

    return filtered;
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load logs from storage:', e);
    }
  }
}

// Crear instancia única
export const logger = new Logger();

// Exportar también la función de logging conveniente
export default logger;
