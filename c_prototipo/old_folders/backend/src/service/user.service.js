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
