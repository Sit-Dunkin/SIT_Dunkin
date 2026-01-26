import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos Resend con la clave que ya guardaste en Render
const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ IMPORTANTE: En modo prueba (gratis), Resend te obliga a usar este remitente.
// No lo cambies por ahora.
const FROM_EMAIL = 'onboarding@resend.dev'; 

// ==========================================
// FUNCIONES DE ENVÍO (ADAPTADAS A RESEND)
// ==========================================

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        console.log(`📤 [Resend] Intentando enviar acta a: ${destinatario}`);

        // Lógica para detectar el mensaje de texto (mantenemos compatibilidad con tu código viejo)
        let textoFinal = "Adjunto encontrarás el acta generada por el sistema SIT.";
        if (param4 && typeof param4 === 'string' && !param4.endsWith('.pdf')) {
            textoFinal = param4;
        }

        // OJO: En modo prueba, 'destinatario' DEBE ser tu mismo correo (el registrado en Resend)
        const data = await resend.emails.send({
            from: `SIT Dunkin <${FROM_EMAIL}>`,
            to: [destinatario], 
            subject: asunto,
            html: `<p>${textoFinal}</p>`, // Resend pide HTML
            text: textoFinal,
            attachments: [
                {
                    filename: 'Documento_SIT.pdf',
                    content: pdfBuffer
                }
            ]
        });

        if (data.error) {
            console.error("❌ Error Resend:", data.error);
            return false;
        }

        console.log(`✅ Acta enviada con éxito. ID: ${data.data.id}`);
        return true;
        
    } catch (error) {
        console.error("❌ Error crítico enviando acta:", error);
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 [Resend] Enviando código a: ${destinatario}`);

        const data = await resend.emails.send({
            from: `Seguridad SIT <${FROM_EMAIL}>`,
            to: [destinatario], // Recuerda: Solo llegará si es TU correo por ahora
            subject: asunto,
            html: htmlBody
        });

        if (data.error) {
            console.error("❌ Error Resend:", data.error);
            return false;
        }

        console.log("✅ Código de seguridad enviado. ID: " + data.data.id);
        return true;
    } catch (error) {
        console.error("❌ Error crítico enviando seguridad:", error);
        return false;
    }
};