import { Router } from 'express';
import { 
    login, 
    logout, 
    requestPasswordReset, 
    verifyResetCode, 
    resetPassword 
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

// ==========================================
// RUTAS DE SESIÓN
// ==========================================
router.post('/login', login);
router.post('/logout', verifyToken, logout); 

// ==========================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-code', verifyResetCode);
router.post('/reset-password', resetPassword);

export default router;