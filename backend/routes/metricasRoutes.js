import { Router } from 'express';
import { getMetricas } from '../controllers/metricasController.js';

const router = Router();

router.get('/', getMetricas); // GET /api/metricas

export default router;