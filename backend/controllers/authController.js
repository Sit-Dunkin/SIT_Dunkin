import dotenv from 'dotenv';
dotenv.config(); 

import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// BORRAMOS NODEMAILER DE AQUÍ
// import nodemailer from 'nodemailer'; <--- YA NO SE USA
import { registrarAuditoria } from '../utils/auditoriaLogger.js';

// IMPORTAMOS TU SERVICIO NUEVO (RESEND)
import { enviarCorreoSeguridad } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

// ==========================================
// 1. INICIAR SESIÓN (LOGIN)
// ==========================================
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Faltan credenciales." });
    }

    try {
        const result = await pool.query(
            `SELECT u.id, u.nombre_completo, u.email, u.password, u.rol_id, u.foto_perfil, u.estado, r.nombre as rol_nombre 
             FROM usuarios u 
             JOIN roles r ON u.rol_id = r.id 
             WHERE u.email = $1 AND u.estado = 'ACTIVO'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Usuario no encontrado." });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol_id, rol_nombre: user.rol_nombre },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        await registrarAuditoria(user.id, 'INICIO DE SESIÓN', 'Ingreso exitoso al sistema SIT.');

        const fotoClean = user.foto_perfil ? user.foto_perfil.replace(/\\/g, '/') : null;

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                nombre: user.nombre_completo,
                email: user.email,
                rol_nombre: user.rol_nombre,
                foto: fotoClean
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// ==========================================
// 2. CERRAR SESIÓN (LOGOUT)
// ==========================================
export const logout = async (req, res) => {
    try {
        if (req.user) {
            await registrarAuditoria(req.user.id, 'CIERRE DE SESIÓN', 'Salida voluntaria del sistema.');
        }
        res.status(200).json({ message: "Salida registrada" });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ message: "Error en logout" });
    }
};

// ==========================================
// 3. RECUPERACIÓN DE CONTRASEÑA
// ==========================================

export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND estado=\'ACTIVO\'', [email]);
        
        if (result.rows.length === 0) return res.status(404).json({ message: "Correo no registrado." });

        // Generar código
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardar código
        await pool.query(
            "UPDATE usuarios SET reset_code = $1, reset_expires = NOW() + INTERVAL '15 minutes' WHERE email = $2",
            [code, email]
        );

        // --- AQUÍ ESTABA EL ERROR ---
        // Usamos el HTML que ya tenías, pero lo enviamos con Resend
        const asunto = 'Código de Recuperación SIT';
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Recuperación de Contraseña</h2>
                <p>Tu código de verificación es:</p>
                <h1 style="letter-spacing: 5px; color: #2d89ef;">${code}</h1>
                <p>Este código expira en 15 minutos.</p>
                <small>Si no solicitaste esto, ignora este correo.</small>
            </div>
        `;

        // Usamos la función importada de emailService (que usa Resend)
        const enviado = await enviarCorreoSeguridad(email, asunto, htmlBody);

        if (enviado) {
            res.json({ message: "Código enviado a tu correo." });
        } else {
            res.status(500).json({ message: "Error enviando el correo." });
        }

    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ message: "Error al enviar correo." });
    }
};

export const verifyResetCode = async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND reset_code = $2 AND reset_expires > NOW()',
            [email, code]
        );
        
        if (result.rows.length === 0) return res.status(400).json({ message: "Código inválido o expirado." });
        
        res.json({ message: "Código correcto", verified: true });
    } catch (error) {
        console.error("Error verificando código:", error);
        res.status(500).json({ message: "Error al verificar." });
    }
};

export const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND reset_code = $2 AND reset_expires > NOW()',
            [email, code]
        );
        
        if (result.rows.length === 0) return res.status(400).json({ message: "Solicitud inválida o tiempo expirado." });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE usuarios SET password = $1, reset_code = NULL, reset_expires = NULL WHERE email = $2',
            [hashedPassword, email]
        );

        await registrarAuditoria(result.rows[0].id, 'RECUPERACIÓN CLAVE', 'Contraseña restablecida exitosamente.');
        
        res.json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
        console.error("Error actualizando password:", error);
        res.status(500).json({ message: "Error al actualizar." });
    }
};