import { Router } from 'express';
import { getHistorialLogistico } from '../controllers/movimientosController.js'; 

const router = Router();

// GET http://localhost:4000/api/movimientos/logistico
router.get('/logistico', getHistorialLogistico);

export default router;