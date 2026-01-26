import dns from 'dns'; // <--- 1. IMPORTAMOS DNS AQUÍ
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// ==========================================
// 🛡️ PARCHE CRÍTICO DE RED (EN EL LUGAR CORRECTO)
// ==========================================
// Al ponerlo aquí, aseguramos que se ejecute ANTES de crear el transporte
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
    console.log("🛡️ DNS BLINDADO EN EMAIL SERVICE: Forzando IPv4");
}

dotenv.config();

// ==========================================
// CONFIGURACIÓN FINAL: PUERTO 465 (SSL)
// ==========================================
console.log("📧 INICIANDO SERVICIO DE CORREO: PUERTO 465 (SSL DIRECTO)");

const renderConfig = {
    host: "smtp.gmail.com",
    port: 465,               // Puerto SSL (El más seguro y directo)
    secure: true,            // true para 465
    auth: {
        user: process.env.EMAIL_ACTAS_USER,
        pass: process.env.EMAIL_ACTAS_PASS
    },
    // Opciones extra para evitar bloqueos
    tls: {
        rejectUnauthorized: false
    },
    // Tiempos de espera
    connectionTimeout: 20000, 
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

// --- VERIFICACIÓN DE CONEXIÓN ---
transporterSeguridad.verify((error, success) => {
    if (error) {
        console.error("❌ ERROR DE CONEXIÓN (465):", error);
    } else {
        console.log("✅ CONEXIÓN EXITOSA CON GMAIL (465) - IPV4 ACTIVO 🚀");
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
        console.log(`🔒 Enviando seguridad a: ${destinatario}...`);
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