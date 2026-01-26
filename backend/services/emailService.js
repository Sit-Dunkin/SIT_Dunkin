import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN FINAL: PUERTO 465 (SSL DIRECTO)
// ==========================================
console.log("📧 INICIANDO SERVICIO DE CORREO: PUERTO 465 (SSL BLINDADO)");

const renderConfig = {
    host: "smtp.gmail.com",
    port: 465,               // <--- CAMBIO CLAVE: Puerto SSL directo
    secure: true,            // <--- OBLIGATORIO: true para puerto 465
    family: 4,               // <--- CRÍTICO: Fuerza IPv4 (No borrar)
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    // Opciones extra para evitar bloqueos de cifrado
    tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
    },
    // Tiempos de espera para debug (ver logs)
    connectionTimeout: 15000, 
    greetingTimeout: 10000
};

// --- CREAR TRANSPORTADORES ---
const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_ACTAS_USER, pass: process.env.EMAIL_ACTAS_PASS }
});

const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_SEGURIDAD_USER, pass: process.env.EMAIL_SEGURIDAD_PASS }
});

// --- VERIFICACIÓN DE CONEXIÓN AL ARRANCAR ---
// Esto nos dirá INMEDIATAMENTE si funciona, sin esperar a que envíes correo
transporterSeguridad.verify((error, success) => {
    if (error) {
        console.error("❌ ERROR AL CONECTAR AL INICIO (465):", error);
    } else {
        console.log("✅ CONEXIÓN EXITOSA CON GMAIL (PUERTO 465) - LISTO 🚀");
    }
});

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // --- Lógica de parámetros simplificada para prueba ---
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto documento SIT.";
        let htmlFinal = "<p>Adjunto documento SIT.</p>";

        if (param6 && typeof param6 === 'string') { nombreArchivoFinal = param6; textoFinal = param4; htmlFinal = param5; }
        else if (param4 && typeof param4 === 'string') { nombreArchivoFinal = param4; htmlFinal = param5; }
        
        const info = await transporterActas.sendMail({
            from: `"SIT Dunkin" <${process.env.EMAIL_ACTAS_USER}>`,
            to: destinatario,
            subject: asunto, 
            text: textoFinal,    
            html: htmlFinal, 
            attachments: [{ filename: nombreArchivoFinal, content: pdfBuffer, contentType: 'application/pdf' }]
        });
        
        console.log(`✅ Acta enviada: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Error enviando acta:", error);
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 Intentando enviar seguridad a: ${destinatario}...`);
        const info = await transporterSeguridad.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });
        console.log("✅ Enviado correctamente: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error enviando seguridad:", error);
        return false;
    }
};