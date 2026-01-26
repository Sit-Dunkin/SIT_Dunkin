import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// ==========================================
// CONFIGURACIÓN "LAZY" (PEREZOSA)
// ==========================================
// No creamos el transporter todavía. Lo guardamos aquí.
let transporter = null;

const getTransporter = () => {
    // Si ya existe, lo devolvemos (para no reconectar mil veces)
    if (transporter) return transporter;

    console.log("🛠️ CREANDO TRANSPORTE DE CORREO (Ahora sí con IPv4)...");

    // PARCHE DE SEGURIDAD FINAL: Aseguramos IPv4 justo antes de crear
    if (dns.setDefaultResultOrder) {
        try {
            dns.setDefaultResultOrder('ipv4first');
        } catch (e) { /* Ignorar si ya estaba puesto */ }
    }

    // Configuración Blindada (Puerto 465 SSL)
    transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // SSL Directo
        auth: {
            user: process.env.EMAIL_ACTAS_USER, // Usamos este como principal
            pass: process.env.EMAIL_ACTAS_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        // Tiempos cortos para no colgar el servidor si falla
        connectionTimeout: 10000, 
        socketTimeout: 10000
    });

    return transporter;
};

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // 1. Obtenemos el transporte justo ahora (no antes)
        const mailer = getTransporter();

        // 2. Preparamos los datos (Tu lógica original)
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto documento SIT.";
        let htmlFinal = "<p>Adjunto documento SIT.</p>";

        if (param6 && typeof param6 === 'string') { nombreArchivoFinal = param6; textoFinal = param4; htmlFinal = param5; }
        else if (param4 && typeof param4 === 'string') { nombreArchivoFinal = param4; htmlFinal = param5; }

        // 3. Enviamos
        const info = await mailer.sendMail({
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
        
        // 1. Obtenemos el transporte justo ahora (Asegurando que IPv4 ya cargó)
        // Nota: Usamos las mismas credenciales para simplificar la conexión en Render,
        // pero cambiamos el "from" visualmente.
        const mailer = getTransporter();

        // 2. Enviamos
        const info = await mailer.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`, // El usuario ve esto
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });

        console.log("✅ Enviado correctamente: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error enviando seguridad:", error);
        // Si falla, intentamos resetear el transporter para la próxima
        transporter = null; 
        return false;
    }
};