import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN AUTOMÁTICA (CON PROTECCIÓN IPv4)
// ==========================================
// Al usar 'service: gmail', Nodemailer elige automáticamente el mejor puerto.
// Como ya tienes el index.js forzando IPv4, esto debería funcionar fluido.
const renderConfig = {
    service: 'gmail',        
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    tls: {
        rejectUnauthorized: false // Evita bloqueos tontos de certificados
    }
};

const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_ACTAS_USER, pass: process.env.EMAIL_ACTAS_PASS }
});

const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_SEGURIDAD_USER, pass: process.env.EMAIL_SEGURIDAD_PASS }
});

// Verificación de conexión al iniciar
transporterSeguridad.verify((error, success) => {
    if (error) {
        console.error("❌ ERROR AL CONECTAR CON GMAIL (INTENTO AUTOMÁTICO):", error);
    } else {
        console.log("✅ CONEXIÓN EXITOSA: Gmail aceptó la conexión.");
    }
});

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto documento SIT.";
        let htmlFinal = "<p>Adjunto documento SIT.</p>";

        // Tu lógica de parámetros original simplificada
        if (param6 && typeof param6 === 'string' && param6.endsWith('.pdf')) {
            nombreArchivoFinal = param6;
            textoFinal = param4 || textoFinal;
            htmlFinal = param5 || htmlFinal;
        } else if (param4 && typeof param4 === 'string' && param4.endsWith('.pdf')) {
            nombreArchivoFinal = param4;
            htmlFinal = param5 || htmlFinal;
            textoFinal = `Hola, archivo: ${nombreArchivoFinal}`;
        } else if (typeof param5 === 'object') {
             const { origen = '', recibe = '', equipo = '' } = param5;
             textoFinal = `Equipo: ${equipo}, Origen: ${origen}, Recibe: ${recibe}`;
             htmlFinal = `<p>${textoFinal}</p>`;
        }

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
        console.log(`🔒 Intentando enviar a: ${destinatario}...`);
        const info = await transporterSeguridad.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });
        console.log("✅ Correo de seguridad enviado: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error enviando seguridad:", error);
        return false;
    }
};