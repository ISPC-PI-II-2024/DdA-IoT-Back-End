// ==========================
// Controladores para usuarios
// ==========================
import { getUsersByTecnicatura } from "../service/user.service.js";

/**
 * Obtiene todos los usuarios activos agrupados por tecnicatura
 * Ruta pública - no requiere autenticación
 * 
 * NOTA: Esta ruta se llama solo cuando el usuario abre el apartado "Sobre Nosotros"
 * Los datos se cachean en el frontend por 1 hora para evitar consultas innecesarias
 */
export async function getUsersByTecnicaturaController(req, res) {
  try {
    const usersByTecnicatura = await getUsersByTecnicatura();
    
    res.json({
      success: true,
      data: usersByTecnicatura,
      count: Object.keys(usersByTecnicatura).length
    });
  } catch (error) {
    console.error('Error en getUsersByTecnicaturaController:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}

