import pool from '../config/db.js';

// =======================================================
// 1. CARGAR USUARIOS (Para llenar el filtro desplegable)
// =======================================================
export const getUsuariosFiltro = async (req, res) => {
    try {
        // CORRECCIÓN: Quitamos el "WHERE estado != 'ELIMINADO'"
        // Postgres es estricto con los ENUMs. Al quitarlo, traemos a todos
        // los usuarios (Activos e Inactivos), lo cual es ideal para
        // filtrar el historial histórico.
        const sql = `
            SELECT id, nombre_completo 
            FROM usuarios 
            ORDER BY nombre_completo ASC
        `;
        
        const result = await pool.query(sql);
        res.json(result.rows);

    } catch (error) {
        console.error("❌ Error cargando usuarios para filtro:", error.message);
        res.status(500).json({ message: "Error interno al cargar usuarios" });
    }
};

// =======================================================
// 2. CARGAR HISTORIAL (Con Filtros y PAGINACIÓN)
// =======================================================
export const getHistorialMovimientos = async (req, res) => {
    try {
        // 1. Recibimos filtros Y parámetros de paginación
        const { busqueda, fechaInicio, fechaFin, usuario, page = 1, limit = 10 } = req.query;

        console.log("📡 Backend: Solicitando historial paginado:", req.query);

        // 2. Cálculos de Paginación
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // 3. Construcción Dinámica del WHERE
        let whereClause = "WHERE 1=1";
        const params = [];
        let idx = 1; // Contador para los placeholders $1, $2...

        // --- Filtro Fecha ---
        if (fechaInicio) {
            whereClause += ` AND m.fecha >= $${idx++}`;
            params.push(`${fechaInicio} 00:00:00`);
        }
        if (fechaFin) {
            whereClause += ` AND m.fecha <= $${idx++}`;
            params.push(`${fechaFin} 23:59:59`);
        }

        // --- Filtro Usuario ---
        if (usuario && usuario !== '') {
            whereClause += ` AND m.usuario_id = $${idx++}`;
            params.push(usuario);
        }

        // --- Buscador General (ILIKE para ignorar mayúsculas) ---
        if (busqueda) {
            whereClause += ` AND (m.detalle ILIKE $${idx++} OR m.accion ILIKE $${idx++} OR u.nombre_completo ILIKE $${idx++})`;
            const searchTerm = `%${busqueda}%`;
            // Empujamos el término 3 veces (uno por cada campo de búsqueda)
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 4. CONSULTA 1: Contar Total de Registros
        const countSql = `
            SELECT COUNT(*) as total 
            FROM movimientos m
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ${whereClause}
        `;
        
        const countResult = await pool.query(countSql, params);
        const totalRegistros = parseInt(countResult.rows[0].total);
        const totalPaginas = Math.ceil(totalRegistros / limitNum);

        // 5. CONSULTA 2: Obtener los datos paginados
        const dataSql = `
            SELECT 
                m.id, 
                m.fecha,       
                m.accion,     
                m.detalle,    
                m.usuario_id,
                u.nombre_completo,
                u.nombre_completo as responsable,   -- Alias para el frontend
                u.nombre_completo as usuarioNombre  -- Respaldo
            FROM movimientos m
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ${whereClause}
            ORDER BY m.fecha DESC
            LIMIT $${idx++} OFFSET $${idx++}
        `;
        
        // Agregamos limit y offset al final de los parámetros
        const dataParams = [...params, limitNum, offset];
        
        const result = await pool.query(dataSql, dataParams);

        // 6. Respuesta al Frontend
        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRegistros,
                totalPaginas
            }
        });

    } catch (error) {
        console.error("❌ Error FATAL en historial:", error.message);
        res.status(500).json({ message: "Error al obtener datos del historial" });
    }
};