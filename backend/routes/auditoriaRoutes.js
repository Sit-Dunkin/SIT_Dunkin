import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import pool from '../config/db.js'; 

// Importamos los controladores que creamos anteriormente
import { 
    getHistorialMovimientos, 
    getUsuariosFiltro 
} from '../controllers/auditoriaController.js';

const router = Router();

// =============================================
// 1. RUTAS GET (LECTURA)
// =============================================

// ✅ ESTA ES LA QUE ARREGLA EL MENÚ DESPLEGABLE VACÍO
// Obtiene la lista de usuarios (id y nombre) para el filtro
router.get('/usuarios-filtro', verifyToken, getUsuariosFiltro);

// Obtiene el historial completo con los filtros de búsqueda y fechas
router.get('/movimientos', verifyToken, getHistorialMovimientos);


// ==========================================
// 2. RUTA POST (REGISTRO MANUAL DE LOGS)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
    console.log("🔵 (Auditoria) Recibida petición de log:", req.body);

    try {
        const { accion, detalle } = req.body;
        
        // Obtenemos el ID del usuario desde el token validado
        const usuario_id = req.user?.id || req.usuario?.id; 

        if (!usuario_id) {
            console.log("❌ Error: Usuario no identificado en el token");
            return res.status(401).json({ message: 'Usuario no identificado' });
        }

        // --- INSERTAR EN TABLA MOVIMIENTOS ---
        const sql = `
            INSERT INTO movimientos 
            (usuario_id, accion, detalle, fecha) 
            VALUES (?, ?, ?, NOW())
        `;

        await pool.query(sql, [usuario_id, accion, detalle]);
        
        console.log("✅ Log guardado en tabla 'movimientos'");
        res.status(200).json({ message: 'Log registrado correctamente' });

    } catch (error) {
        console.error("🔥 ERROR SQL al guardar log:", error.message);
        res.status(500).json({ message: 'Error al guardar log' });
    }
});

export default router;