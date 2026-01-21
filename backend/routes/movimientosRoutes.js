import { Router } from 'express';
import { getHistorialLogistico } from '../controllers/movimientosController.js'; 

const router = Router();

// GET https://sit-dunkin-backend.onrender.com/api/movimientos/logistico
router.get('/logistico', getHistorialLogistico);

export default router;