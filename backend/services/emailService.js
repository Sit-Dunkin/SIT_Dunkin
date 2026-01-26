import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN BLINDADA v3 (CON LOGS DE DEBUG)
// ==========================================
console.log("📧 CARGANDO CONFIGURACIÓN DE CORREO: PUERTO 587 (GOOGLEMAIL)");

const renderConfig = {
    host: "smtp.googlemail.com", // TRUCO: A veces este dominio evita bloqueos
    port: 587,               
    secure: false,           
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 5000
};

const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_ACTAS_USER, pass: process.env.EMAIL_ACTAS_PASS }
});

const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: { user: process.env.EMAIL_SEGURIDAD_USER, pass: process.env.EMAIL_SEGURIDAD_PASS }
});

// PRUEBA DE CONEXIÓN AL INICIAR
transporterSeguridad.verify((error, success) => {
    if (error) {
        console.error("❌ ERROR CRÍTICO CONECTANDO AL CORREO:", error);
    } else {
        console.log("✅ CONEXIÓN EXITOSA CON GMAIL (LISTO PARA ENVIAR)");
    }
});

// ==========================================
// FUNCIONES
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto documento SIT.";
        let htmlFinal = "<p>Adjunto documento SIT.</p>";

        // Logica simplificada de parámetros para asegurar envío
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
        console.log("✅ Enviado correctamente: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error enviando seguridad:", error);
        return false;
    }
};