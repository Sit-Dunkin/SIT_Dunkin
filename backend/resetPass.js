import pool from './config/db.js';
import bcrypt from 'bcryptjs'; // Usamos bcryptjs para consistencia con el resto del proyecto
import dotenv from 'dotenv';

// Cargar las variables del archivo .env
dotenv.config();

const fixMyUser = async () => {
    // Leer credenciales desde las variables de entorno
    const emailReal = process.env.ADMIN_EMAIL;
    const passReal = process.env.ADMIN_PASS;

    // Verificación de seguridad
    if (!emailReal || !passReal) {
        console.error("❌ Error: No se encontraron ADMIN_EMAIL o ADMIN_PASS en el archivo .env");
        process.exit(1);
    }

    console.log(`🔧 Conectando a la tabla 'usuarios' con el correo: ${emailReal}...`);

    try {
        const hash = await bcrypt.hash(passReal, 10);

        // 1. Intentar actualizar contraseña si el usuario ya existe
        // En Postgres usamos $1, $2 en lugar de ?
        const updateResult = await pool.query(
            "UPDATE usuarios SET password = $1 WHERE email = $2",
            [hash, emailReal]
        );

        // En Postgres verificamos 'rowCount' en lugar de 'affectedRows'
        if (updateResult.rowCount > 0) {
            console.log(`✅ Contraseña actualizada correctamente.`);
        } else {
            console.log(`⚠️ Usuario no encontrado. Creando nuevo usuario...`);
            
            // 2. Crear usuario si no existe
            // Asegúrate de que el ID del rol (1) exista en tu tabla de roles (ADMIN)
            await pool.query(
                "INSERT INTO usuarios (nombre_completo, email, password, rol_id, estado) VALUES ($1, $2, $3, 1, 'ACTIVO')",
                ['Yeison Molina Beltran', emailReal, hash]
            );
            console.log("✅ Usuario administrador creado exitosamente.");
        }

    } catch (error) {
        console.error("❌ Error en la base de datos:", error.message);
    } finally {
        // Cerrar el proceso limpiamente
        process.exit();
    }
};

fixMyUser();