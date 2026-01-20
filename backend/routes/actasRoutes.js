import { Router } from 'express';
import uploadPdf from '../middleware/uploadPdfMiddleware.js';
import { subirActa } from '../controllers/actasController.js';

const router = Router();

// El frontend debe enviar el archivo con el nombre "archivo" en el FormData
router.post('/subir', uploadPdf.single('archivo'), subirActa);

export default router;