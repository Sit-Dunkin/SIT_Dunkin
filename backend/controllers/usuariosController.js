import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import { registrarAuditoria } from '../utils/auditoriaLogger.js';
import { enviarCorreoSeguridad } from '../services/emailService.js'; 

// 1. OBTENER PERFIL (Usuario Logueado)
export const getPerfil = async (req, res) => {
    try {
        const id = req.user.id; 
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.nombre_completo, 
                u.email, 
                u.foto_perfil as foto, 
                r.nombre as rol_nombre
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al cargar perfil" });
    }
};

// 2. SUBIR FOTO DE PERFIL (CORREGIDO PARA CLOUDINARY ☁️)
export const subirFoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ninguna imagen' });
        }

        const id = req.user.id;
        
        // --- CORRECCIÓN CLAVE ---
        // Cloudinary nos devuelve la URL completa en req.file.path (ej: https://res.cloudinary...)
        // Ya NO le agregamos 'uploads/perfiles/' porque eso rompe el enlace.
        const fotoUrl = req.file.path;

        console.log("📸 Foto subida exitosamente a Cloudinary:", fotoUrl);

        await pool.query('UPDATE usuarios SET foto_perfil = $1 WHERE id = $2', [fotoUrl, id]);
        await registrarAuditoria(id, 'EDICIÓN', 'El usuario actualizó su foto de perfil');

        res.json({ message: 'Foto actualizada', foto: fotoUrl });
    } catch (error) {
        console.error("Error en subirFoto:", error);
        res.status(500).json({ message: 'Error al procesar la imagen' });
    }
};

// 3. OBTENER USUARIOS
export const getUsuarios = async (req, res) => {
    try {
        // Quitamos filtros de ENUM para evitar errores con Postgres
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.nombre_completo, 
                u.nombre_completo as nombre,  
                u.email, 
                u.rol_id, 
                u.estado, 
                u.foto_perfil, 
                COALESCE(r.nombre, 'Sin Rol') as rol_nombre,
                COALESCE(r.nombre, 'Sin Rol') as rol
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            ORDER BY u.id DESC
        `);
        
        const usuariosListos = result.rows.map(user => ({
            ...user,
            nombre: user.nombre_completo || 'Usuario Sin Nombre',
            email: user.email || '',
            rol: user.rol_nombre || 'Sin Rol',
            estado: user.estado || 'INACTIVO'
        }));

        res.json(usuariosListos);

    } catch (error) {
        console.error("❌ Error obteniendo usuarios:", error);
        res.status(500).json({ message: "Error al obtener usuarios: " + error.message });
    }
};

// 4. CREAR USUARIO
export const createUsuario = async (req, res) => {
    const { nombre_completo, email, password, rol_id } = req.body;
    try {
        const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (exists.rows.length > 0) return res.status(400).json({ message: "El correo ya está registrado." });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO usuarios (nombre_completo, email, password, rol_id, estado) 
             VALUES ($1, $2, $3, $4, 'ACTIVO') 
             RETURNING id`,
            [nombre_completo, email, hashedPassword, rol_id]
        );

        const newId = result.rows[0].id;

        if (req.user) await registrarAuditoria(req.user.id, 'CREACIÓN USUARIO', `Usuario creado: ${nombre_completo}`);
        res.json({ message: "Usuario creado correctamente", id: newId });

    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({ message: "Error al crear usuario" });
    }
};

// 5. EDITAR USUARIO
export const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, email, rol_id, estado, password } = req.body;
    try {
        const prev = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (prev.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        if (email !== prev.rows[0].email) {
             const checkEmail = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
             if (checkEmail.rows.length > 0) {
                 return res.status(400).json({ message: "El correo ya está en uso por otro usuario." });
             }
        }

        let queries = ["nombre_completo = $1", "email = $2", "rol_id = $3", "estado = $4"];
        let params = [nombre_completo, email, rol_id, estado];
        
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            queries.push(`password = $${params.length + 1}`);
            params.push(hashedPassword);
        }
        
        const queryFinal = `UPDATE usuarios SET ${queries.join(', ')} WHERE id = $${params.length + 1}`;
        params.push(id);
        
        await pool.query(queryFinal, params);
        
        if (req.user) await registrarAuditoria(req.user.id, 'EDICIÓN', `Se editó al usuario ID: ${id}`);
        res.json({ message: "Usuario actualizado correctamente" });
    } catch (error) {
        console.error("Error actualizando usuario:", error);
        res.status(500).json({ message: error.message });
    }
};

// 6. ELIMINAR USUARIO
export const deleteUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        if (req.user && req.user.id == id) return res.status(400).json({ message: "No puedes eliminar tu cuenta." });
        
        await pool.query("UPDATE usuarios SET estado = 'INACTIVO' WHERE id = $1", [id]);
        
        if (req.user) await registrarAuditoria(req.user.id, 'ELIMINACIÓN', `Usuario eliminado (inactivo) ID: ${id}`);
        res.json({ message: "Usuario eliminado" });
    } catch (error) {
        console.error("Error eliminando usuario:", error);
        res.status(500).json({ message: "Error al eliminar" });
    }
};

// 7. CAMBIAR CONTRASEÑA
export const cambiarPassword = async (req, res) => {
    const { passwordActual, passwordNueva } = req.body;
    const id = req.user.id; 

    try {
        const result = await pool.query('SELECT password FROM usuarios WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
        
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(passwordActual, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña actual incorrecta" });
        }

        const hashedPassword = await bcrypt.hash(passwordNueva, 10);
        await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, id]);
        await registrarAuditoria(id, 'SEGURIDAD', 'El usuario cambió su contraseña');

        res.json({ message: "Contraseña actualizada correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al cambiar contraseña" });
    }
};

// 8. RECUPERACIÓN DE CONTRASEÑA
export const olvidePassword = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query("SELECT id, nombre_completo FROM usuarios WHERE email = $1 AND estado = 'ACTIVO'", [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Correo no encontrado o inactivo" });
        }
        const usuario = result.rows[0];

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        await pool.query(
            "UPDATE usuarios SET reset_code = $1, reset_expires = NOW() + INTERVAL '15 minutes' WHERE id = $2", 
            [codigo, usuario.id]
        );

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Recuperación de Acceso SIT</h2>
                <p>Hola ${usuario.nombre_completo}, tu código es:</p>
                <h3>${codigo}</h3>
                <p>Expira en 15 minutos.</p>
            </div>
        `;

        await enviarCorreoSeguridad(email, "Código de Recuperación - SIT Dunkin", htmlContent);
        res.json({ message: "Código enviado al correo." });

    } catch (error) {
        console.error("Error en olvidePassword:", error);
        res.status(500).json({ message: "Error interno al procesar solicitud" });
    }
};

export const resetPassword = async (req, res) => {
    const { email, codigo, nuevaPassword } = req.body;
    try {
        const result = await pool.query(`
            SELECT id FROM usuarios 
            WHERE email = $1 AND reset_code = $2 AND reset_expires > NOW()
        `, [email, codigo]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Código inválido o expirado" });
        }
        const usuarioId = result.rows[0].id;
        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

        await pool.query(`
            UPDATE usuarios 
            SET password = $1, reset_code = NULL, reset_expires = NULL 
            WHERE id = $2
        `, [hashedPassword, usuarioId]);

        await registrarAuditoria(usuarioId, 'SEGURIDAD', 'Contraseña restablecida vía correo');
        res.json({ message: "Contraseña restablecida correctamente." });

    } catch (error) {
        console.error("Error en resetPassword:", error);
        res.status(500).json({ message: "Error al restablecer contraseña" });
    }
};