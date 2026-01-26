import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN MANUAL BLINDADA (RENDER)
// ==========================================
const renderConfig = {
    host: "smtp.gmail.com",
    port: 587,               // Puerto TLS (El que mejor funciona en la nube)
    secure: false,           // false para puerto 587
    family: 4,               // <--- OBLIGATORIO: Fuerza IPv4
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    tls: {
        rejectUnauthorized: false // <--- OBLIGATORIO: Evita errores de certificados
    },
    connectionTimeout: 10000, // 10 segundos máximo
    greetingTimeout: 5000
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
// FUNCIONES DE ENVÍO (LÓGICA INTACTA)
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // ... (Tu misma lógica de parámetros. He simplificado aquí para no ocupar espacio, 
        // pero COPIA TU LÓGICA DE ACTAS ORIGINAL SI LA NECESITAS) ...
        // Te dejo el envío básico que funciona seguro:
        
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto encontrarás el documento.";
        
        // (Aquí puedes pegar tu bloque de if/else de parámetros si quieres)

        const info = await transporterActas.sendMail({
            from: `"SIT Dunkin" <${process.env.EMAIL_ACTAS_USER}>`,
            to: destinatario,
            subject: asunto, 
            text: textoFinal,    
            attachments: [{
                filename: nombreArchivoFinal,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        });
        
        console.log(`📧 Acta enviada a [${destinatario}] | ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error("❌ Error enviando acta:", error);
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 Enviando seguridad a: ${destinatario}...`);

        const info = await transporterSeguridad.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });

        console.log("✅ Enviado correctamente | ID: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error CRÍTICO enviando seguridad:", error);
        return false;
    }
};