import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// CONFIGURACIÓN BREVO (API HTTP)
// ==========================================
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = process.env.BREVO_API_KEY; // ¡Asegúrate de tener esta variable en Render!

// TUS CORREOS VERIFICADOS
const EMAIL_SEGURIDAD = 'seguridad.dunkinmed@gmail.com';
const EMAIL_ACTAS = 'sistemas.medellindunkin@gmail.com';

/**
 * Función maestra para enviar correos vía Brevo
 */
const sendEmailViaBrevo = async (toEmail, subject, htmlContent, textContent, pdfBuffer, senderEmail, senderName) => {
    try {
        const body = {
            sender: { name: senderName, email: senderEmail },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent
        };

        // Si hay PDF, lo adjuntamos
        if (pdfBuffer) {
            body.attachment = [{
                name: 'Documento_SIT.pdf',
                content: pdfBuffer.toString('base64')
            }];
        }

        const response = await fetch(BREVO_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Error Brevo:", JSON.stringify(errorData));
            return false;
        }

        console.log(`✅ Correo enviado a ${toEmail} desde ${senderEmail}`);
        return true;

    } catch (error) {
        console.error("❌ Error conectando con Brevo:", error);
        return false;
    }
};

// ==========================================
// FUNCIONES QUE USA TU SISTEMA
// ==========================================

// 1. Para enviar Actas (Usa el correo de SISTEMAS)
export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4) => {
    console.log(`📤 Enviando acta a: ${destinatario}`);
    let texto = "Adjunto documento SIT.";
    if (param4 && typeof param4 === 'string') texto = param4;
    
    return await sendEmailViaBrevo(
        destinatario, 
        asunto, 
        `<p>${texto}</p>`, 
        texto, 
        pdfBuffer,
        EMAIL_ACTAS,          // <--- sistemas.medellindunkin@gmail.com
        'Sistemas Dunkin'
    );
};

// 2. Para códigos de seguridad (Usa el correo de SEGURIDAD)
export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    console.log(`🔒 Enviando código a: ${destinatario}`);
    const texto = htmlBody.replace(/<[^>]*>?/gm, ''); 
    
    return await sendEmailViaBrevo(
        destinatario, 
        asunto, 
        htmlBody, 
        texto, 
        null,
        EMAIL_SEGURIDAD,      // <--- seguridad.dunkinmed@gmail.com
        'Seguridad Sit Dunkin'
    );
};