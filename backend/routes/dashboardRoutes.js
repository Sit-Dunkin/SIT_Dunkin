import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
// Importar protección si la usas: import { protect } from '../controllers/authController.js';

const router = Router();

router.get('/', getDashboardData); // URL: /api/dashboard

export default router;