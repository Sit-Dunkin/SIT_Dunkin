import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const verifyToken = (req, res, next) => {
    // 1. el token en la cabecera de la petición
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
    }

    try {
        const secret = process.env.JWT_SECRET || 'secreto_super_seguro';
        const verified = jwt.verify(token, secret);

        // 3. ¡IMPORTANTE! Guardamos los datos del usuario (id, rol) dentro de req.user
        // Esto es lo que usa el controlador de usuarios para saber QUIÉN hizo el cambio
        req.user = verified;

        next(); // Dejamos pasar a la siguiente función (el controlador)
    } catch (error) {
        res.status(403).json({ message: "Token inválido o expirado." });
    }
};