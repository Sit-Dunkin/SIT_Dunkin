import dns from 'dns'; // <--- 1. ESTO ES VITAL
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

dotenv.config();

// ==========================================
// 2. FORZAR IPV4 (SOLUCIÓN PARA RENDER)
// ==========================================
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); 
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/contactos', contactosRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/actas', actasRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'Online 🟢', version: 'NUEVA_CORREGIDA_IPV4' });
});

app.use((err, req, res, next) => {
    console.error("❌ Error:", err.stack);
    res.status(500).json({ message: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 SERVIDOR ONLINE EN PUERTO: ${PORT}`);
    console.log(`🛡️ SISTEMA FORZADO A IPV4 PARA GMAIL`);
});