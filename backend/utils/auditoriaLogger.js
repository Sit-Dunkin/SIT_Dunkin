import pool from '../config/db.js';

export const registrarAuditoria = async (usuarioId, accion, detalle) => {
    try {
        // Validación básica para evitar errores si no llega el ID
        if (!usuarioId) return;

        // CONSULTA ADAPTADA A POSTGRESQL (Usa $1, $2, $3 en lugar de ?)
        await pool.query(
            'INSERT INTO movimientos (usuario_id, accion, detalle, fecha) VALUES ($1, $2, $3, NOW())',
            [usuarioId, accion, detalle]
        );

    } catch (error) {
        // Si falla la auditoría, lo mostramos en consola pero no detenemos el sistema
        console.error('Error registrando auditoría:', error);
    }
};