import pool from '../config/db.js';
import { registrarAuditoria } from '../utils/auditoriaLogger.js';

// ==========================================
// 1. OBTENER TODOS LOS CONTACTOS
// ==========================================
export const getContactos = async (req, res) => {
    try {
        // En Postgres el resultado viene en .rows
        const result = await pool.query("SELECT * FROM contactos ORDER BY nombre_punto ASC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 2. CREAR NUEVO CONTACTO (Auditoría: Agregado)
// ==========================================
export const createContacto = async (req, res) => {
    const { nombre_punto, email, tipo } = req.body;
    
    // Validación reforzada
    if (!nombre_punto || !email || !tipo) {
        return res.status(400).json({ message: "Faltan datos obligatorios: Nombre, Email y Tipo son requeridos." });
    }

    try {
        // En Postgres usamos RETURNING id para obtener el ID recién creado
        const result = await pool.query(
            "INSERT INTO contactos (nombre_punto, email, tipo, activo) VALUES ($1, $2, $3, true) RETURNING id",
            [nombre_punto, email, tipo]
        );

        const nuevoId = result.rows[0].id;

        // AUDITORÍA
        if (req.user) {
            await registrarAuditoria(
                req.user.id,
                'GESTIÓN CORREOS', 
                `Se agregó nuevo contacto: ${nombre_punto} (${email}) - Tipo: ${tipo}`
            );
        }

        res.status(201).json({ message: "Contacto creado", id: nuevoId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 3. EDITAR CONTACTO (Auditoría: Detalle de cambios)
// ==========================================
export const updateContacto = async (req, res) => {
    const { id } = req.params;
    const { nombre_punto, email, tipo } = req.body;

    try {
        // 1. Obtener datos anteriores para comparar
        const prevResult = await pool.query('SELECT * FROM contactos WHERE id = $1', [id]);
        
        if (prevResult.rows.length === 0) {
            return res.status(404).json({ message: "Contacto no encontrado" });
        }
        
        const old = prevResult.rows[0];
        let cambios = [];

        // 2. Detectar qué cambió
        if (old.nombre_punto !== nombre_punto) {
            cambios.push(`Nombre cambiado de "${old.nombre_punto}" a "${nombre_punto}"`);
        }
        if (old.email !== email) {
            cambios.push(`Correo cambiado de "${old.email}" a "${email}"`);
        }
        if (old.tipo !== tipo) {
            cambios.push(`Tipo cambiado de "${old.tipo}" a "${tipo}"`);
        }

        // Si no hubo cambios, retornamos éxito sin tocar la BD
        if (cambios.length === 0) return res.json({ message: "Sin cambios detectados" });

        // 3. Actualizar en BD (Sintaxis Postgres $1, $2...)
        await pool.query(
            "UPDATE contactos SET nombre_punto=$1, email=$2, tipo=$3 WHERE id=$4",
            [nombre_punto, email, tipo, id]
        );

        // AUDITORÍA DETALLADA
        if (req.user) {
            const detalleLog = `Edición de contacto (${old.nombre_punto}): ` + cambios.join('. ');
            await registrarAuditoria(req.user.id, 'GESTIÓN CORREOS', detalleLog);
        }

        res.json({ message: "Contacto actualizado" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 4. ELIMINAR CONTACTO (Auditoría: Eliminado)
// ==========================================
export const deleteContacto = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Obtener nombre antes de borrar para el log
        const prevResult = await pool.query('SELECT nombre_punto, email FROM contactos WHERE id = $1', [id]);
        const prev = prevResult.rows;
        
        const info = prev.length > 0 ? `${prev[0].nombre_punto} (${prev[0].email})` : 'Desconocido';

        // 2. Eliminar
        await pool.query("DELETE FROM contactos WHERE id = $1", [id]);

        // AUDITORÍA
        if (req.user) {
            await registrarAuditoria(
                req.user.id,
                'GESTIÓN CORREOS',
                `Se eliminó el contacto: ${info}`
            );
        }

        res.json({ message: "Contacto eliminado" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};