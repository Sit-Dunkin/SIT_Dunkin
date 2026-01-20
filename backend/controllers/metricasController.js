import pool from '../config/db.js';

export const getMetricas = async (req, res) => {
    try {
        // ==========================================
        // 1. Consultas de Totales (KPIs Base)
        // ==========================================
        
        // Nota: En Postgres COUNT devuelve un string (bigint), por eso usamos parseInt()

        // Total equipos en la oficina (Incluye disponibles, reparación y bajas)
        const stockResult = await pool.query("SELECT COUNT(*) as total FROM stock_sistemas");
        const total_stock = parseInt(stockResult.rows[0].total || 0);

        // Total equipos fuera (En operación)
        const salidasResult = await pool.query("SELECT COUNT(*) as total FROM equipos_salida");
        const total_salidas = parseInt(salidasResult.rows[0].total || 0);

        // Total en Reparación (Solo en stock)
        const repResult = await pool.query("SELECT COUNT(*) as total FROM stock_sistemas WHERE estado = 'REPARACION'");
        const total_reparacion = parseInt(repResult.rows[0].total || 0);

        // Total Bajas (Solo en stock)
        const bajasResult = await pool.query("SELECT COUNT(*) as total FROM stock_sistemas WHERE estado = 'BAJA'");
        const total_bajas = parseInt(bajasResult.rows[0].total || 0);

        // ==========================================
        // 2. Listas para Modals (Detalles)
        // ==========================================
    
        const resDisponibles = await pool.query("SELECT * FROM stock_sistemas WHERE estado = 'DISPONIBLE' ORDER BY fecha_ingreso DESC");
        const listaDisponibles = resDisponibles.rows;

        const resReparacion = await pool.query("SELECT * FROM stock_sistemas WHERE estado = 'REPARACION' ORDER BY fecha_ingreso DESC");
        const listaReparacion = resReparacion.rows;

        const resBajas = await pool.query("SELECT * FROM stock_sistemas WHERE estado = 'BAJA' ORDER BY fecha_ingreso DESC");
        const listaBajas = resBajas.rows;

        // ==========================================
        // 3. Datos para Gráficas
        // ==========================================
        
        // Distribución por Estado
        const resEstados = await pool.query(`
            SELECT estado, COUNT(*) as cantidad 
            FROM stock_sistemas
            GROUP BY estado
        `);
        // Convertimos los counts de string a número para la gráfica
        const estados = resEstados.rows.map(row => ({
            estado: row.estado,
            cantidad: parseInt(row.cantidad)
        }));

        // Top Equipos (Global: Stock + Salidas)
        const resTipos = await pool.query(`
            SELECT tipo_equipo, COUNT(*) as cantidad FROM (
                SELECT tipo_equipo FROM stock_sistemas
                UNION ALL
                SELECT tipo_equipo FROM equipos_salida
            ) as todos
            GROUP BY tipo_equipo
            ORDER BY cantidad DESC
            LIMIT 5
        `);
        // Convertimos counts
        const tiposGlobal = resTipos.rows.map(row => ({
            tipo_equipo: row.tipo_equipo,
            cantidad: parseInt(row.cantidad)
        }));

        // ==========================================
        // 4. RESPUESTA JSON (Estructura idéntica para el Frontend)
        // ==========================================
        res.json({
            kpis: {
                total_stock,       
                total_salidas,     
                total_reparacion,  
                total_bajas        
            },
            detalles: {
                disponibles: listaDisponibles,
                reparacion: listaReparacion,
                bajas: listaBajas
            },
            grafica_estados: estados,
            grafica_tipos: tiposGlobal
        });

    } catch (error) {
        console.error("Error en métricas:", error);
        res.status(500).json({ message: error.message });
    }
};