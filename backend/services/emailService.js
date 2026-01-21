import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// 1. CONFIGURACIÓN BLINDADA (FORZANDO IPv4)
// ==========================================

// Configuración específica para evitar Timeouts en Render
const renderConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,            // Requerido para puerto 465
    family: 4,               // <--- ¡ESTO ARREGLA EL TIMEOUT! (Fuerza IPv4)
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    logger: true,
    debug: false             // Cambiar a true solo si sigue fallando
};

// Transporte A: Para enviar ACTAS
const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    }
});

// Transporte B: Para SEGURIDAD/CLAVES
const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: {
        user: process.env.EMAIL_SEGURIDAD_USER,
        pass: process.env.EMAIL_SEGURIDAD_PASS
    }
});

// ==========================================
// 2. FUNCIONES DE ENVÍO
// ==========================================

/**
 * Función MAESTRA para enviar ACTAS.
 */
export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // --- VALORES POR DEFECTO ---
        let nombreArchivoFinal = `Documento_SIT_${Date.now()}.pdf`;
        let textoFinal = "Adjunto encontrarás el acta generada por el sistema SIT.";
        let htmlFinal = "<p>Adjunto encontrarás el documento en PDF.</p>";

        // CASO 1: Ingreso Individual / Masiva
        if (param6 && typeof param6 === 'string' && param6.endsWith('.pdf')) {
            nombreArchivoFinal = param6;
            textoFinal = param4 || textoFinal;
            htmlFinal = param5 || htmlFinal;
        }
        
        // CASO 2: Salida / Traslado
        else if (param4 && typeof param4 === 'string' && param4.endsWith('.pdf')) {
            nombreArchivoFinal = param4;
            htmlFinal = param5 || htmlFinal;
            textoFinal = `Hola, adjunto encontrarás el archivo: ${nombreArchivoFinal}`;
        }

        // CASO 3: Ingreso con Objeto de Datos
        else if (typeof param5 === 'object' && param5 !== null) {
            
            const { origen = 'Proveedor', recibe = 'Sistemas', equipo = 'Equipo', serial = 'S/N' } = param5;
            
            if (param4 && typeof param4 === 'string' && param4.endsWith('.pdf')) {
                nombreArchivoFinal = param4;
            }

            textoFinal = `Ingreso de equipo: ${equipo}. Origen: ${origen}. Recibe: ${recibe}.`;

            htmlFinal = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #F37021; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">¡Nuevo Ingreso a Stock SIT!</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>Confirmamos el ingreso exitoso al sistema.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #F37021; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>🏢 Origen:</strong> ${origen}</p>
                            <p style="margin: 5px 0;"><strong>👤 Recibe:</strong> ${recibe}</p>
                            <p style="margin: 5px 0;"><strong>💻 Equipo:</strong> ${equipo}</p>
                            <p style="margin: 5px 0;"><strong>🔢 Serial:</strong> ${serial}</p>
                        </div>
                        <p>El documento oficial se encuentra adjunto.</p>
                    </div>
                    <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                        Tecnología y Sistemas Dunkin'
                    </div>
                </div>
            `;
        }
        // CASO 4: Fallback simple
        else {
            if (param4) textoFinal = param4;
            if (param5) htmlFinal = param5;
        }

        const info = await transporterActas.sendMail({
            from: `"Gestión Inventario SIT Dunkin" <${process.env.EMAIL_ACTAS_USER}>`,
            to: destinatario,
            subject: asunto, 
            text: textoFinal,    
            html: htmlFinal, 
            attachments: [
                {
                    filename: nombreArchivoFinal,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        
        console.log(`📧 Acta enviada a [${destinatario}] | ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error("❌ Error enviando acta:", error);
        return false;
    }
};

/**
 * Función para enviar CÓDIGOS DE RECUPERACIÓN.
 */
export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 Intentando enviar seguridad a: ${destinatario}...`);

        const info = await transporterSeguridad.sendMail({
            from: `"Seguridad SIT Dunkin" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });

        console.log("✅ Correo seguridad enviado | ID: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error CRÍTICO enviando seguridad:", error);
        return false;
    }
};