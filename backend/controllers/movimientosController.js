import pool from '../config/db.js';

// =========================================================
// OBTENER HISTORIAL LOGÍSTICO (TRAZABILIDAD) CON PAGINACIÓN
// =========================================================
export const getHistorialLogistico = async (req, res) => {
    try {
        // 1. Recibimos filtros y parámetros de paginación
        const { fechaInicio, fechaFin, tipo, usuario, busqueda, page = 1, limit = 10 } = req.query;

        // 2. Cálculos Paginación
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // 3. Cláusula de Tablas (JOINS)
        const tablesClause = `
            FROM movimientos m
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            LEFT JOIN stock_sistemas s ON m.equipo_serial = s.serial
            LEFT JOIN equipos_salida es ON m.equipo_serial = es.serial
        `;

        // 4. Cláusula WHERE Base
        // Usamos una lista para ir añadiendo condiciones dinámicamente
        let whereConditions = [
            `m.tipo_movimiento IN ('SALIDA_PV', 'RETORNO_STOCK', 'SALIDA_MANTENIMIENTO', 'BAJA_ACTIVO', 'DISPOSICION_FINAL', 'INGRESO_STOCK')`
        ];
        
        const params = [];
        let idx = 1; // Contador para los parámetros $1, $2...

        // --- APLICAR FILTROS ---

        // 1. Filtro Fecha
        if (fechaInicio) {
            whereConditions.push(`m.fecha::date >= $${idx++}`);
            params.push(fechaInicio);
        }
        if (fechaFin) {
            whereConditions.push(`m.fecha::date <= $${idx++}`);
            params.push(fechaFin);
        }

        // 2. Filtro Tipo
        if (tipo && tipo !== 'TODOS') {
            if (tipo === 'SALIDAS') {
                whereConditions.push(`m.tipo_movimiento IN ('SALIDA_PV', 'SALIDA_MANTENIMIENTO', 'BAJA_ACTIVO', 'DISPOSICION_FINAL')`);
            } else if (tipo === 'ENTRADAS') {
                whereConditions.push(`m.tipo_movimiento IN ('RETORNO_STOCK', 'INGRESO_STOCK')`);
            }
        }

        // 3. Filtro Usuario (ILIKE para ignorar mayúsculas)
        if (usuario) {
            whereConditions.push(`u.nombre_completo ILIKE $${idx++}`);
            params.push(`%${usuario}%`);
        }

        // 4. Búsqueda General
        if (busqueda) {
            // Se usa el mismo término para varios campos, por tanto se incrementa idx para cada uno
            // OJO: Postgres requiere un $ diferente para cada posición en el array de params
            whereConditions.push(`(
                m.equipo_serial ILIKE $${idx++} OR 
                m.ubicacion_origen ILIKE $${idx++} OR 
                m.ubicacion_destino ILIKE $${idx++} OR
                s.placa_inventario ILIKE $${idx++} OR
                es.placa_inventario ILIKE $${idx++}
            )`);
            
            const term = `%${busqueda}%`;
            // Empujamos el término 5 veces, una por cada ? que reemplazamos
            params.push(term, term, term, term, term);
        }

        // Construir el WHERE final
        const whereClause = "WHERE " + whereConditions.join(" AND ");

        // ==========================================
        // CONSULTA 1: CONTAR TOTAL DE REGISTROS
        // ==========================================
        const countSql = `SELECT COUNT(*) as total ${tablesClause} ${whereClause}`;
        const countResult = await pool.query(countSql, params);
        
        // En Postgres COUNT devuelve string, convertimos a entero
        const totalRegistros = parseInt(countResult.rows[0].total);
        const totalPaginas = Math.ceil(totalRegistros / limitNum);

        // ==========================================
        // CONSULTA 2: OBTENER LOS DATOS (PAGINADOS)
        // ==========================================
        // Añadimos LIMIT y OFFSET al final
        const dataSql = `
            SELECT 
                m.id,
                m.fecha,
                m.equipo_serial,
                m.ubicacion_origen,
                m.ubicacion_destino,
                m.tipo_movimiento,
                m.motivo,
                u.nombre_completo as usuario_responsable,
                COALESCE(s.placa_inventario, es.placa_inventario, '---') as activo_placa
            ${tablesClause}
            ${whereClause}
            ORDER BY m.id DESC
            LIMIT $${idx++} OFFSET $${idx++}
        `;

        // Agregamos limit y offset a los parámetros finales
        const dataParams = [...params, limitNum, offset];
        const dataResult = await pool.query(dataSql, dataParams);

        // ==========================================
        // RESPUESTA AL FRONTEND
        // ==========================================
        res.json({
            data: dataResult.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRegistros,
                totalPaginas
            }
        });

    } catch (error) {
        console.error("Error en historial logístico:", error);
        res.status(500).json({ message: "Error al obtener historial: " + error.message });
    }
};