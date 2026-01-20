export const requireAdmin = (req, res, next) => {
    // req.user ya fue llenado por el verifyToken anterior.
    // Verificamos si existe el rol y si es exactamente 'ADMIN'
    if (req.user && req.user.rol_nombre === 'ADMIN') {
        next(); // ¡Adelante, jefe!
    } else {
        // Si es Auxiliar o no tiene rol, lo rechazamos.
        res.status(403).json({ message: "Acceso denegado: Se requieren permisos de Administrador." });
    }
};