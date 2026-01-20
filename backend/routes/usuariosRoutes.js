import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 

import { 
    getUsuarios, 
    getPerfil,
    subirFoto,
    createUsuario, 
    updateUsuario, 
    deleteUsuario,
    cambiarPassword
} from '../controllers/usuariosController.js';

const router = Router();

// ========================================================
// 1. RUTAS ESPECÍFICAS (SIEMPRE VAN PRIMERO)
// ========================================================

// Perfil
router.get('/perfil', verifyToken, getPerfil);

// Subir Foto
router.post('/foto', verifyToken, upload.single('foto'), subirFoto);


router.put('/cambiar-password', verifyToken, cambiarPassword);


// ========================================================
// 2. RUTAS DINÁMICAS /:id (VAN AL FINAL)
// ========================================================

router.get('/', verifyToken, getUsuarios);
router.post('/', verifyToken, createUsuario);

// estas rutas atrapan los IDs numéricos
router.put('/:id', verifyToken, updateUsuario);
router.delete('/:id', verifyToken, deleteUsuario);

export default router;