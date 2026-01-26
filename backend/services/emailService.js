import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN NUCLEAR: CONEXIÓN POR IP DIRECTA
// ==========================================
// Usamos una IP oficial de Gmail para saltarnos el DNS de Render
const GMAIL_IP = '142.250.115.108'; // smtp.gmail.com

console.log(`📧 INICIANDO SERVICIO DE CORREO - CONECTANDO A IP: ${GMAIL_IP}`);

const renderConfig = {
    host: GMAIL_IP,          // <--- TRUCO: Conectamos a la IP, no al nombre
    port: 465,               // Puerto SSL
    secure: true,            // SSL Activado
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    tls: {
        // IMPORTANTE: Como usamos IP, debemos decirle que el certificado
        // válido es el de 'smtp.gmail.com', si no, dará error de seguridad.
        servername: 'smtp.gmail.com', 
        rejectUnauthorized: false
    },
    // Tiempos de espera estrictos
    connectionTimeout: 10000, 
    socketTimeout: 10000
};

// Crear transportadores
const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_ACTAS_USER, pass: process.env.EMAIL_ACTAS_PASS }
});

const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_SEGURIDAD_USER, pass: process.env.EMAIL_SEGURIDAD_PASS }
});

// Verificación inmediata al cargar el archivo
transporterSeguridad.verify((error, success) => {
    if (error) {
        console.error("❌ ERROR AL CONECTAR A LA IP DE GMAIL:", error);
    } else {
        console.log("✅ CONEXIÓN EXITOSA POR IP DIRECTA 🚀");
    }
});

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // Lógica de parámetros simplificada para asegurar funcionamiento
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
        console.log(`🔒 Enviando seguridad a: ${destinatario} (Vía IP)...`);
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