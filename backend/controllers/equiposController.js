import pool from '../config/db.js';
import supabase from '../config/supabase.js';
import { enviarCorreoActa } from '../services/emailService.js';
import { registrarAuditoria } from '../utils/auditoriaLogger.js';
// FUNCIÓN DE PDF Y LA LIBRERÍA XLSX
import { 
    generarActaSalida, 
    generarActaRetorno, 
    generarActaReparacion, 
    generarActaBaja, 
    generarActaResiduos, 
    generarActaIngreso,
    generarActaIngresoMasivo 
} from '../services/pdfService.js';
import XLSX from 'xlsx'; 
import PDFDocument from 'pdfkit'; 
// =====================================================================
// HELPER 1: Promesa para generar PDF
// =====================================================================
const subirPDFASupabase = async (buffer, nombreArchivo) => {
    try {
        const { error } = await supabase
            .storage
            .from('actas')
            .upload(nombreArchivo, buffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (error) {
            console.error("❌ Error Supabase Upload:", error);
            return null;
        }

        const { data: publicData } = supabase
            .storage
            .from('actas')
            .getPublicUrl(nombreArchivo);

        return publicData.publicUrl;
    } catch (error) {
        console.error("❌ Error subiendo PDF a Supabase:", error);
        return null;
    }
};

const crearPDF = (funcionGeneradora, datos, equipos) => {
    return new Promise((resolve, reject) => {
        try {
            funcionGeneradora(datos, equipos, (buffer) => {
                resolve(buffer);
            });
        } catch (error) {
            reject(error);
        }
    });
};

// =====================================================================
// HELPER 2: Registrar Acta en BD
// =====================================================================
// =====================================================================
// HELPER: Registrar Acta en BD (Asegurando Base64 completo)
// =====================================================================
const registrarActaDB = async (connection, tipo, userId, referencia, detalles, pdfBuffer) => {
    try {
        // Buffer del PDF a Texto Base64 para guardarlo
        const pdfBase64 = pdfBuffer ? pdfBuffer.toString('base64') : null;
        
        await connection.query(
            `INSERT INTO historial_actas (tipo, usuario_id, referencia, detalles, pdf_data, fecha)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [tipo, userId, referencia, detalles, pdfBase64]
        );
    } catch (error) {
        console.error("❌ Error guardando acta en BD:", error);
        throw error; // error para que falle la transacción si esto falla
    }
};
// =====================================================================
// HELPER 3: FORMATO DE TEXTO PARA EL RESUMEN
// =====================================================================
const generarResumenEquipos = (equipos) => {
    if (!equipos || equipos.length === 0) return "Sin equipos.";
    
    let texto = `Se procesaron ${equipos.length} equipos:\n`;
    
    const lista = equipos.map(e => {
        const nombre = e.tipo_equipo || 'Equipo';
        const activo = e.placa_inventario ? e.placa_inventario : 'Sin Activo';
        const serial = e.serial || 'S/N';
        return `• ${nombre} - Activo: ${activo} (S/N: ${serial})`;
    }).join('\n');

    return texto + lista;
};

// ==========================================
// 1. GESTIÓN DE STOCK
// ==========================================
export const getStockSistemas = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT *, registrado_por as usuario_ingreso FROM stock_sistemas ORDER BY id DESC`);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Crear UN equipo en Stock (Manual)
// ==========================================
// 1. CREAR UN EQUIPO (CON LOG DETALLADO)
// ==========================================
// ==========================================
// --- INGRESO MANUAL (CORREGIDO CON NÚMERO CONSECUTIVO) ---
export const createStock = async (req, res) => {
    console.log("🚀 Iniciando proceso de creación de stock...");

    const { 
        serial, placa_inventario, tipo_equipo, marca, modelo, estado, observaciones, 
        origen_acta, recibe_acta, correo_acta, telefono_acta, cargo_acta 
    } = req.body;
    
    // 1. Validación básica
    if (!serial || !tipo_equipo) {
        return res.status(400).json({ message: "❌ Faltan datos: Serial y Tipo son obligatorios." });
    }

    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');

        // 2. Obtener datos del usuario logueado
        const userId = req.user ? req.user.id : 1; 
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const registrado_por = users.length > 0 ? users[0].nombre_completo : 'Admin SIT';
        
        console.log(`👤 Usuario registrando: ${registrado_por} (ID: ${userId})`);

        // 3. INSERTAR EN STOCK
        console.log("💾 Insertando equipo en stock_sistemas...");
        
        const { rows: result } = await connection.query(
            `INSERT INTO stock_sistemas 
            (serial, placa_inventario, tipo_equipo, marca, modelo, estado, observaciones, origen, registrado_por, registrado_por_id, fecha_ingreso)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
            [
                serial, 
                placa_inventario, 
                tipo_equipo, 
                marca, 
                modelo, 
                estado, 
                observaciones, 
                origen_acta || 'Proveedor', 
                registrado_por, 
                userId
            ]
        );
        
        const newId = result[0].id;
        console.log("✅ Equipo guardado con ID:", newId);

        // 4. REGISTRAR MOVIMIENTO
        const detalleLog = `Ingreso Manual: ${tipo_equipo} ${modelo}. Origen: ${origen_acta}`; 
        await connection.query(
            `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, motivo, accion, detalle, fecha)
             VALUES ($1, $2, $3, $4, 'INGRESO_STOCK', $5, 'CREACION', $6, NOW())`,
            [serial, userId, origen_acta || 'Proveedor', 'Oficina Sistemas', 'Ingreso', detalleLog]
        );

        // =======================================================
        // 5. GENERAR PDF (LÓGICA CORREGIDA PARA ID REAL)
        // =======================================================
        console.log("📄 Generando PDF con ID consecutivo...");
        
        const resumenActa = `Ingreso: ${tipo_equipo} ${modelo} (${serial})`;

        // PASO A: Insertar el registro "cascarón" para obtener el ID consecutivo
        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING id`,
            ['INGRESO', userId, origen_acta || 'Proveedor', resumenActa, registrado_por, 'ALMACEN SISTEMAS']
        );

        // PASO B: ¡Aquí obtenemos el número real! (Ej: 1, 2, 3...)
        const numeroOrden = resInsert[0].id;

        // Preparar datos para el PDF usando el numeroOrden real
        const datosActa = {
            numeroOrden: numeroOrden, // 🔥 USAMOS EL ID REAL
            origen_acta: origen_acta || 'PROVEEDOR EXTERNO',
            recibe_acta: recibe_acta || registrado_por,
            cargo_acta: cargo_acta || '',
            telefono_acta: telefono_acta || '',
            observaciones: observaciones || ''
        };

        const datosEquipo = {
            tipo_equipo, 
            marca, 
            modelo, 
            serial, 
            estado,
            placa_inventario: placa_inventario || 'S/N'
        };

        // PASO C: Generar el PDF
        const pdfBuffer = await crearPDF(generarActaIngreso, datosActa, datosEquipo);

        // PASO D: Subir a Supabase y actualizar BD
        const nombreArchivo = `Acta_Ingreso_${numeroOrden}.pdf`;
        const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
        const pdfBase64 = pdfBuffer.toString('base64');

        if (pdfUrl) {
            await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
        } else {
            await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
        }

        // 6. Auditoría
        await registrarAuditoria(userId, 'CREAR_EQUIPO', `Se creó equipo ${tipo_equipo} (${serial}) con Acta #${numeroOrden}`);

        await connection.query('COMMIT');
        console.log("✅ Transacción completada exitosamente.");

        // =======================================================
        // 7. ENVIAR CORREO (ESTILO DUNKIN)
        // =======================================================
        let emailSent = false;
        if (correo_acta && correo_acta.includes('@')) {
            console.log(`📧 Enviando correo a: ${correo_acta}`);
            
            const asunto = `ACTA DE INGRESO DE ACTIVOS - Nº ${numeroOrden}`;
            const mensajeTexto = `Se ha registrado el ingreso de un nuevo activo: ${tipo_equipo} (${serial}).`;
            const nombreArchivoAdjunto = `Acta_Ingreso_${numeroOrden}.pdf`;

            // HTML Estilizado
            const mensajeHTML = `
                <div style="font-family: Arial, sans-serif; color: #000;">
                    <h3 style="color: #ea580c;">Nuevo Ingreso de Activo</h3>
                    <p>Se ha registrado el ingreso del siguiente equipo al inventario:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #ea580c; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Equipo:</strong> ${tipo_equipo}</p>
                        <p style="margin: 5px 0;"><strong>Serial:</strong> ${serial}</p>
                        <p style="margin: 5px 0;"><strong>Origen:</strong> ${origen_acta}</p>
                        <p style="margin: 5px 0;"><strong>Acta Nº:</strong> ${numeroOrden}</p>
                    </div>
                    <p>Adjunto encontrará el documento PDF correspondiente.</p>
                    <br>
                    <p>Att, <strong>Departamento de Tecnología DUNKIN</strong></p>
                </div>
            `;
            
            try {
                emailSent = await enviarCorreoActa(
                    correo_acta, 
                    pdfBuffer, 
                    asunto, 
                    mensajeTexto,
                    mensajeHTML,
                    nombreArchivoAdjunto 
                );
            } catch (e) { console.error("Error enviando correo:", e); }
        }

        // =======================================================
        // 8. RESPUESTA AL FRONTEND
        // =======================================================
        res.status(201).json({ 
            message: "Equipo creado, acta guardada y correo enviado.", 
            id: newId, 
            emailStatus: emailSent ? "Enviado" : "No enviado",
            pdf: pdfBase64,
            numeroOrden: numeroOrden // 🔥 Vital para que el front nombre bien la descarga
        });

    } catch (error) {
        console.error("❌ ERROR EN CREATESTOCK:", error);
        await connection.query('ROLLBACK');
        
        if (error.code === '23505') { // ER_DUP_ENTRY en Postgres
            return res.status(409).json({ message: "El serial ya existe en la base de datos." });
        }
        
        res.status(500).json({ 
            message: "Error interno del servidor", 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

// --- IMPORTACIÓN EXCEL STOCK (CORREGIDO: PDF DE INGRESO Y COLUMNA PDF_DATA) ---
// --- IMPORTACIÓN EXCEL STOCK (MEJORADA: LOGS CON ACTIVO + RESUMEN + PDF CORREGIDO) ---
// --- IMPORTACIÓN EXCEL STOCK (ULTIMA VERSIÓN: MENSAJE PERSONALIZADO) ---
export const importarExcelStock = async (req, res) => {
    console.log("🚀 Iniciando carga masiva a STOCK (Ingreso)...");

    if (!req.file) {
        return res.status(400).json({ message: "❌ No se subió ningún archivo Excel." });
    }

    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;
        
        // 1. Obtener responsable
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const nombreUsuario = users[0]?.nombre_completo || 'Administrador';

        // 2. Leer Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const datosExcel = XLSX.utils.sheet_to_json(sheet);

        if (datosExcel.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "El archivo Excel está vacío." });
        }

        const equiposInsertados = [];
        const equiposError = [];
        let contadorInsertados = 0;

        // 3. Recorrer y Guardar
        for (const row of datosExcel) {
            // Normalización
            const serial = row.SERIAL || row.Serial || row.serial;
            const tipo = row.TIPO || row.Tipo || row.tipo || row.ELEMENTO || row.Elemento;
            
            // Validación
            if (!serial || !tipo) {
                equiposError.push({ ...row, error: "Faltan datos (Serial o Tipo)" });
                continue;
            }

            // Mapeo
            const marca = row.MARCA || row.Marca || row.marca || '';
            const modelo = row.MODELO || row.Modelo || row.modelo || '';
            const placa = row.PLACA || row.Placa || row.placa || row.ACTIVO || '';
            const observaciones = row.OBSERVACIONES || row.Observaciones || 'Carga Masiva Stock';
            const origen = row.ORIGEN || row.Origen || row.origen || row.PROVEEDOR || row.Proveedor || 'INGRESO MASIVO';

            try { 
                // A. Insertar en Stock (🔥 CORREGIDO: AÑADIDO CAMPO 'registrado_por')
                await connection.query(
                    `INSERT INTO stock_sistemas 
                    (tipo_equipo, marca, modelo, serial, placa_inventario, estado, observaciones, origen, fecha_ingreso, registrado_por)
                    VALUES ($1, $2, $3, $4, $5, 'DISPONIBLE', $6, $7, NOW(), $8)`,
                    [tipo, marca, modelo, String(serial), String(placa), observaciones, origen, nombreUsuario]
                );

                // B. Registrar Movimiento (INDIVIDUAL CON ACTIVO)
                const activoTexto = placa ? `(Activo: ${placa})` : '(S/P)';
                const detalleIndividual = `Ingreso Masivo: ${tipo} ${activoTexto}`;

                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha)
                     VALUES ($1, $2, $3, 'ALMACEN SISTEMAS', 'INGRESO', 'IMPORTACION_EXCEL', $4, NOW())`,
                    [String(serial), userId, origen, detalleIndividual]
                );

                // C. Array para PDF
                equiposInsertados.push({
                    tipo_equipo: tipo,
                    marca,
                    modelo,
                    serial: String(serial),
                    placa_inventario: String(placa) || 'S/P',
                    origen: origen,
                    estado: 'DISPONIBLE'
                });
                
                contadorInsertados++;

            } catch (err) {
                console.error(`❌ Error en serial ${serial}:`, err.message);
                const msg = err.code === '23505' ? 'Serial ya existe en BD' : err.message;
                equiposError.push({ serial, error: msg });
            }
        }

        // =======================================================
        // 4. GENERAR PDF Y LOG DE RESUMEN
        // =======================================================
        let pdfBase64 = null;
        let numeroOrden = null;

        if (contadorInsertados > 0) {
            console.log("📄 Generando Acta de Ingreso...");

            // PASO 1: Insertar Acta en Historial
            const { rows: actaResult } = await connection.query(
                `INSERT INTO historial_actas (tipo_acta, tipo, fecha, responsable, destino, detalles, usuario_id, referencia)
                 VALUES ('INGRESO', 'INGRESO', NOW(), $1, 'ALMACEN SISTEMAS', $2, $3, 'ACTA MASIVA DE INGRESO') RETURNING id`,
                [nombreUsuario, `Ingreso masivo de ${contadorInsertados} equipos desde Excel.`, userId]
            );
            
            const actaId = actaResult[0].id;
            numeroOrden = String(actaId).padStart(4, '0');

            // PASO 2: Datos PDF
            const datosParaPdf = {
                numeroOrden: numeroOrden, 
                fecha: new Date(), 
                responsable: nombreUsuario,
                recibe_nombre: "ALMACÉN TI", 
                recibe_cargo: "SISTEMAS", 
                destinoNombre: "STOCK DISPONIBLE",
                tipo_acta: "ACTA DE INGRESO ALMACÉN"
            };

            // PASO 3: Generar PDF en memoria
            const pdfBuffer = await new Promise((resolve, reject) => {
                try { 
                    generarActaIngresoMasivo(datosParaPdf, equiposInsertados, (b) => resolve(b)); 
                } catch (e) { reject(e); }
            });

            // PASO 4: Subir a Supabase
            const nombreArchivo = `Acta_Ingreso_Masivo_${numeroOrden}.pdf`;
            const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
            pdfBase64 = pdfBuffer.toString('base64');

            if (pdfUrl) {
                await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, actaId]);
            } else {
                await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, actaId]);
            }

            // LOG DE RESUMEN
            await connection.query(
                `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha)
                 VALUES ($1, $2, 'SISTEMA', 'ALMACEN', 'INGRESO_MASIVO', 'RESUMEN_CARGA', $3, NOW())`,
                ['MASIVO', userId, `Ingreso Masivo Importación excel ${contadorInsertados} equipos`]
            );
        }

        await connection.query('COMMIT');
        
        // 5. Respuesta Final
        res.json({ 
            message: contadorInsertados > 0 ? "Proceso completado con éxito." : "El proceso finalizó sin inserciones.", 
            insertados: contadorInsertados, 
            fallidos: equiposError.length,
            errores: equiposError,
            pdf: pdfBase64, 
            numeroOrden 
        });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error("❌ ERROR CRÍTICO:", error);
        res.status(500).json({ message: "Error interno: " + error.message });
    } finally {
        connection.release();
    }
};
// ==========================================
// 2. ACTUALIZAR EQUIPO (CON DETALLE DE CAMBIOS Y ORIGEN)
// ==========================================
export const updateStock = async (req, res) => {
    const { id } = req.params;
    // Datos nuevos que vienen del formulario (Agregamos 'origen')
    const { serial, placa_inventario, tipo_equipo, marca, modelo, estado, observaciones, origen } = req.body;
    
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        // 1. OBTENER DATOS "VIEJOS" (ANTES DEL CAMBIO)
        const { rows } = await connection.query('SELECT * FROM stock_sistemas WHERE id = $1', [id]);
        
        if (rows.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ message: "Equipo no encontrado" });
        }
        const equipoAnt = rows[0]; // Datos antiguos

        // 2. DETECTAR QUÉ CAMBIÓ (COMPARANDO UNO A UNO)
        let cambios = [];

        // Comparamos: Si lo viejo es diferente a lo nuevo, lo anotamos
        if (equipoAnt.tipo_equipo !== tipo_equipo) cambios.push(`Tipo: ${equipoAnt.tipo_equipo} ➝ ${tipo_equipo}`);
        if (equipoAnt.marca !== marca)             cambios.push(`Marca: ${equipoAnt.marca} ➝ ${marca}`);
        if (equipoAnt.modelo !== modelo)           cambios.push(`Modelo: ${equipoAnt.modelo} ➝ ${modelo}`);
        if (equipoAnt.placa_inventario !== placa_inventario) cambios.push(`Placa: ${equipoAnt.placa_inventario} ➝ ${placa_inventario}`);
        if (equipoAnt.serial !== serial)           cambios.push(`Serial: ${equipoAnt.serial} ➝ ${serial}`);
        if (equipoAnt.estado !== estado)           cambios.push(`Estado: ${equipoAnt.estado} ➝ ${estado}`);
        
        // 🔥 NUEVA COMPARACIÓN DE ORIGEN
        // Usamos || '' para evitar errores si en la BD es null
        if ((equipoAnt.origen || '') !== (origen || '')) {
            cambios.push(`Origen: ${equipoAnt.origen || 'N/A'} ➝ ${origen}`);
        }

        if (equipoAnt.observaciones !== observaciones) cambios.push(`Obs: Editadas`);

        // Si no hubo cambios reales, ponemos un mensaje por defecto
        const detalleCambios = cambios.length > 0 ? cambios.join(', ') : 'Se guardó sin cambios aparentes';
        
        // Identificación clara del equipo (Nombre + Activo)
        const equipoInfo = `${equipoAnt.tipo_equipo} (Activo: ${equipoAnt.placa_inventario || 'S/P'})`;

        // 3. ACTUALIZAR EN BASE DE DATOS (Incluyendo origen)
        await connection.query(
            `UPDATE stock_sistemas 
             SET serial=$1, placa_inventario=$2, tipo_equipo=$3, marca=$4, modelo=$5, estado=$6, observaciones=$7, origen=$8
             WHERE id=$9`, 
            [serial, placa_inventario, tipo_equipo, marca, modelo, estado, observaciones, origen || '', id]
        );

        // 4. GUARDAR EL "CHISME" COMPLETO EN EL LOG
        await connection.query(
            `INSERT INTO movimientos (equipo_serial, usuario_id, tipo_movimiento, accion, detalle, fecha) 
             VALUES ($1, $2, 'EDICION_STOCK', 'MODIFICACION', $3, NOW())`,
            [serial, userId, `Edición de: ${equipoInfo}. Cambios: ${detalleCambios}`]
        );

        await connection.query('COMMIT');
        res.json({ message: "Actualizado correctamente" });

    } catch (error) { 
        await connection.query('ROLLBACK'); 
        console.error(error);
        res.status(500).json({ message: "Error al actualizar: " + error.message }); 
    } finally { 
        connection.release(); 
    }
};

// ==========================================
// 3. ELIMINAR EQUIPO (CORREGIDO CON LOG)
// ==========================================
// ==========================================
// ==========================================
export const deleteStock = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        // 1. BUSCAR DATOS (Ahora traemos 'placa_inventario')
        const { rows: equipo } = await connection.query(
            'SELECT serial, placa_inventario, tipo_equipo FROM stock_sistemas WHERE id = $1', 
            [id]
        );

        if (equipo.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ message: "Equipo no encontrado" });
        }

        // 2. PREPARAR EL MENSAJE CON EL ACTIVO
        // Si no tiene placa, pondrá 'Sin Placa'
        const placa = equipo[0].placa_inventario || 'Sin Placa';
        const datosEquipo = `${equipo[0].tipo_equipo} (Activo: ${placa})`;

        // 3. ELIMINAR
        await connection.query("DELETE FROM stock_sistemas WHERE id = $1", [id]);

        // 4. REGISTRAR EN LOG
        // Seguimos guardando el serial en la columna 'equipo_serial' para referencia técnica,
        // pero en el MENSAJE (detalle) ahora sale el Activo 
        await connection.query(
            `INSERT INTO movimientos (equipo_serial, usuario_id, tipo_movimiento, accion, detalle, fecha) 
             VALUES ($1, $2, 'ELIMINACION', 'BORRADO_FISICO', $3, NOW())`,
            [equipo[0].serial, userId, `Se eliminó definitivamente el equipo: ${datosEquipo}`]
        );

        await connection.query('COMMIT');
        res.json({ message: "Eliminado correctamente" });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: "Error al eliminar: " + error.message });
    } finally {
        connection.release();
    }
};

// ==========================================
// 2. GESTIÓN DE SALIDAS
// ==========================================
export const getEquiposSalida = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT *, destino as punto_venta, motivo as ultimo_motivo, fecha_salida as fecha_ingreso, correo as email_encargado FROM equipos_salida ORDER BY id DESC`);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateSalida = async (req, res) => { 
    const { id } = req.params;
    const { serial, placa_inventario, tipo_equipo, marca, modelo, destino } = req.body;
    const connection = await pool.connect();
    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        // 1. Obtener datos antiguos
        const { rows } = await connection.query('SELECT * FROM equipos_salida WHERE id = $1', [id]);
        if (rows.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ message: "Equipo en salida no encontrado" });
        }
        const equipoAnt = rows[0];

        // 2. Detectar cambios
        let cambios = [];
        if (equipoAnt.tipo_equipo !== tipo_equipo) cambios.push(`Tipo: ${equipoAnt.tipo_equipo} ➝ ${tipo_equipo}`);
        if (equipoAnt.marca !== marca) cambios.push(`Marca: ${equipoAnt.marca} ➝ ${marca}`);
        if (equipoAnt.modelo !== modelo) cambios.push(`Modelo: ${equipoAnt.modelo} ➝ ${modelo}`);
        if (equipoAnt.placa_inventario !== placa_inventario) cambios.push(`Placa: ${equipoAnt.placa_inventario} ➝ ${placa_inventario}`);
        if (equipoAnt.serial !== serial) cambios.push(`Serial: ${equipoAnt.serial} ➝ ${serial}`);
        if (equipoAnt.destino !== destino) cambios.push(`Destino: ${equipoAnt.destino} ➝ ${destino}`);
        const detalleCambios = cambios.length > 0 ? cambios.join(', ') : 'Sin cambios aparentes';

        // 3. Actualizar
        await connection.query(
            `UPDATE equipos_salida SET serial=$1, placa_inventario=$2, tipo_equipo=$3, marca=$4, modelo=$5, destino=$6 WHERE id=$7`, 
            [serial, placa_inventario, tipo_equipo, marca, modelo, destino, id]
        );

        // 4. Registrar en log
        await connection.query(
            `INSERT INTO movimientos (equipo_serial, usuario_id, tipo_movimiento, accion, detalle, fecha) 
             VALUES ($1, $2, 'EDICION_SALIDA', 'MODIFICACION', $3, NOW())`,
            [serial, userId, `Edición de equipo en salida. Cambios: ${detalleCambios}`]
        );

        await connection.query('COMMIT');
        res.json({ message: "Equipo en salida actualizado correctamente" });
    } catch (error) { await connection.query('ROLLBACK'); res.status(500).json({ message: error.message }); } finally { connection.release(); }
};

export const deleteSalida = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.connect();
    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        const { rows: equipo } = await connection.query('SELECT serial, placa_inventario, tipo_equipo, destino FROM equipos_salida WHERE id = $1', [id]);
        if (equipo.length === 0) { await connection.query('ROLLBACK'); return res.status(404).json({ message: "Equipo en salida no encontrado" }); }
        const eqInfo = equipo[0];
        const datosEquipo = `${eqInfo.tipo_equipo} (Activo: ${eqInfo.placa_inventario || 'S/P'})`;

        await connection.query("DELETE FROM equipos_salida WHERE id = $1", [id]);
        await connection.query(`INSERT INTO movimientos (equipo_serial, usuario_id, tipo_movimiento, accion, detalle, fecha) VALUES ($1, $2, 'ELIMINACION', 'BORRADO_DE_SALIDA', $3, NOW())`, [eqInfo.serial, userId, `Se eliminó registro de salida: ${datosEquipo} que estaba en ${eqInfo.destino}`]);

        await connection.query('COMMIT');
        res.json({ message: "Registro de salida eliminado correctamente" });
    } catch (error) { await connection.query('ROLLBACK'); res.status(500).json({ message: error.message }); } finally { connection.release(); }
};

// ==========================================
// 3. LOGÍSTICA (MOVIMIENTOS + ACTAS)
// ==========================================


// --- TRASLADO / SALIDA (CORREGIDO: CONSECUTIVO REAL) ---
// ==========================================
// 2. TRASLADO DE EQUIPOS (SALIDA) - MASTER VERSION
// ==========================================
export const trasladarEquipos = async (req, res) => {
    const { equiposIds, destinoNombre, recibe_nombre, recibe_telefono, recibe_cargo, correo, motivo } = req.body;

    // Validación Inicial
    if (!equiposIds || equiposIds.length === 0) {
        return res.status(400).json({ message: "No hay equipos seleccionados para trasladar." });
    }

    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const equiposProcesados = [];
        
        // 1. Obtener responsable (Usuario Logueado)
        const userId = req.user ? req.user.id : 1;
        // Consultamos también la cédula para el PDF
        const { rows: users } = await connection.query("SELECT nombre_completo, documento_identidad FROM usuarios WHERE id = $1", [userId]);
        const nombreResponsable = users.length > 0 ? users[0].nombre_completo : 'SISTEMAS';
        const cedulaResponsable = users.length > 0 ? users[0].documento_identidad : '';

        // 2. PROCESAR EQUIPOS
        for (const id of equiposIds) {
            const { rows } = await connection.query("SELECT * FROM stock_sistemas WHERE id = $1", [id]);
            
            if (rows.length > 0) {
                const eq = rows[0];
                equiposProcesados.push(eq);

                // A. Insertar en Salidas (Usamos NOW() estándar)
                await connection.query(
                    `INSERT INTO equipos_salida (tipo_equipo, marca, placa_inventario, serial, modelo, destino, encargado, correo, motivo, fecha_salida) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`, 
                    [eq.tipo_equipo, eq.marca, eq.placa_inventario, eq.serial, eq.modelo, destinoNombre, recibe_nombre, correo, motivo]
                );

                // B. Registrar Movimiento
                const detalleLog = `Salida hacia: ${destinoNombre}. Recibe: ${recibe_nombre}.`;
                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, 'Sistemas', $3, 'SALIDA', 'TRASLADO', $4, NOW())`, 
                    [eq.serial, userId, destinoNombre, detalleLog]
                );

                // C. Eliminar del Stock activo
                await connection.query("DELETE FROM stock_sistemas WHERE id = $1", [id]);
            }
        }

        if (equiposProcesados.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "Error: No se encontraron los equipos." });
        }

        // =======================================================
        // 3. GENERAR PDF (CON ID REAL)
        // =======================================================
        
        // PASO A: Insertar hueco en Historial para ganar el ID consecutivo
        const resumen = `Salida de ${equiposProcesados.length} equipos a ${destinoNombre}`;
        
        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo_acta, tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
            ['SALIDA', 'SALIDA', userId, destinoNombre, resumen, nombreResponsable, destinoNombre]
        );

        // PASO B: ¡Tenemos el ID consecutivo!
        const numeroOrden = resInsert[0].id; 

        const datosActa = { 
            destinoNombre, 
            recibe_nombre: recibe_nombre ? recibe_nombre.toUpperCase() : 'NO REGISTRADO', 
            recibe_cargo: recibe_cargo || '', 
            recibe_telefono: recibe_telefono || '', 
            motivo: motivo || 'Asignación',
            responsable: nombreResponsable,
            cedula_responsable: cedulaResponsable, // Agregado para el PDF
            numeroOrden: numeroOrden,
            fecha: new Date() // Agregado: Fecha JS para que el PDF service la formatee con zona horaria
        };
        
        // PASO C: Generar PDF
        const pdfBuffer = await crearPDF(generarActaSalida, datosActa, equiposProcesados);
        const pdfBase64 = pdfBuffer.toString('base64');
        const nombreArchivo = `Acta_Salida_${numeroOrden}.pdf`;

        // PASO D: Subir a Supabase
        try {
            const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
            
            if (pdfUrl) {
                await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
            } else {
                await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
            }
        } catch (error) {
            console.error("Error guardando PDF:", error);
        }

        // 4. AUDITORÍA
        await registrarAuditoria(userId, 'GENERACION_ACTA', `Se generó Acta Salida #${numeroOrden} (${resumen})`);

        await connection.query('COMMIT');

        // =======================================================
        // 5. ENVIAR CORREO
        // =======================================================
        let env = false;
        if (correo && correo.includes('@')) {
            try {
                // Enviamos los datos puros. El servicio de correo pone el diseño Naranja y el Título.
                env = await enviarCorreoActa(
                    correo,                         // Destinatario
                    pdfBuffer,                      // PDF
                    `Acta de Salida #${numeroOrden}`, // Asunto
                    destinoNombre,                  // Ubicación Destino
                    recibe_nombre,                  // Persona que Recibe
                    numeroOrden,                    // Número de Acta
                    'SALIDA'                        // <--- TIPO DE ACTA (Define color Naranja)
                );
            } catch (mailError) { 
                console.error("Error envío correo salida:", mailError); 
            }
        }

        // 6. RESPUESTA
        res.json({ 
            message: "Traslado realizado con éxito", 
            emailSent: env, 
            pdf: pdfBase64,
            numeroOrden: numeroOrden 
        });

    } catch (e) { 
        await connection.query('ROLLBACK'); 
        console.error("Error en traslado:", e); 
        res.status(500).json({ message: "Error procesando el traslado: " + e.message }); 
    } finally { 
        connection.release(); 
    }
};
// --- RETORNO (CON DISEÑO DUNKIN Y NÚMERO DE ORDEN) ---
// --- RETORNO (CORREGIDO CON ID REAL) ---
// --- RETORNO (CORREGIDO Y ACTUALIZADO) ---
// --- RETORNAR A SISTEMAS (CORREGIDO: LOG CON ACTIVO) ---
// ==========================================
// 1. RETORNO A SISTEMAS (CON CORRECCIÓN "S/N")
// ==========================================
// ==========================================
// 1. RETORNO A SISTEMAS (MASTER VERSION: HORA COLOMBIA + S/N FIX + CORREO ROSA)
// ==========================================
// ==========================================
// 1. RETORNO A SISTEMAS (CORREGIDO: HORA ESTÁNDAR UTC + ARREGLO S/N)
// ==========================================
// ==========================================
// 1. RETORNO A SISTEMAS (MASTER VERSION FINAL)
// Arreglos:
// 1. HORA: Usamos NOW() estándar (UTC). El navegador convertirá a hora Col. automáticamente.
// 2. SERIALES: Detecta "S/N" o duplicados y asigna código único.
// 3. CORREO: Diseño Rosa.
// ==========================================
export const retornarASistemas = async (req, res) => {
    const { equiposIds, estado, observaciones, quien_entrega, telefono, cargo, correo, origen } = req.body;
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const equipos = [];
        const userId = req.user ? req.user.id : 1;
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const registrado_por = users.length > 0 ? users[0].nombre_completo : 'SISTEMAS';

        for (const id of equiposIds) {
            const { rows: s } = await connection.query("SELECT * FROM equipos_salida WHERE id = $1", [id]);
            if (s.length) {
                const eq = s[0];
                
                // --- 1. LÓGICA ANTI-DUPLICADOS (S/N) ---
                // Si el serial es genérico, le inventamos un sufijo único para que la DB lo acepte.
                let serialFinal = eq.serial;
                const serialesGenericos = ['S/N', 'S/P', 'S/M', 'SIN SERIAL', 'NO TIENE', 'GENERICO', 'N/A', '', null];
                
                // Limpiamos el serial y verificamos si está en la lista de prohibidos
                if (!serialFinal || serialesGenericos.includes(serialFinal.toString().trim().toUpperCase())) {
                    const randomSuffix = Math.floor(Math.random() * 100000); 
                    serialFinal = `${eq.serial || 'GEN'}-RET-${randomSuffix}`;
                }

                equipos.push(eq);
                
                // --- 2. INSERTAR EN STOCK (Usamos NOW() PURO) ---
                // NOTA: Guardamos en UTC. Tu React/Frontend convertirá a hora Colombia automáticamente.
                await connection.query(
                    `INSERT INTO stock_sistemas (tipo_equipo, marca, placa_inventario, serial, modelo, estado, observaciones, registrado_por, origen, fecha_ingreso) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`, 
                    [
                        eq.tipo_equipo, 
                        eq.marca || 'GENERICO', 
                        eq.placa_inventario || 'S/P', 
                        serialFinal,          // <--- Serial Único para evitar Error 500
                        eq.modelo || 'S/M', 
                        estado, 
                        observaciones, 
                        registrado_por, 
                        origen || eq.destino
                    ]
                );
                
                // --- 3. REGISTRO EN MOVIMIENTOS (Usamos NOW() PURO) ---
                const activoInfo = eq.placa_inventario ? `(Activo: ${eq.placa_inventario})` : '(Sin Activo)';
                const origenTexto = origen || eq.destino || 'Ubicación Externa';
                const detalleLog = `Retorno desde: ${origenTexto}. Serial Orig: ${eq.serial || 'S/N'}. Estado: ${estado}. Obs: ${observaciones}`;

                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, $3, 'Sistemas', 'RETORNO', 'INGRESO_RETORNO', $4, NOW())`, 
                    [serialFinal, userId, origenTexto, detalleLog]
                );
                
                // Eliminar de Salidas
                await connection.query("DELETE FROM equipos_salida WHERE id = $1", [id]);
            }
        }

        if (equipos.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "No se encontraron equipos para retornar." });
        }

        // =======================================================
        // 4. HISTORIAL ACTAS (Usamos NOW() PURO)
        // =======================================================
        const resumen = `Retorno de: ${equipos.length} equipos desde ${origen}`;

        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo_acta, tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
            ['RETORNO', 'RETORNO', userId, origen || 'Retorno', resumen, registrado_por, 'ALMACEN SISTEMAS']
        );
        
        const numeroOrden = resInsert[0].id;

        // =======================================================
        // 5. GENERAR PDF Y GUARDAR
        // =======================================================
        const datosActa = { 
            origen: origen || 'Punto Externo', 
            quien_entrega, 
            telefono, 
            cargo, 
            observaciones, 
            estado_final: estado,
            responsable: registrado_por, 
            numeroOrden: numeroOrden
        };

        const pdfBuffer = await crearPDF(generarActaRetorno, datosActa, equipos);
        const pdfBase64 = pdfBuffer.toString('base64');

        try {
            const nombreArchivo = `Acta_Retorno_${numeroOrden}.pdf`;
            const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
            
            if (pdfUrl) {
                await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
            } else {
                await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
            }
        } catch (error) {
            console.error("Error al guardar PDF:", error);
        }

        // 6. AUDITORÍA
        const listaEquipos = equipos.map(e => `${e.tipo_equipo}`).join(', ');
        await registrarAuditoria(userId, 'GENERACION_ACTA', `Se generó Acta de Retorno #${numeroOrden} para: ${listaEquipos}. Origen: ${origen}`);

        await connection.query('COMMIT');
        
        // =======================================================
        // 7. ENVIAR CORREO (ROSA)
        // =======================================================
        let env = false;
        if (correo && correo.includes('@')) {
            try {
                env = await enviarCorreoActa(
                    correo,                            
                    pdfBuffer,                         
                    `Acta de Retorno #${numeroOrden}`, 
                    origen,                            
                    quien_entrega,                     
                    numeroOrden,                       
                    'RETORNO'                          
                );
            } catch (e) { 
                console.error("Error envío correo retorno", e); 
            }
        }

        // 8. RESPUESTA FINAL
        res.json({ 
            message: "Retorno OK", 
            emailSent: env, 
            pdf: pdfBase64, 
            numeroOrden: numeroOrden 
        });

    } catch (e) { 
        await connection.query('ROLLBACK'); 
        console.error("Error en retorno:", e);
        res.status(500).json({ message: "Error al procesar retorno: " + e.message }); 
    } finally { 
        connection.release(); 
    }
};
// --- ENVIAR A REPARACIÓN (CORREGIDO: TIPO_ACTA EXPLÍCITO) ---
export const enviarAReparacion = async (req, res) => {
    const { equiposIds, empresa, tecnico_nombre, tecnico_id, tecnico_telefono, correo, observaciones } = req.body;
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const equipos = [];
        const userId = req.user ? req.user.id : 1;
        
        // 1. Obtener responsable
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const responsable = users.length > 0 ? users[0].nombre_completo : 'SISTEMAS DUNKIN';

        // 2. Procesar Equipos
        for (const id of equiposIds) {
            const { rows: s } = await connection.query("SELECT * FROM stock_sistemas WHERE id = $1", [id]);
            
            if (s.length) {
                const eq = s[0];
                equipos.push(eq);

                // A. Actualizar estado en Stock
                await connection.query(
                    `UPDATE stock_sistemas SET estado = 'REPARACION', observaciones = $1 WHERE id = $2`,
                    [`En Taller: ${empresa}. Falla: ${observaciones}`, id]
                );

                // B. Registrar Movimiento
                const activoInfo = eq.placa_inventario ? `(Activo: ${eq.placa_inventario})` : '';
                const detalleLog = `Salida a Mantenimiento: ${empresa}. Técnico: ${tecnico_nombre}. Obs: ${observaciones} ${activoInfo}`;
                
                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, 'Sistemas', $3, 'REPARACION', 'SALIDA_TALLER', $4, NOW())`, 
                    [eq.serial, userId, empresa, detalleLog]
                );
            }
        }

        if (equipos.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "No se seleccionaron equipos válidos." });
        }

        // =======================================================
        // 3. GENERAR PDF (CON ID REAL DE LA BD)
        // =======================================================
        const resumen = `Salida a Reparación: ${equipos.length} equipos para ${empresa}`;

        // PASO A: Insertar el registro "cascarón".
        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo_acta, tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
            ['MANTENIMIENTO', 'MANTENIMIENTO', userId, empresa, resumen, responsable, empresa]
        );

        // PASO B: Obtenemos el ID real
        const numeroOrden = resInsert[0].id;

        const datosActa = { 
            empresa: empresa || 'Servicio Técnico Externo', 
            tecnico_nombre: tecnico_nombre || '', 
            tecnico_id: tecnico_id || '', 
            tecnico_telefono: tecnico_telefono || '', 
            observaciones: observaciones || '',
            responsable: responsable,
            numeroOrden: numeroOrden // ID REAL
        };

        // PASO C: Crear PDF
        const pdfBuffer = await crearPDF(generarActaReparacion, datosActa, equipos);
        
        // PASO D: Subir a Supabase
        const nombreArchivo = `Orden_Reparacion_${numeroOrden}.pdf`;
        const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        if (pdfUrl) {
            await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
        } else {
            await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
        }
        
        // 5. AUDITORÍA
        const listaEquipos = equipos.map(e => `${e.tipo_equipo} (${e.serial})`).join(', ');
        await registrarAuditoria(userId, 'GENERACION_ACTA', `Se generó Orden de Reparación #${numeroOrden} para: ${listaEquipos}`);

        await connection.query('COMMIT');

        // =======================================================
        // 6. ENVIAR CORREO (🔥 VERSIÓN AUTOMATIZADA 🔥)
        // =======================================================
        let env = false;
        if (correo && correo.includes('@')) {
            try {
                // Enviamos los datos puros. El servicio aplica el color AZUL y el diseño.
                env = await enviarCorreoActa(
                    correo,                            // Destinatario
                    pdfBuffer,                         // PDF
                    `Orden de Servicio Técnico #${numeroOrden}`, // Asunto
                    empresa,                           // Ubicación Destino (Taller)
                    tecnico_nombre,                    // Persona Responsable (Técnico)
                    numeroOrden,                       // Número Acta
                    'REPARACION'                       // <--- TIPO (Define color Azul Técnico)
                );
            } catch (e) { 
                console.error("Error correo reparación:", e); 
            }
        }

        // 7. RESPUESTA AL FRONTEND
        res.json({ 
            message: "Equipos enviados a reparación.", 
            emailSent: env, 
            pdf: pdfBase64, 
            numeroOrden: numeroOrden 
        });

    } catch (e) { 
        await connection.query('ROLLBACK'); 
        console.error("Error en reparación:", e);
        res.status(500).json({ message: "Error al procesar: " + e.message }); 
    } finally { 
        connection.release(); 
    }
};

// --- BAJA TÉCNICA (CON LOG DETALLADO Y CORREO DUNKIN) ---
// --- BAJA TÉCNICA (CON DISEÑO DUNKIN Y NÚMERO DE ORDEN) ---
// --- BAJA TÉCNICA (CORREGIDO CON ID REAL) ---
// --- BAJA TÉCNICA (CORREGIDO CON ID REAL Y TIPO_ACTA) ---
// --- DAR DE BAJA (COMPLETA Y ACTUALIZADA) ---
export const darDeBaja = async (req, res) => {
    const { equiposIds, autoriza, destino_final, correo, observaciones } = req.body;
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const equipos = [];
        const userId = req.user ? req.user.id : 1;
        
        // 1. Obtener responsable
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const responsable = users.length > 0 ? users[0].nombre_completo : 'SISTEMAS';

        // 2. PROCESAR EQUIPOS
        for (const id of equiposIds) {
            const { rows: s } = await connection.query("SELECT * FROM stock_sistemas WHERE id = $1", [id]);
            
            if (s.length) {
                const eq = s[0];
                equipos.push(eq);
                
                // A. Actualizar estado en Stock (BAJA)
                await connection.query(
                    `UPDATE stock_sistemas 
                     SET estado='BAJA',
                         observaciones=$1,
                         registrado_por=$2
                     WHERE id=$3`, 
                    [observaciones, responsable, id]
                );
                
                // B. Registrar Log Individual
                const activoInfo = eq.placa_inventario ? `(Activo: ${eq.placa_inventario})` : '(Sin Activo)';
                const detalleLog = `Baja técnica autorizada por: ${autoriza}. Motivo: ${observaciones} ${activoInfo}`;

                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, 'Sistemas', $3, 'BAJA', 'BAJA_TECNICA', $4, NOW())`, 
                    [eq.serial, userId, destino_final, detalleLog]
                );
            }
        }

        if (equipos.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "No se seleccionaron equipos válidos." });
        }

        // =======================================================
        // 3. GENERAR PDF (CON ID REAL)
        // =======================================================
        const resumen = `Baja de ${equipos.length} equipos. Disp: ${destino_final}`;

        // PASO A: Insertar registro "hueco" para ganar el ID consecutivo.
        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo_acta, tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
            ['BAJA', 'BAJA', userId, destino_final, resumen, responsable, destino_final]
        );

        // PASO B: Obtenemos el ID real
        const numeroOrden = resInsert[0].id;

        const datosActa = { 
            autoriza, 
            destino_final, 
            observaciones,
            responsable, 
            numeroOrden  // ID REAL
        };

        // PASO C: Crear PDF
        const pdfBuffer = await crearPDF(generarActaBaja, datosActa, equipos);

        // PASO D: Subir a Supabase
        const nombreArchivo = `Acta_Baja_${numeroOrden}.pdf`;
        const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
        const pdfBase64 = pdfBuffer.toString('base64');

        if (pdfUrl) {
            await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
        } else {
            await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
        }

        // 5. AUDITORÍA GENERAL
        const listaEquipos = equipos.map(e => {
            const identificador = e.placa_inventario && e.placa_inventario !== 'S/P' 
                ? `Activo: ${e.placa_inventario}` 
                : `S/N: ${e.serial}`;
            return `${e.tipo_equipo} (${identificador})`;
        }).join(', ');

        await registrarAuditoria(userId, 'GENERACION_ACTA', `Se generó Acta de Baja #${numeroOrden} para: ${listaEquipos}`);

        await connection.query('COMMIT');

        // =======================================================
        // 6. ENVIAR CORREO (🔥 VERSIÓN AUTOMATIZADA 🔥)
        // =======================================================
        let env = false;
        if (correo && correo.includes('@')) {
            try {
                // Enviamos los datos puros. El servicio aplica el color ROJO y el diseño.
                env = await enviarCorreoActa(
                    correo,                         // Destinatario
                    pdfBuffer,                      // PDF
                    `Acta de Baja Técnica #${numeroOrden}`, // Asunto
                    destino_final,                  // Destino Final (ej: Chatarrización)
                    autoriza,                       // Persona que autoriza
                    numeroOrden,                    // Número Acta
                    'BAJA'                          // <--- TIPO (Define color Rojo Alerta)
                );
            } catch (e) { 
                console.error("Error envío correo baja", e); 
            }
        }

        // 7. RESPUESTA
        res.json({ 
            message: "Baja procesada correctamente.", 
            emailSent: env, 
            pdf: pdfBase64, 
            numeroOrden: numeroOrden 
        });

    } catch (e) { 
        await connection.query('ROLLBACK'); 
        res.status(500).json({ message: "Error al procesar la baja: " + e.message }); 
    } finally { 
        connection.release(); 
    }
};
// --- RESIDUOS / RAEE (CON LOG DETALLADO Y CORREO DUNKIN) ---
// --- RESIDUOS / RAEE (CORREGIDO CON ID REAL) ---
// --- RESIDUOS / RAEE (CORREGIDO CON ID REAL Y TIPO_ACTA) ---
export const entregarResiduos = async (req, res) => {
    const { equiposIds, empresa_reciclaje, conductor, placa_vehiculo, correo, observaciones } = req.body;
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const equipos = [];
        const userId = req.user ? req.user.id : 1;
        
        const { rows: users } = await connection.query("SELECT nombre_completo FROM usuarios WHERE id = $1", [userId]);
        const responsable = users.length > 0 ? users[0].nombre_completo : 'SISTEMAS';

        // 2. PROCESAR EQUIPOS
        for (const id of equiposIds) {
            const { rows: s } = await connection.query("SELECT * FROM stock_sistemas WHERE id = $1", [id]);
            
            if (s.length) {
                const eq = s[0];
                equipos.push(eq);

                // A. Log Individual
                const activoInfo = eq.placa_inventario ? `(Activo: ${eq.placa_inventario})` : '(Sin Activo)';
                const detalleLog = `Entrega RAEE a: ${empresa_reciclaje}. Conductor: ${conductor}. ${activoInfo}`;

                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, 'Sistemas', $3, 'RESIDUOS', 'RECICLAJE', $4, NOW())`, 
                    [eq.serial, userId, empresa_reciclaje, detalleLog]
                );
                
                // B. Eliminar del Stock
                await connection.query("DELETE FROM stock_sistemas WHERE id = $1", [id]);
            }
        }

        if (equipos.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "No se seleccionaron equipos válidos." });
        }

        // =======================================================
        // 3. GENERAR PDF (CON ID REAL)
        // =======================================================
        const resumen = `Entrega RAEE a ${empresa_reciclaje} (${equipos.length} equipos)`;

        // PASO A: Insertar registro "hueco" para ganar el ID consecutivo.
        const { rows: resInsert } = await connection.query(
            `INSERT INTO historial_actas (tipo_acta, tipo, usuario_id, referencia, detalles, fecha, responsable, destino)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
            ['RESIDUOS', 'RESIDUOS', userId, empresa_reciclaje, resumen, responsable, empresa_reciclaje]
        );

        // PASO B: Obtenemos el ID real
        const numeroOrden = resInsert[0].id;

        const datosActa = { 
            empresa_reciclaje, 
            conductor, 
            placa_vehiculo, 
            observaciones,
            responsable, 
            numeroOrden 
        };

        // PASO C: Crear PDF
        const pdfBuffer = await crearPDF(generarActaResiduos, datosActa, equipos);

        // PASO D: Subir a Supabase
        const nombreArchivo = `Manifiesto_RAEE_${numeroOrden}.pdf`;
        const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
        const pdfBase64 = pdfBuffer.toString('base64');

        if (pdfUrl) {
            await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, numeroOrden]);
        } else {
            await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, numeroOrden]);
        }

        // 5. AUDITORÍA GENERAL
        const listaEquipos = equipos.map(e => `${e.tipo_equipo} (S/N: ${e.serial})`).join(', ');
        await registrarAuditoria(userId, 'GENERACION_ACTA', `Manifiesto Residuos #${numeroOrden} para: ${listaEquipos}. Empresa: ${empresa_reciclaje}`);

        await connection.query('COMMIT');

        // =======================================================
        // 6. ENVIAR CORREO (🔥 VERSIÓN AUTOMATIZADA 🔥)
        // =======================================================
        let env = false;
        if (correo && correo.includes('@')) {
            try {
                // Enviamos los datos puros. El servicio aplica el color VERDE y el diseño.
                env = await enviarCorreoActa(
                    correo,                            // Destinatario
                    pdfBuffer,                         // PDF
                    `Manifiesto de Residuos RAEE #${numeroOrden}`, // Asunto
                    empresa_reciclaje,                 // Empresa destino (Gestor)
                    conductor,                         // Persona que recibe
                    numeroOrden,                       // Número Acta
                    'RESIDUOS'                         // <--- TIPO (Define color Verde Ecología)
                );
            } catch (e) { 
                console.error("Error envío correo residuos", e); 
            }
        }

        // 7. RESPUESTA (Con número de orden)
        res.json({ 
            message: "Residuos entregados correctamente.", 
            emailSent: env, 
            pdf: pdfBase64, 
            numeroOrden: numeroOrden 
        });

    } catch (e) { 
        await connection.query('ROLLBACK'); 
        res.status(500).json({ message: e.message }); 
    } finally { 
        connection.release(); 
    }
};
// ==========================================
// 4. HISTORIAL Y LOGS
// ==========================================


export const getSystemLog = async (req, res) => {
    try {
        // Esta consulta unifica los logs de movimientos de equipos y los logs de auditoría del sistema (ej: inicios de sesión).
        const query = `
            (
                SELECT
                    m.id, m.fecha, u.nombre_completo AS usuario,
                    CONCAT(
                        COALESCE(m.accion, m.tipo_movimiento),
                        CASE WHEN COALESCE(m.detalle, m.motivo) IS NOT NULL AND COALESCE(m.detalle, m.motivo) != '' THEN CONCAT('\n', COALESCE(m.detalle, m.motivo)) ELSE '' END,
                        CASE WHEN m.equipo_serial IS NOT NULL AND m.equipo_serial != '' THEN CONCAT('\nEquipo S/N: ', m.equipo_serial) ELSE '' END
                    ) AS accion_realizada,
                    'EQUIPO' AS tipo_log
                FROM movimientos m
                LEFT JOIN usuarios u ON m.usuario_id = u.id
            )
            UNION ALL
            (
                SELECT
                    a.id, a.fecha, u.nombre_completo AS usuario,
                    CONCAT(a.accion, CASE WHEN a.detalle IS NOT NULL AND a.detalle != '' THEN CONCAT('\n', a.detalle) ELSE '' END) AS accion_realizada,
                    'SISTEMA' AS tipo_log
                FROM auditoria a
                LEFT JOIN usuarios u ON a.usuario_id = u.id
            )
            ORDER BY fecha DESC
            LIMIT 500;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        // Si la tabla 'auditoria' no existe, ejecuta una consulta de respaldo solo con 'movimientos' para evitar que la app se rompa.
        if (error.code === 'ER_NO_SUCH_TABLE' && error.message.includes("'auditoria'")) {
            console.warn("Tabla 'auditoria' no encontrada. Mostrando solo logs de movimientos de equipos.");
            try {
                const fallbackQuery = `
                    SELECT m.id, m.fecha, u.nombre_completo AS usuario,
                        CONCAT(
                            COALESCE(m.accion, m.tipo_movimiento),
                            CASE WHEN COALESCE(m.detalle, m.motivo) IS NOT NULL AND COALESCE(m.detalle, m.motivo) != '' THEN CONCAT('\n', COALESCE(m.detalle, m.motivo)) ELSE '' END,
                            CASE WHEN m.equipo_serial IS NOT NULL AND m.equipo_serial != '' THEN CONCAT('\nEquipo S/N: ', m.equipo_serial) ELSE '' END
                        ) AS accion_realizada,
                        'EQUIPO' AS tipo_log
                    FROM movimientos m
                    LEFT JOIN usuarios u ON m.usuario_id = u.id
                    ORDER BY fecha DESC LIMIT 500;
                `;
                const { rows: fallbackRows } = await pool.query(fallbackQuery);
                return res.json(fallbackRows);
            } catch (fallbackError) {
                return res.status(500).json({ message: "Error en la consulta de respaldo de logs: " + fallbackError.message });
            }
        }
        res.status(500).json({ message: "Error al obtener el log del sistema: " + error.message });
    }
};

// =====================================================================
// 1. OBTENER EL HISTORIAL (CORREGIDO: FILTRO DUAL Y SELECT COMPLETO)
// =====================================================================
// ==========================================
// 1. LISTAR HISTORIAL (Optimizado)
// ==========================================
export const getHistorialActas = async (req, res) => {
    try {
        const { tipo, fechaInicio, fechaFin, usuario } = req.query;
        
        // 🔥 OPTIMIZACIÓN: NO traemos 'pdf_data' aquí. 
        // Solo traemos los textos para que la tabla cargue rápido.
        let query = `
            SELECT h.id, h.tipo, h.tipo_acta, h.fecha, h.referencia, h.detalles, u.nombre_completo as usuario_responsable
            FROM historial_actas h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filtro que busca en las DOS columnas (tipo y tipo_acta)
        if (tipo && tipo !== 'TODOS') { 
            query += ` AND (h.tipo = $${paramIndex} OR h.tipo_acta = $${paramIndex+1})`; 
            params.push(tipo, tipo); 
            paramIndex += 2;
        }

        if (fechaInicio) { 
            query += ` AND DATE(h.fecha) >= $${paramIndex}`; 
            params.push(fechaInicio); 
            paramIndex++;
        }
        if (fechaFin) { 
            query += ` AND DATE(h.fecha) <= $${paramIndex}`; 
            params.push(fechaFin); 
            paramIndex++;
        }
        if (usuario) { 
            query += ` AND u.nombre_completo LIKE $${paramIndex}`; 
            params.push(`%${usuario}%`); 
            paramIndex++;
        }

        query += ` ORDER BY h.id DESC`;
        
        const { rows } = await pool.query(query, params);
        res.json(rows);

    } catch (error) { 
        console.error("Error al listar actas:", error);
        res.status(500).json({ message: error.message }); 
    }
};

// =====================================================================
// 2. DESCARGAR PDF (CORREGIDO: archivo_pdf -> pdf_data)
// =====================================================================

export const getActaPdf = async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`📥 Intentando descargar Acta ID: ${id}`);

        // 🔥 ESTRATEGIA: Usamos SELECT * para traer TODAS las columnas.
        // Así no importa si el archivo está en 'pdf_data' o en 'archivo_pdf'.
        const { rows } = await pool.query("SELECT * FROM historial_actas WHERE id = $1", [id]);

        if (rows.length === 0) return res.status(404).json({ message: "Acta no encontrada en BD." });

        const acta = rows[0];

        // 1. Verificar URL de Supabase
        if (acta.url_pdf && acta.url_pdf.startsWith('http')) {
            return res.redirect(acta.url_pdf);
        }

        // 🔥 BUSQUEDA INTELIGENTE:
        // Buscamos primero en la columna nueva, si no hay nada, buscamos en la vieja.
        const dbData = acta.pdf_data || acta.archivo_pdf; 

        // Validar si está vacío (NULL) en ambas partes
        if (!dbData) {
            console.error(`❌ El acta ${id} no tiene archivo ni en 'pdf_data' ni en 'archivo_pdf'.`);
            return res.status(404).json({ message: "El documento no existe (NULL). Es posible que este registro se haya creado con error." });
        }

        // Procesar: Convertir lo que llegue (Buffer o String) a un PDF Binario
        let pdfBuffer;

        if (Buffer.isBuffer(dbData)) {
            pdfBuffer = dbData;
            // Limpieza extra por si acaso
            const asString = dbData.toString('utf-8').substring(0, 50);
            if (asString.startsWith('JVBERi') || asString.startsWith('data:application')) {
                 const fullString = dbData.toString('utf-8');
                 const base64Clean = fullString.replace(/^data:application\/pdf;base64,/, "");
                 pdfBuffer = Buffer.from(base64Clean, 'base64');
            }
        } else if (typeof dbData === 'string') {
            const base64Clean = dbData.replace(/^data:application\/pdf;base64,/, "");
            pdfBuffer = Buffer.from(base64Clean, 'base64');
        } else {
            return res.status(500).json({ message: "Formato de datos desconocido." });
        }

        // Enviar al navegador
        const tipoArchivo = acta.tipo_acta || 'DOCUMENTO';
        const filename = `Acta_${tipoArchivo}_${id.padStart(4, '0')}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        res.send(pdfBuffer);

    } catch (error) { 
        console.error("❌ Error al descargar PDF:", error);
        res.status(500).json({ message: "Error interno del servidor: " + error.message }); 
    }
};
// ==========================================
// 5. MÉTRICAS Y GRÁFICAS (REALES)
// ==========================================
// En: backend/controllers/equiposController.js

export const getMetricas = async (req, res) => {
    try {
        const connection = await pool.connect();

        // 1. Contar equipos en BODEGA (Stock)
        const { rows: stockStats } = await connection.query(`
            SELECT 
                COUNT(*) as total_bodega,
                SUM(CASE WHEN estado = 'DISPONIBLE' THEN 1 ELSE 0 END) as disponibles,
                SUM(CASE WHEN estado = 'REPARACION' THEN 1 ELSE 0 END) as reparacion,
                SUM(CASE WHEN estado = 'BAJA' THEN 1 ELSE 0 END) as bajas
            FROM stock_sistemas
        `);

        // 2. Contar equipos en SALIDA (En operación)
        const { rows: salidaStats } = await connection.query(`
            SELECT COUNT(*) as total_salida FROM equipos_salida
        `);

        // 3. Top Equipos (Para la gráfica de barras)
        const { rows: topEquipos } = await connection.query(`
            SELECT tipo_equipo, COUNT(*) as cantidad 
            FROM (
                SELECT tipo_equipo FROM stock_sistemas
                UNION ALL
                SELECT tipo_equipo FROM equipos_salida
            ) as unificados
            GROUP BY tipo_equipo
            ORDER BY cantidad DESC
            LIMIT 5
        `);

        connection.release();

        // Preparar datos seguros (evitar nulls)
        const datosStock = stockStats[0] || {};
        const totalBodega = parseInt(datosStock.total_bodega || 0);
        const totalSalida = parseInt(salidaStats[0]?.total_salida || 0);

        // Suma Total Real
        const totalGlobal = totalBodega + totalSalida;

        // Responder al Frontend con la estructura correcta
        res.json({
            total: totalGlobal,       
            disponibles: parseInt(datosStock.disponibles || 0),
            reparacion: parseInt(datosStock.reparacion || 0),
            bajas: parseInt(datosStock.bajas || 0),
            en_salida: totalSalida,
            top_equipos: topEquipos 
        });

    } catch (error) {
        console.error("Error en métricas:", error);
        res.status(500).json({ message: "Error calculando métricas" });
    }
};
// ==========================================
// EXPORTAR TRAZABILIDAD A EXCEL REAL (.XLSX)
// ==========================================
export const exportarTrazabilidadExcel = async (req, res) => {
    try {
        // 1. AUDITORÍA
        if (req.user) {
            await registrarAuditoria(
                req.user.id,
                'EXPORTACIÓN DATOS',
                'El usuario descargó el reporte Excel de Trazabilidad.'
            );
        }

        // 2. BUSCAR DATOS (CON FILTRO DE LIMPIEZA)
        const { rows } = await pool.query(`
            SELECT 
                m.fecha, 
                m.equipo_serial,
                e.tipo_equipo,
                e.placa_inventario as activo_placa, 
                m.tipo_movimiento,
                m.ubicacion_origen,
                m.ubicacion_destino,
                u.nombre_completo as usuario_responsable,
                m.motivo,
                m.detalle
            FROM movimientos m
            LEFT JOIN stock_sistemas e ON m.equipo_serial = e.serial
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.equipo_serial IS NOT NULL AND m.equipo_serial != ''
            ORDER BY m.fecha DESC
            LIMIT 2000
        `);

        // 3. PREPARAR DATOS
        const datosExcel = rows.map(row => {
            // LÓGICA DE LIMPIEZA DEL MOTIVO
            let motivoTexto = row.motivo || row.detalle || '';
            
            // Si está vacío O dice "Importación desde Excel", ponemos "Sin detalles"
            if (!motivoTexto || motivoTexto === 'Importación desde Excel') {
                motivoTexto = 'Sin detalles';
            }

            return {
                'Fecha': new Date(row.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
                'Hora': new Date(row.fecha).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }),
                'Activo (Placa)': row.activo_placa || '---',
                'Serial': row.equipo_serial || 'Sin Serial',
                'Origen': row.ubicacion_origen || '-',
                'Destino': row.ubicacion_destino || '-',
                'Tipo Movimiento': row.tipo_movimiento || 'MOVIMIENTO',
                'Usuario': row.usuario_responsable || 'Sistema',
                'Motivo': motivoTexto.replace(/\n/g, ' ') 
            };
        });

        // 4. CREAR EL LIBRO DE EXCEL
        const workSheet = XLSX.utils.json_to_sheet(datosExcel);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Trazabilidad");

        // 5. ESTILO (Ancho de columnas)
        const wscols = [
            {wch: 12}, // Fecha
            {wch: 10}, // Hora
            {wch: 15}, // Placa
            {wch: 20}, // Serial
            {wch: 20}, // Origen
            {wch: 20}, // Destino
            {wch: 25}, // Tipo Movimiento
            {wch: 25}, // Usuario
            {wch: 50}  // Motivo
        ];
        workSheet['!cols'] = wscols;

        // 6. ENVIAR
        const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Trazabilidad_${Date.now()}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);

    } catch (error) {
        console.error("Error exportando Excel:", error);
        res.status(500).json({ message: "Error al generar el reporte: " + error.message });
    }
};

// ==========================================
// OBTENER TRAZABILIDAD (PAGINADA Y FILTRADA)
// ==========================================
export const getMovimientosLogistico = async (req, res) => {
    try {
        // 1. Recibir parámetros (Página, Límite y Filtros)
        const { fechaInicio, fechaFin, tipo, busqueda, page = 1, limit = 10 } = req.query;

        // 2. Calcular Offset para SQL
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // 3. Construir la consulta BASE (Común para contar y para traer datos)
        let baseQuery = `
            FROM movimientos m
            LEFT JOIN stock_sistemas s ON m.equipo_serial = s.serial 
            LEFT JOIN equipos_salida es ON m.equipo_serial = es.serial
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE 
                m.tipo_movimiento IN ('SALIDA', 'RETORNO')
        `;

        const params = [];
        let paramIndex = 1;

        // --- Aplicar Filtros Dinámicos ---
        if (tipo && tipo !== 'TODOS') {
            baseQuery += ` AND m.tipo_movimiento = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }

        if (fechaInicio) {
            baseQuery += ` AND DATE(m.fecha) >= $${paramIndex}`;
            params.push(fechaInicio);
            paramIndex++;
        }

        if (fechaFin) {
            baseQuery += ` AND DATE(m.fecha) <= $${paramIndex}`;
            params.push(fechaFin);
            paramIndex++;
        }

        if (busqueda) {
            baseQuery += ` AND (m.equipo_serial LIKE $${paramIndex} OR s.placa_inventario LIKE $${paramIndex+1} OR es.placa_inventario LIKE $${paramIndex+2} OR m.detalle LIKE $${paramIndex+3})`;
            const term = `%${busqueda}%`;
            params.push(term, term, term, term);
            paramIndex += 4;
        }

        // 4. CONSULTA 1: Contar Total de Registros (Para saber cuántas páginas hay)
        const countSql = `SELECT COUNT(*) as total ${baseQuery}`;
        const { rows: countResult } = await pool.query(countSql, params);
        const totalItems = countResult[0].total;
        const totalPaginas = Math.ceil(totalItems / limitNum);

        // 5. CONSULTA 2: Obtener los datos paginados
        const dataSql = `
            SELECT 
                m.id,
                m.fecha, 
                m.equipo_serial,
                m.equipo_serial as serial, -- Alias extra por seguridad
                m.tipo_movimiento,
                m.ubicacion_origen,
                m.ubicacion_destino,
                u.nombre_completo as usuario_responsable,
                m.motivo,
                m.detalle,
                COALESCE(s.tipo_equipo, es.tipo_equipo, 'Equipo') as tipo_equipo,
                COALESCE(s.placa_inventario, es.placa_inventario, '---') as activo_placa
            ${baseQuery}
            ORDER BY m.fecha DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex+1}
        `;

        // Agregamos limit y offset a los parámetros finales
        const finalParams = [...params, limitNum, offset];

        const { rows } = await pool.query(dataSql, finalParams);

        // 6. Responder con estructura de paginación correcta
        res.json({
            data: rows,
            pagination: {
                totalItems,
                totalPaginas,
                currentPage: pageNum,
                itemsPerPage: limitNum
            }
        });

    } catch (error) {
        console.error("Error en Trazabilidad Logística:", error);
        res.status(500).json({ message: "Error al obtener trazabilidad" });
    }
};

// ==========================================
// FINALIZAR REPARACIÓN (Acceso para Auxiliares)
// ==========================================
export const finalizarReparacion = async (req, res) => {
    const { id } = req.params;
    const { observaciones_reparacion } = req.body; // Qué le hicieron al equipo
    
    const connection = await pool.connect();
    
    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        // 1. Verificar que el equipo exista
        const { rows } = await connection.query('SELECT * FROM stock_sistemas WHERE id = $1', [id]);
        if (rows.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ message: "Equipo no encontrado" });
        }
        const equipo = rows[0];

        // 2. Actualizar SOLO estado y observaciones
        // Se concatena la nueva observación a la vieja para no perder historial
        const nuevaObs = `${equipo.observaciones || ''} | Reparación ${new Date().toLocaleDateString()}: ${observaciones_reparacion}`;
        
        await connection.query(
            `UPDATE stock_sistemas SET estado = 'DISPONIBLE', observaciones = $1 WHERE id = $2`,
            [nuevaObs, id]
        );

        // 3. Registrar en el Historial (Movimientos)
        const detalleLog = `Reparación finalizada por técnico. Detalle: ${observaciones_reparacion}`;
        
        await connection.query(
            `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
             VALUES ($1, $2, 'Sistemas (Taller)', 'Sistemas (Stock)', 'MANTENIMIENTO', 'FIN_REPARACION', $3, NOW())`,
            [equipo.serial, userId, detalleLog]
        );

        await connection.query('COMMIT');
        res.json({ message: "Equipo reparado y disponible en Stock." });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: "Error al finalizar reparación: " + error.message });
    } finally {
        connection.release();
    }
};


// --- IMPORTAR EXCEL DIRECTO A SALIDAS (CON LOG, ACTA Y PDF) ---
// Asegúrate de tener esta importación al inicio de tu archivo:
// import { generarActaSalida } from '../services/pdfService.js';
// --- IMPORTAR EXCEL DIRECTO A SALIDAS (PERMITE MÚLTIPLES S/N) ---
export const importarExcelSalidas = async (req, res) => {
    console.log("🚀 Iniciando carga masiva a SALIDAS...");

    if (!req.file) return res.status(400).json({ message: "❌ Sin archivo." });

    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');
        const userId = req.user ? req.user.id : 1;

        // 1. Obtener Usuario
        const { rows: users } = await connection.query('SELECT nombre_completo FROM usuarios WHERE id = $1', [userId]);
        const nombreUsuario = users[0]?.nombre_completo || 'Administrador';

        // 2. Leer Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const datosExcel = XLSX.utils.sheet_to_json(sheet);

        if (datosExcel.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ message: "Excel vacío." });
        }

        let insertados = 0;
        const equiposParaActa = [];
        const errores = [];

        // 3. Procesar Filas
        for (let i = 0; i < datosExcel.length; i++) {
            const row = datosExcel[i];

            // A. LEER CAMPOS
            const tipo = row.TIPO || row.Tipo || row.ELEMENTO || row.Elemento;
            
            // Validación mínima
            if (!tipo) {
                errores.push(`Fila ${i+2}: Falta el TIPO de equipo.`);
                continue;
            }

            // B. Manejo de Serial (LOGICA SIMPLIFICADA: S/N SIEMPRE)
            let serial = row.SERIAL || row.Serial || row.serial;
            
            // Si está vacío, null o es '0', le ponemos 'S/N'
            if (!serial || String(serial).trim() === '' || String(serial) === '0') {
                serial = 'S/N'; 
            } else {
                serial = String(serial);
            }

            // C. Resto de campos
            const marca = row.MARCA || row.Marca || 'GENERICO';
            const modelo = row.MODELO || row.Modelo || 'S/M';
            const placa = row.PLACA || row.Placa || row.ACTIVO || 'S/P';
            const destino = row.DESTINO || row.Destino || 'SIN ASIGNAR'; 
            const encargado = row.ENCARGADO || row.Encargado || '';
            const correo = row.CORREO || row.Correo || '';
            const observaciones = row.OBSERVACIONES || 'Carga Masiva Salida';

            try {
                // INSERTAR EN EQUIPOS_SALIDA
                // Nota: Esto funcionará para múltiples 'S/N' solo si eliminaste el índice UNIQUE en la BD.
                await connection.query(
                    `INSERT INTO equipos_salida 
                    (tipo_equipo, marca, placa_inventario, serial, modelo, destino, encargado, correo, motivo, fecha_salida)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`, 
                    [tipo, marca, String(placa), String(serial), modelo, destino, encargado, correo, observaciones]
                );
                
                // LOG DE MOVIMIENTO INDIVIDUAL
                const detalleLog = `Salida Masiva: ${tipo} - Activo: ${placa}`;
                
                await connection.query(
                    `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                     VALUES ($1, $2, 'ALMACEN/CARGA', $3, 'SALIDA', 'IMPORTACION_EXCEL', $4, NOW())`, 
                    [String(serial), userId, destino, detalleLog]
                );

                // DATOS PARA PDF
                equiposParaActa.push({ 
                    tipo_equipo: tipo,       
                    placa_inventario: placa,
                    serial: serial,
                    destino: destino,
                    marca: marca,            
                    modelo: modelo,         
                    estado: 'OPERATIVO'
                });

                insertados++;
            } catch (err) { 
                console.error("Error fila:", err.message); 
                const msg = err.code === '23505' 
                    ? `Serial duplicado (${serial}). (Recuerda eliminar el índice UNIQUE en la BD para permitir varios S/N)` 
                    : err.message;
                errores.push(`Fila ${i+2} (${tipo}): ${msg}`);
            }
        }

        // --- 4. GENERAR ACTA Y LOG RESUMEN ---
        let pdfBase64 = null;
        let numeroOrden = null;

        if (insertados > 0) {
            console.log("📄 Creando PDF de Salida...");
            
            // A. Insertar Acta en BD (TIPO_ACTA = SALIDA)
            const { rows: actaResult } = await connection.query(
                `INSERT INTO historial_actas (tipo_acta, tipo, fecha, responsable, destino, detalles, usuario_id, referencia)
                 VALUES ('SALIDA', 'SALIDA', NOW(), $1, 'VARIOS DESTINOS', $2, $3, 'ACTA MASIVA DE SALIDA') RETURNING id`,
                [nombreUsuario, `Salida masiva de ${insertados} equipos.`, userId]
            );
            
            const actaId = actaResult[0].id;
            numeroOrden = String(actaId).padStart(4, '0');

            // B. Generar PDF
            const datosParaPdf = {
                numeroOrden: numeroOrden, 
                fecha: new Date(), 
                responsable: nombreUsuario,
                recibe_nombre: "VARIOS", 
                recibe_cargo: "OPERACIÓN", 
                destinoNombre: "LISTADO ADJUNTO", 
                tipo_acta: "ORDEN DE SALIDA"
            };

            const pdfBuffer = await new Promise((resolve, reject) => {
                try { generarActaSalida(datosParaPdf, equiposParaActa, (b) => resolve(b)); } 
                catch (e) { reject(e); }
            });

            // C. Subir a Supabase
            const nombreArchivo = `Acta_Salida_Masiva_${numeroOrden}.pdf`;
            const pdfUrl = await subirPDFASupabase(pdfBuffer, nombreArchivo);
            pdfBase64 = pdfBuffer.toString('base64');

            if (pdfUrl) {
                await connection.query(`UPDATE historial_actas SET url_pdf = $1, pdf_data = NULL WHERE id = $2`, [pdfUrl, actaId]);
            } else {
                await connection.query(`UPDATE historial_actas SET pdf_data = $1 WHERE id = $2`, [pdfBase64, actaId]);
            }

            // LOG DE RESUMEN
            await connection.query(
                `INSERT INTO movimientos (equipo_serial, usuario_id, ubicacion_origen, ubicacion_destino, tipo_movimiento, accion, detalle, fecha) 
                 VALUES ($1, $2, 'SISTEMA', 'OPERACION', 'SALIDA_MASIVA', 'RESUMEN_CARGA', $3, NOW())`, 
                ['MASIVO', userId, `Salida masiva importación de excel ${insertados} equipos.`]
            );
        }

        await connection.query('COMMIT');
        
        res.json({ 
            message: "Carga completada", 
            insertados, 
            errores: errores.length, 
            detalles_errores: errores,
            pdf: pdfBase64, 
            numeroOrden 
        });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error("❌ ERROR CRÍTICO:", error);
        res.status(500).json({ message: "Error: " + error.message });
    } finally {
        connection.release();
    }
};