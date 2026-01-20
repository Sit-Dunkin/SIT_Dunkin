import { Router } from 'express';
import multer from 'multer'; // 1. Importar Multer para leer archivos

import { 
    getStockSistemas, 
    getEquiposSalida, 
    createStock, 
    importarExcelStock, 
    importarExcelSalidas, // <--- AGREGADO: El nuevo controlador para Salidas
    updateStock, 
    deleteStock, 
    updateSalida, 
    deleteSalida,
    trasladarEquipos, 
    retornarASistemas,
    enviarAReparacion, 
    darDeBaja,
    entregarResiduos,
    getHistorialActas,
    getActaPdf,
    getMetricas,
    exportarTrazabilidadExcel,
    getMovimientosLogistico,
    getSystemLog,
    finalizarReparacion 
} from '../controllers/equiposController.js';

// Importar Seguridad
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// Configurar Multer (Guardar en memoria temporalmente para procesar rápido)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. GESTIÓN DE STOCK (Sistemas)
// ==========================================
// Ver: Todos
router.get('/stock', verifyToken, getStockSistemas);

// Crear Individual: Todos
router.post('/stock', verifyToken, createStock); 

// IMPORTAR EXCEL STOCK (Para bodega)
router.post('/stock/importar', verifyToken, upload.single('archivoExcel'), importarExcelStock);

// Editar/Borrar:  SOLO ADMIN
router.put('/stock/:id', verifyToken, requireAdmin, updateStock);
router.delete('/stock/:id', verifyToken, requireAdmin, deleteStock);

// ==========================================
// 2. GESTIÓN DE SALIDAS (Puntos de Venta)
// ==========================================
// Ver: Todos
router.get('/salidas', verifyToken, getEquiposSalida);

// IMPORTAR EXCEL SALIDAS (Para operación/calle) <--- 🔥 RUTA NUEVA AGREGADA
router.post('/salida/importar', verifyToken, upload.single('archivoExcel'), importarExcelSalidas);

// Editar/Borrar:  SOLO ADMIN
router.put('/salida/:id', verifyToken, requireAdmin, updateSalida);
router.delete('/salida/:id', verifyToken, requireAdmin, deleteSalida);

// ==========================================
// 3. LOGÍSTICA Y ACTAS (Generación de Documentos)
// ==========================================
router.post('/trasladar', verifyToken, trasladarEquipos);   // Salida a PV
router.post('/retorno', verifyToken, retornarASistemas);    // Retorno a Stock
router.post('/reparacion', verifyToken, enviarAReparacion); // Mantenimiento
router.post('/baja', verifyToken, darDeBaja);               // Baja Técnica
router.post('/residuos', verifyToken, entregarResiduos);    // Reciclaje RAEE

// ==========================================
// 4. HISTORIAL, MÉTRICAS Y LOGS
// ==========================================
router.get('/historial-actas', verifyToken, getHistorialActas);

// Descarga de PDF
router.get('/historial-actas/:id/pdf', verifyToken, getActaPdf);

router.get('/metricas', verifyToken, getMetricas);
router.get('/exportar-trazabilidad', exportarTrazabilidadExcel); 
router.get('/logistico', getMovimientosLogistico);
router.get('/system-log', verifyToken, getSystemLog); 

// Finalizar reparación (Devolver a disponible)
router.patch('/stock/:id/finalizar-reparacion', verifyToken, finalizarReparacion);

export default router;