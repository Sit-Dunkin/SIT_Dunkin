import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN BLINDADA PARA RENDER (CLOUD)
// ==========================================
// NO usar "service: gmail". Usamos configuración manual:
const renderConfig = {
    host: "smtp.gmail.com",
    port: 587,               // Puerto estándar para nubes (TLS)
    secure: false,           // false es OBLIGATORIO para puerto 587
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    tls: {
        rejectUnauthorized: false // <--- ESTO EVITA EL BLOQUEO
    },
    connectionTimeout: 10000, // 10 segundos máximo
    greetingTimeout: 5000
};

// Crear los transportadores con la configuración manual
const transporterActas = nodemailer.createTransport({
    ...renderConfig,
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    }
});

const transporterSeguridad = nodemailer.createTransport({
    ...renderConfig,
    auth: {
        user: process.env.EMAIL_SEGURIDAD_USER,
        pass: process.env.EMAIL_SEGURIDAD_PASS
    }
});

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        let nombreArchivoFinal = `Documento_SIT_${Date.now()}.pdf`;
        let textoFinal = "Adjunto encontrarás el acta generada por el sistema SIT.";
        let htmlFinal = "<p>Adjunto encontrarás el documento en PDF.</p>";

        // Tu lógica de parámetros original se mantiene aquí:
        if (param6 && typeof param6 === 'string' && param6.endsWith('.pdf')) {
            nombreArchivoFinal = param6;
            textoFinal = param4 || textoFinal;
            htmlFinal = param5 || htmlFinal;
        } else if (param4 && typeof param4 === 'string' && param4.endsWith('.pdf')) {
            nombreArchivoFinal = param4;
            htmlFinal = param5 || htmlFinal;
            textoFinal = `Hola, adjunto encontrarás el archivo: ${nombreArchivoFinal}`;
        } else if (typeof param5 === 'object' && param5 !== null) {
            const { origen = 'Proveedor', recibe = 'Sistemas', equipo = 'Equipo', serial = 'S/N' } = param5;
            if (param4 && typeof param4 === 'string' && param4.endsWith('.pdf')) { nombreArchivoFinal = param4; }
            textoFinal = `Ingreso de equipo: ${equipo}. Origen: ${origen}. Recibe: ${recibe}.`;
            htmlFinal = `<div><h2>Nuevo Ingreso SIT</h2><p>${textoFinal}</p></div>`; // Simplificado para el ejemplo
        } else {
            if (param4) textoFinal = param4;
            if (param5) htmlFinal = param5;
        }

        const info = await transporterActas.sendMail({
            from: `"SIT Dunkin" <${process.env.EMAIL_ACTAS_USER}>`,
            to: destinatario,
            subject: asunto, 
            text: textoFinal,    
            html: htmlFinal, 
            attachments: [{
                filename: nombreArchivoFinal,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        });
        
        console.log(`✅ Acta enviada a ${destinatario} | ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error("❌ Error enviando acta:", error);
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 Intentando enviar código a: ${destinatario}...`);

        const info = await transporterSeguridad.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });

        console.log("✅ Correo seguridad enviado EXITOSO | ID: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error CRÍTICO enviando seguridad:", error);
        return false;
    }
};