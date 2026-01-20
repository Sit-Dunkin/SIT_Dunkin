import pool from '../config/db.js';

export const getDashboardData = async (req, res) => {
    try {
        console.time("⏱️ Dashboard Load Time"); // Para medir velocidad en consola

        // Lanzamos TODAS las consultas al mismo tiempo en paralelo
        // Esto reduce el tiempo de espera drásticamente
        const [
            resUsuarios,
            resStock,
            resPuntos,
            resEquipos,
            resMovimientos
        ] = await Promise.all([
            // 1. Usuarios Activos
            pool.query("SELECT COUNT(*) as total FROM usuarios WHERE estado = 'ACTIVO'"),

            // 2. Stock Disponible
            pool.query("SELECT COUNT(*) as total FROM stock_sistemas WHERE estado = 'DISPONIBLE'"),

            // 3. Equipos en Puntos (Salidas)
            pool.query('SELECT COUNT(*) as total FROM equipos_salida'),

            // 4. Top 5 Equipos (sin filtrar por estado)
            pool.query(`
                SELECT tipo_equipo, COUNT(*) as cantidad 
                FROM stock_sistemas 
                GROUP BY tipo_equipo 
                ORDER BY cantidad DESC 
                LIMIT 5
            `),

            // 5. Últimos Movimientos
            pool.query(`
                SELECT 
                    m.id, m.tipo_movimiento, m.ubicacion_destino as destino, 
                    m.fecha as fecha_movimiento, m.equipo_serial as serial,
                    COALESCE(s.tipo_equipo, e.tipo_equipo, 'Equipo') as tipo_equipo,
                    COALESCE(s.placa_inventario, e.placa_inventario, 'S/D') as activo, 
                    u.nombre_completo as responsable
                FROM movimientos m
                LEFT JOIN stock_sistemas s ON m.equipo_serial = s.serial
                LEFT JOIN equipos_salida e ON m.equipo_serial = e.serial
                LEFT JOIN usuarios u ON m.usuario_id = u.id
                WHERE m.tipo_movimiento IN ('SALIDA', 'RETORNO') 
                ORDER BY m.fecha DESC 
                LIMIT 5
            `)
        ]);

        // Procesamos los resultados (Parseamos los números)
        const data = {
            kpis: {
                usuarios: parseInt(resUsuarios.rows[0]?.total || 0),
                stock_sistemas: parseInt(resStock.rows[0]?.total || 0),
                en_puntos: parseInt(resPuntos.rows[0]?.total || 0)
            },
            tablas: {
                equipos_por_tipo: resEquipos.rows.map(r => ({ ...r, cantidad: parseInt(r.cantidad) })),
                ultimos_movimientos: resMovimientos.rows
            }
        };

        console.timeEnd("⏱️ Dashboard Load Time"); // Verás en la terminal cuánto tardó
        res.json(data);

    } catch (error) {
        console.error("❌ Error Dashboard:", error);
        res.status(500).json({ message: "Error al obtener datos" });
    }
};