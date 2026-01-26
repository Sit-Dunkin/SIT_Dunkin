import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'onboarding@resend.dev'; 

export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, param4, param5, param6) => {
    try {
        console.log(`📤 [Resend] Intentando enviar acta a: ${destinatario}`);
        let textoFinal = "Adjunto documento SIT.";
        if (param4 && typeof param4 === 'string') textoFinal = param4;

        const data = await resend.emails.send({
            from: `SIT Dunkin <${FROM_EMAIL}>`,
            to: [destinatario], 
            subject: asunto,
            html: `<p>${textoFinal}</p>`,
            text: textoFinal,
            attachments: [{ filename: 'Documento_SIT.pdf', content: pdfBuffer }]
        });

        if (data.error) {
            console.error("❌ Error Resend:", data.error);
            return false;
        }
        console.log(`✅ Acta enviada ID: ${data.data.id}`);
        return true;
    } catch (error) {
        console.error("❌ Error crítico Resend:", error);
        return false;
    }
};

export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    try {
        console.log(`🔒 [Resend] Enviando código a: ${destinatario}`);
        const data = await resend.emails.send({
            from: `Seguridad SIT <${FROM_EMAIL}>`,
            to: [destinatario], 
            subject: asunto,
            html: htmlBody
        });

        if (data.error) {
            console.error("❌ Error Resend:", data.error);
            return false;
        }
        console.log("✅ Código enviado ID: " + data.data.id);
        return true;
    } catch (error) {
        console.error("❌ Error crítico Resend:", error);
        return false;
    }
};