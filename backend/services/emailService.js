import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
import util from 'util';

dotenv.config();

// Promisify dns.lookup para usarlo con async/await
const lookup = util.promisify(dns.lookup);

// ==========================================
// CONFIGURACIÓN NUCLEAR (RESOLUCIÓN IP MANUAL)
// ==========================================
let transporter = null;

const getTransporter = async () => {
    // Si ya tenemos un transporter listo, lo reusamos
    if (transporter) return transporter;

    console.log("🛠️ RESOLVIENDO IP DE GMAIL MANUALMENTE...");

    try {
        // 1. Buscamos la IP exacta de Google (Forzando IPv4)
        // Esto evita que Render intente usar IPv6 o se confunda con el DNS
        const { address } = await lookup('smtp.gmail.com', { family: 4 });
        
        console.log(`🎯 IP DE GMAIL ENCONTRADA: ${address} (Usando esta para conectar)`);

        // 2. Configuramos el transporte usando la IP DIRECTAMENTE
        transporter = nodemailer.createTransport({
            host: address, // <--- ¡AQUÍ ESTÁ EL TRUCO! Usamos la IP, no el nombre
            port: 465,     // Puerto SSL
            secure: true,  // SSL Activado
            auth: {
                user: process.env.EMAIL_ACTAS_USER,
                pass: process.env.EMAIL_ACTAS_PASS
            },
            tls: {
                // Importante: Como nos conectamos a una IP, debemos decirle
                // que el certificado esperado es el de gmail.com
                servername: 'smtp.gmail.com',
                rejectUnauthorized: false
            },
            // Tiempos de espera
            connectionTimeout: 10000, 
            socketTimeout: 10000
        });

        console.log("✅ TRANSPORTE CREADO CON ÉXITO");
        return transporter;

    } catch (error) {
        console.error("❌ ERROR AL RESOLVER DNS O CREAR TRANSPORTE:", error);
        throw error;
    }
};

// ==========================================
// FUNCIONES DE ENVÍO
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        // Obtenemos el transporte (esperando la resolución de IP)
        const mailer = await getTransporter();

        // Lógica de parámetros (Tu código original)
        let nombreArchivoFinal = `Documento_SIT.pdf`;
        let textoFinal = "Adjunto documento SIT.";
        let htmlFinal = "<p>Adjunto documento SIT.</p>";

        if (param6 && typeof param6 === 'string') { nombreArchivoFinal = param6; textoFinal = param4; htmlFinal = param5; }
        else if (param4 && typeof param4 === 'string') { nombreArchivoFinal = param4; htmlFinal = param5; }

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
        transporter = null; // Resetear por si la IP cambió
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 Iniciando proceso de envío a: ${destinatario}...`);
        
        // 1. Obtenemos el transporte (Resolviendo IP si es necesario)
        const mailer = await getTransporter();

        // 2. Enviamos
        const info = await mailer.sendMail({
            from: `"Seguridad SIT" <${process.env.EMAIL_SEGURIDAD_USER}>`,
            to: destinatario,
            subject: asunto,
            html: htmlBody
        });

        console.log("✅ Enviado correctamente: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error enviando seguridad:", error);
        // Si falla, borramos el transporter para intentar resolver la IP de nuevo la próxima vez
        transporter = null; 
        return false;
    }
};