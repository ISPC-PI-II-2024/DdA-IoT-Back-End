// --------------------------------------------------------------------
// Servicio de datos y operaciones relacionadas
// --------------------------------------------------------------------

// IMPORTACIONES
import { pool, influxDB } from "../db/index.js";

// --------------------------------------------------------------------
// FUNCIONES
// --------------------------------------------------------------------

/**
 * Obtiene todos los dispositivos disponibles
 * @returns {Promise<Array>} Lista de dispositivos
 */
export async function getAllDevices() {
  try {
    const result = await pool.execute(`
      SELECT 
        id,
        id_dispositivo,
        nombre,
        tipo,
        ubicacion,
        estado,
        id_gateway,
        id_endpoint,
        ultima_conexion,
        fecha_creacion,
        fecha_actualizacion
      FROM dispositivos 
      ORDER BY nombre ASC
    `);
    
    // mariadb pool.execute devuelve directamente las filas (no un array [rows, metadata])
    // result ya es el array de filas directamente
    return result;
  } catch (error) {
    console.error('Error obteniendo dispositivos:', error);
    throw error;
  }
}

/**
 * Obtiene información detallada de un dispositivo específico
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Object>} Información del dispositivo
 */
export async function getDeviceById(deviceId) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        id,
        id_dispositivo,
        nombre,
        tipo,
        ubicacion,
        estado,
        ultima_conexion,
        metadatos,
        fecha_creacion,
        fecha_actualizacion
      FROM dispositivos 
      WHERE id_dispositivo = ? OR id = ?
    `, [deviceId, deviceId]);
    
    if (rows.length === 0) {
      throw new Error('Dispositivo no encontrado');
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error obteniendo dispositivo:', error);
    throw error;
  }
}

/**
 * Obtiene los datos de sensores de un dispositivo específico
 * @param {string} deviceId - ID del dispositivo
 * @param {number} limit - Límite de registros (default: 100)
 * @returns {Promise<Array>} Datos de sensores del dispositivo
 */
export async function getDeviceSensorData(deviceId, limit = 100) {
  try {
    // Primero verificar que el dispositivo existe
    const deviceRows = await pool.execute(`
      SELECT id_dispositivo FROM dispositivos 
      WHERE id_dispositivo = ? OR id = ?
      LIMIT 1
    `, [deviceId, deviceId]);
    
    if (deviceRows && deviceRows.length === 0) {
      console.warn(`[DB] Dispositivo no encontrado: ${deviceId}`);
      return []; // Retornar array vacío en vez de lanzar error
    }
    
    const actualDeviceId = deviceRows && deviceRows[0] ? deviceRows[0].id_dispositivo : null;
    
    if (!actualDeviceId) {
      console.warn(`[DB] id_dispositivo es undefined para: ${deviceId}`);
      return [];
    }
    
    const rows = await pool.execute(`
      SELECT 
        id,
        tipo_sensor,
        valor,
        unidad,
        timestamp,
        metadatos
      FROM datos_sensores 
      WHERE id_dispositivo = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, [actualDeviceId, limit]);
    
    return rows;
  } catch (error) {
    console.error('[DB] Error obteniendo datos de sensores:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de un dispositivo
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Object>} Estadísticas del dispositivo
 */
export async function getDeviceStats(deviceId) {
  try {
    // Primero verificar que el dispositivo existe
    const [deviceRows] = await pool.execute(`
      SELECT id_dispositivo FROM dispositivos 
      WHERE id_dispositivo = ? OR id = ?
      LIMIT 1
    `, [deviceId, deviceId]);
    
    if (deviceRows.length === 0) {
      return {
        total_datos: 0,
        ultimo_dato: null,
        primer_dato: null,
        tipos_sensor: 0,
        promedio_valor: null
      };
    }
    
    const actualDeviceId = deviceRows[0].id_dispositivo;
    
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_datos,
        MAX(timestamp) as ultimo_dato,
        MIN(timestamp) as primer_dato,
        COUNT(DISTINCT tipo_sensor) as tipos_sensor,
        AVG(valor) as promedio_valor
      FROM datos_sensores 
      WHERE id_dispositivo = ?
    `, [actualDeviceId]);
    
    return stats[0];
  } catch (error) {
    console.error('Error obteniendo estadísticas del dispositivo:', error);
    throw error;
  }
}

/**
 * Crea o actualiza un dispositivo en la base de datos
 * @param {Object} device - Información del dispositivo
 * @returns {Promise<Object>} Dispositivo creado/actualizado
 */
export async function createOrUpdateDevice(device) {
  try {
    const {
      id_dispositivo,
      nombre,
      tipo,
      ubicacion,
      estado,
      id_gateway,
      id_endpoint,
      metadatos
    } = device;

    if (!id_dispositivo) {
      throw new Error('id_dispositivo es requerido');
    }

    // Verificar si el dispositivo ya existe
    const [existing] = await pool.execute(
      'SELECT id FROM dispositivos WHERE id_dispositivo = ?',
      [id_dispositivo]
    );

    if (existing && existing.length > 0) {
      // Actualizar dispositivo existente
      console.log(`[DB-UPDATE] Actualizando dispositivo ${id_dispositivo} con: id_gateway=${id_gateway}, id_endpoint=${id_endpoint}`);
      
      // Usar NULLIF para evitar actualizar con valores NULL, pero permitir actualizar con valores reales
      const result = await pool.execute(`
        UPDATE dispositivos 
        SET nombre = COALESCE(?, nombre),
            tipo = COALESCE(?, tipo),
            ubicacion = COALESCE(?, ubicacion),
            estado = COALESCE(?, estado),
            id_gateway = CASE WHEN ? IS NULL THEN id_gateway ELSE ? END,
            id_endpoint = CASE WHEN ? IS NULL THEN id_endpoint ELSE ? END,
            metadatos = COALESCE(?, metadatos),
            ultima_conexion = CURRENT_TIMESTAMP
        WHERE id_dispositivo = ?
      `, [nombre, tipo, ubicacion, estado, 
          id_gateway, id_gateway,
          id_endpoint, id_endpoint,
          metadatos ? JSON.stringify(metadatos) : null, 
          id_dispositivo]);

      console.log(`[DB-UPDATE] Dispositivo actualizado en DB: ${id_dispositivo}, affected rows: ${result.affectedRows}`);
      return { id_dispositivo, updated: true };
    } else {
      // Crear nuevo dispositivo
      try {
        await pool.execute(`
          INSERT INTO dispositivos 
          (id_dispositivo, nombre, tipo, ubicacion, estado, id_gateway, id_endpoint, metadatos, ultima_conexion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [id_dispositivo, nombre || id_dispositivo, tipo, ubicacion, 
            estado || 'fuera_linea', id_gateway, id_endpoint, 
            metadatos ? JSON.stringify(metadatos) : null]);

        console.log(`[DB] Nuevo dispositivo creado en DB: ${id_dispositivo}`);
        return { id_dispositivo, created: true };
      } catch (insertError) {
        // Si es error de duplicado, intentar actualizar en su lugar
        if (insertError.errno === 1062) {
          console.log(`[DB] Dispositivo ${id_dispositivo} ya existe, actualizando...`);
          await pool.execute(`
            UPDATE dispositivos 
            SET nombre = COALESCE(?, nombre),
                tipo = COALESCE(?, tipo),
                ubicacion = COALESCE(?, ubicacion),
                estado = COALESCE(?, estado),
                id_gateway = CASE WHEN ? IS NULL THEN id_gateway ELSE ? END,
                id_endpoint = CASE WHEN ? IS NULL THEN id_endpoint ELSE ? END,
                metadatos = COALESCE(?, metadatos),
                ultima_conexion = CURRENT_TIMESTAMP
            WHERE id_dispositivo = ?
          `, [nombre, tipo, ubicacion, estado, 
              id_gateway, id_gateway,
              id_endpoint, id_endpoint,
              metadatos ? JSON.stringify(metadatos) : null, 
              id_dispositivo]);

          console.log(`[DB] Dispositivo actualizado en DB (en catch): ${id_dispositivo}`);
          return { id_dispositivo, updated: true };
        }
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error creando/actualizando dispositivo:', error);
    throw error;
  }
}

/**
 * Sincroniza datos de gateway a la base de datos
 * @param {Object} gatewayData - Datos del gateway
 */
export async function syncGatewayToDB(gatewayData) {
  try {
    await createOrUpdateDevice({
      id_dispositivo: gatewayData.id,
      nombre: `Gateway ${gatewayData.id}`,
      tipo: 'gateway',
      estado: gatewayData.lora_status === 'ok' ? 'en_linea' : 'fuera_linea',
      id_gateway: gatewayData.id,
      metadatos: {
        wifi_signal: gatewayData.wifi_signal,
        lora_status: gatewayData.lora_status,
        uptime: gatewayData.uptime
      }
    });
  } catch (error) {
    console.error('Error sincronizando gateway a DB:', error);
  }
}

/**
 * Sincroniza datos de endpoint a la base de datos
 * @param {Object} endpointData - Datos del endpoint
 */
export async function syncEndpointToDB(endpointData) {
  try {
    const estado = endpointData.status === 'ok' ? 'en_linea' : 
                  endpointData.status === 'battery_low' ? 'error' : 'fuera_linea';

    console.log(`[DB-SYNC] Sincronizando endpoint ${endpointData.id} con gateway_id: ${endpointData.gateway_id}`);
    
    await createOrUpdateDevice({
      id_dispositivo: endpointData.id,
      nombre: `Endpoint ${endpointData.id}`,
      tipo: 'endpoint',
      estado: estado,
      id_gateway: endpointData.gateway_id,
      id_endpoint: null, // Los endpoints no tienen id_endpoint
      metadatos: {
        bateria: endpointData.bateria,
        cargando: endpointData.cargando,
        lora: endpointData.lora,
        num_sensores: endpointData.sensores || 0
      }
    });
    
    console.log(`[DB-SYNC] Endpoint ${endpointData.id} sincronizado exitosamente`);
  } catch (error) {
    console.error(`[DB-SYNC] Error sincronizando endpoint ${endpointData.id}:`, error);
  }
}

/**
 * Sincroniza datos de sensor a la base de datos
 * @param {Object} sensorData - Datos del sensor
 */
export async function syncSensorToDB(sensorData) {
  try {
    const estado = sensorData.status === 'ok' ? 'en_linea' : 'error';

    console.log(`[DB-SYNC] Sincronizando sensor ${sensorData.id} con gateway_id: ${sensorData.gateway_id}, endpoint_id: ${sensorData.endpoint_id}`);
    
    await createOrUpdateDevice({
      id_dispositivo: sensorData.id,
      nombre: `Sensor ${sensorData.id}`,
      tipo: 'sensor',
      estado: estado,
      id_gateway: sensorData.gateway_id,
      id_endpoint: sensorData.endpoint_id,
      metadatos: {
        posicion: sensorData.posicion,
        temperatura: sensorData.temperatura,
        humedad: sensorData.humedad,
        estado_sensor: sensorData.estado
      }
    });
    
    console.log(`[DB-SYNC] Sensor ${sensorData.id} sincronizado exitosamente`);
  } catch (error) {
    console.error(`[DB-SYNC] Error sincronizando sensor ${sensorData.id}:`, error);
  }
}

/**
 * Obtiene datos históricos de sensores desde InfluxDB
 * @param {string} deviceId - ID del dispositivo (opcional, filtra por sensor_id en los datos)
 * @param {number} limit - Límite de registros a retornar
 * @param {string} startTime - Tiempo de inicio (opcional, formato ISO 8601 o relativo como "1h", "24h")
 * @returns {Promise<Array>} Datos históricos de sensores
 */
export async function getHistoricalSensorDataFromInfluxDB(deviceId = null, limit = 100, startTime = "24h") {
  try {
    console.log(`[INFLUXDB] Consultando datos históricos${deviceId ? ` para dispositivo ${deviceId}` : ''}`);
    
    // Construir query base
    let query = `SELECT * FROM mqtt_message WHERE time >= now() - ${startTime}`;
    
    // Si se especifica DSL, puedes filtrar por tópicos de sensores específicos
    // Por ejemplo: WHERE topic = 'gateway/sensor'
    
    // Agregar filtro por dispositivo si se especifica
    if (deviceId) {
      // Buscar en los campos de sensores que contengan el deviceId
      // Los datos de sensores vienen en formato: endpoints_X_sensores_Y_*
      query += ` AND (host = 'silo-telegraf' OR topic = 'gateway/sensor')`;
    }
    
    query += ` ORDER BY time DESC LIMIT ${limit}`;
    
    console.log(`[INFLUXDB] Query: ${query}`);
    
    // Ejecutar query en InfluxDB
    const result = await influxDB.query(query);
    
    // Transformar los datos de InfluxDB a formato más legible
    const transformedData = result.map(point => {
      const data = {
        timestamp: point.time,
        topic: point.topic || 'unknown',
        host: point.host || 'unknown'
      };
      
      // Extraer campos que no sean timestamp, topic, host
      Object.keys(point).forEach(key => {
        if (!['time', 'timestamp', 'topic', 'host', 'measurement'].includes(key)) {
          const value = point[key];
          // Solo incluir valores numéricos o strings no vacíos
          if (value !== null && value !== undefined) {
            data[key] = value;
          }
        }
      });
      
      return data;
    });
    
    console.log(`[INFLUXDB] Retornando ${transformedData.length} registros`);
    return transformedData;
    
  } catch (error) {
    console.error('[INFLUXDB] Error consultando datos históricos:', error);
    throw error;
  }
}

// EXPORTACION