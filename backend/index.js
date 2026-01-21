import dns from 'dns'; // <--- 1. IMPORTANTE: Importamos módulo DNS
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- IMPORTAR RUTAS ---
import equiposRoutes from './routes/equiposRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import metricasRoutes from './routes/metricasRoutes.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import auditoriaRoutes from './routes/auditoriaRoutes.js';
import contactosRoutes from './routes/contactosRoutes.js';
import movimientosRoutes from './routes/movimientosRoutes.js';
import actasRoutes from './routes/actasRoutes.js';

// Cargar variables de entorno (.env)
dotenv.config();

// ==========================================
// 2. CONFIGURACIÓN GLOBAL DNS (FIX RENDER/IPV6)
// ==========================================
// Esto es el "parche maestro". Obliga a todo Node.js a usar IPv4
// antes de intentar cualquier conexión externa (como Gmail).
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// --- CONFIGURACIÓN DE DIRECTORIOS (ES MODULES) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render asigna un puerto dinámico en process.env.PORT. 
// Si es undefined, usamos 4000 para local.
const PORT = process.env.PORT || 4000;

// --- MIDDLEWARES ---

// 1. CORS: Permite que tu Frontend (React) hable con este Backend
app.use(cors()); 

// 2. Logger: Muestra las peticiones en la consola
app.use(morgan('dev'));

// 3. JSON: Permite recibir datos en formato JSON
app.use(express.json());

// --- ARCHIVOS ESTÁTICOS ---
// Servir la carpeta 'uploads' públicamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DEFINIR ENDPOINTS (RUTAS) ---
app.use('/api/auth', authRoutes);           // Login, Registro, Recuperar Clave
app.use('/api/equipos', equiposRoutes);     // Stock, Salidas, Actas, Logística
app.use('/api/dashboard', dashboardRoutes); // Datos del Home (KPIs)
app.use('/api/metricas', metricasRoutes);   // Gráficas adicionales
app.use('/api/usuarios', usuariosRoutes);   // Gestión Empleados y Perfil
app.use('/api/auditoria', auditoriaRoutes); // Historial del Sistema
app.use('/api/contactos', contactosRoutes); // Proveedores y Puntos de Venta
app.use('/api/movimientos', movimientosRoutes); // Trazabilidad detallada
app.use('/api/actas', actasRoutes);

// --- RUTA DE PRUEBA (HEALTH CHECK) ---
app.get('/', (req, res) => {
    res.json({ 
        message: 'API SIT Dunkin Donuts - Online 🟢',
        platform: process.platform,
        network: 'IPv4 Forced',
        database: 'PostgreSQL (Supabase)',
        timestamp: new Date()
    });
});

// --- MANEJO DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
    console.error("❌ Error no controlado:", err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`\n🚀 SERVIDOR SIT CORRIENDO EN PUERTO: ${PORT}`);
    console.log(`📡 URL Base: http://localhost:${PORT}`);
    console.log(`📂 Sirviendo archivos estáticos desde: ${path.join(__dirname, 'uploads')}`);
});