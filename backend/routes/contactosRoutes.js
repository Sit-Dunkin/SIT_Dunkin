import { Router } from 'express';
// 👇 1. IMPORTANTE: Traer el middleware de seguridad
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { getContactos, createContacto, updateContacto, deleteContacto } from '../controllers/contactosController.js';

const router = Router();

// Esta ruta puede quedar libre para que los formularios carguen la lista
router.get('/', getContactos);

//  2. APLICAR EL CANDADO (verifyToken) EN LAS ACCIONES
// Sin esto, el sistema no sabe quién está creando/editando y no guarda el log.

router.post('/', verifyToken, createContacto);

router.put('/:id', verifyToken, updateContacto);

router.delete('/:id', verifyToken, deleteContacto);

export default router;