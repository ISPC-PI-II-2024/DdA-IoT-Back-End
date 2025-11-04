// ==========================
// Resolución de rol por email usando base de datos
// - admin: campo admin = TRUE en usuarios_google
// - action: campo action = TRUE en usuarios_google
// - readonly: default
// ==========================
import { pool } from "../db/index.js";

export async function resolveRoleByEmail(email) {
  try {
    const e = (email || "").toLowerCase();
    
    // Consultar usuario en la base de datos
    const conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT admin, action FROM usuarios_google WHERE mail = ? AND activo = TRUE',
      [e]
    );
    conn.release();
    
    if (rows.length === 0) {
      // Usuario no encontrado en la DB, crear registro por defecto
      await createDefaultUser(e);
      return "readonly";
    }
    
    const user = rows[0];
    if (user.admin) return "admin";
    if (user.action) return "action";
    return "readonly";
    
  } catch (error) {
    console.error("Error resolviendo rol por email:", error);
    return "readonly"; // Fallback seguro
  }
}

async function createDefaultUser(email) {
  try {
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO usuarios_google (mail, admin, action, activo) VALUES (?, FALSE, FALSE, TRUE)',
      [email]
    );
    conn.release();
    console.log(`Usuario creado por defecto: ${email}`);
  } catch (error) {
    console.error("Error creando usuario por defecto:", error);
  }
}

/**
 * Obtiene todos los usuarios activos agrupados por tecnicatura
 * Solo selecciona campos necesarios para optimizar la query y reducir el tamaño de la respuesta
 * @returns {Promise<Object>} Objeto con tecnicaturas como keys y arrays de usuarios como values
 */
export async function getUsersByTecnicatura() {
  try {
    const conn = await pool.getConnection();
    // Solo seleccionar campos necesarios para reducir el tamaño de la respuesta
    const rows = await conn.query(`
      SELECT 
        id,
        github,
        nombre,
        foto_url,
        tecnicatura
      FROM usuarios 
      WHERE activo = 1 
        AND tecnicatura IS NOT NULL 
        AND tecnicatura != ''
        AND nombre IS NOT NULL
        AND nombre != ''
      ORDER BY tecnicatura ASC, nombre ASC
    `);
    conn.release();

    // Agrupar por tecnicatura
    const groupedByTecnicatura = {};
    
    rows.forEach(user => {
      const tecnicatura = user.tecnicatura || 'Sin tecnicatura';
      
      if (!groupedByTecnicatura[tecnicatura]) {
        groupedByTecnicatura[tecnicatura] = [];
      }
      
      groupedByTecnicatura[tecnicatura].push({
        id: user.id,
        nombre: user.nombre,
        github: user.github,
        foto_url: user.foto_url
      });
    });

    return groupedByTecnicatura;
  } catch (error) {
    console.error("Error obteniendo usuarios por tecnicatura:", error);
    throw error;
  }
}
