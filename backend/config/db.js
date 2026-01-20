import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Extraemos la clase Pool del paquete pg
const { Pool } = pg;

// Configuración para PostgreSQL (Supabase/Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // OBLIGATORIO para conectar desde Render a Supabase
    },
    // Ajustes de estabilidad para la nube
    connectionTimeoutMillis: 10000, // Esperar 10 seg antes de dar error
    idleTimeoutMillis: 30000,       // Cerrar conexiones inactivas tras 30 seg
    max: 20                         // Límite de conexiones simultáneas (suficiente para Dunkin)
});

// Prueba de conexión automática al iniciar
(async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conectado exitosamente a Supabase (PostgreSQL)');
        
        // En PostgreSQL no necesitamos configurar 'max_allowed_packet' manualmente
        // Supabase ya maneja archivos grandes y textos largos por defecto.
        
        client.release(); // Liberar la conexión al pool
    } catch (err) {
        console.error('❌ Error FATAL conectando a la Base de Datos:', err.message);
        console.error('ℹ️ Sugerencia: Verifica que la URL en .env tenga el puerto 5432.');
    }
})();

export default pool;