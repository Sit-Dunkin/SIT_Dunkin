import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// CONFIGURACIÓN BREVO (API HTTP)
// ==========================================
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = process.env.BREVO_API_KEY; 

// TUS CORREOS VERIFICADOS
const EMAIL_SEGURIDAD = 'seguridaddunkin@gmail.com';
const EMAIL_ACTAS = 'sistemas.medellindunkin@gmail.com';

// ==========================================
// 🎨 DICCIONARIO DE DISEÑOS (COLORES Y TÍTULOS)
// ==========================================
const CONFIG_ACTAS = {
    'SALIDA': { 
        titulo: 'Acta de Salida de Equipos', 
        color: '#2563EB', // Azul Salida
        texto: 'Se ha registrado una salida de equipos desde el almacén de Sistemas.' 
    },
    'RETORNO': { 
        titulo: 'Confirmación de Retorno', 
        color: '#9333EA', // Moradito 
        texto: 'Se ha registrado el retorno de equipos al área de Sistemas.' 
    },
    'REPARACION': { 
        titulo: 'Envío a Mantenimiento', 
        color: '#F59E0B', // Amarillo Tecnico
        texto: 'Se han enviado equipos a revisión técnica o garantía externa.' 
    },
    'BAJA': { 
        titulo: 'Acta de Baja de Activos', 
        color: '#DC2626', // Rojo Alerta
        texto: 'Se ha procesado la baja definitiva de equipos del inventario.' 
    },
    'RESIDUOS': { 
        titulo: 'Disposición de Residuos RAEE', 
        color: '#16A34A', // Verde Ecología
        texto: 'Se ha realizado la entrega de residuos tecnológicos para disposición final.' 
    },
    'DEFAULT': { 
        titulo: 'Notificación SIT', 
        color: '#666666', // Gris
        texto: 'Se ha generado un nuevo documento en el sistema SIT.' 
    }
};

/**
 * Función maestra privada para enviar correos vía Brevo
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
// FUNCIONES PÚBLICAS
// ==========================================

/**
 * 1. ENVIAR CORREO DE ACTAS (DISEÑO PROFESIONAL)
 * Recibe el "tipoActa" para decidir el color y el título.
 */
export const enviarCorreoActa = async (destinatario, pdfBuffer, asunto, nombreOrigen, nombrePersona, numeroActa, tipoActa = 'DEFAULT') => {
    
    // 1. Elegir configuración (Color y Texto)
    const tipoKey = (tipoActa || 'DEFAULT').toUpperCase();
    const config = CONFIG_ACTAS[tipoKey] || CONFIG_ACTAS['DEFAULT'];
    
    console.log(`📤 Enviando acta tipo [${tipoKey}] a: ${destinatario}`);

    // 2. Validar datos
    const pv = nombreOrigen || "Ubicación SIT";
    const responsable = nombrePersona || "Personal Autorizado";
    const num = numeroActa || "S/N";

    // 3. PLANTILLA HTML CON EL DISEÑO DUNKIN
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: ${config.color}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; text-transform: uppercase;">${config.titulo}</h1>
        </div>

        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">Cordial saludo,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #444;">
                ${config.texto}
                A continuación, los datos de la operación:
            </p>

            <div style="background-color: #f8f9fa; padding: 15px; border-left: 5px solid ${config.color}; margin: 25px 0;">
                <p style="margin: 8px 0;"><strong>📍 Ubicación/Empresa:</strong> ${pv}</p>
                <p style="margin: 8px 0;"><strong>👤 Responsable:</strong> ${responsable}</p>
                <p style="margin: 8px 0;"><strong>📄 Acta N°:</strong> <strong>${num}</strong></p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                📎 <strong>Nota:</strong> El detalle completo se encuentra en el <strong>PDF adjunto</strong>.
            </p>
        </div>

            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
            <p style="margin: 0;">Departamento de Tecnología e Información</p>
            <p style="margin: 5px 0; font-weight: bold; color: #F5821F;">SISTEMAS DONUTS DE ANTIOQUIA S.A.S</p>
        </div>
    </div>
    `;

    // 4. TEXTO PLANO (Respaldo)
    const textoPlano = `${config.titulo}\n\n${config.texto}\n\nUbicación: ${pv}\nResponsable: ${responsable}\nActa #: ${num}`;

    // 5. ENVIAR (Usando correo de SISTEMAS)
    return await sendEmailViaBrevo(
        destinatario, 
        asunto || `${config.titulo} #${num}`, 
        htmlBody, 
        textoPlano, 
        pdfBuffer,
        EMAIL_ACTAS,          
        'SIT Dunkin'
    );
};

/**
 * 2. ENVIAR CÓDIGO DE SEGURIDAD (Login/Recuperar)
 */
export const enviarCorreoSeguridad = async (destinatario, asunto, htmlBody) => {
    console.log(`🔒 Enviando código a: ${destinatario}`);
    const texto = htmlBody.replace(/<[^>]*>?/gm, ''); 
    
    // ENVIAR (Usando correo de SEGURIDAD)
    return await sendEmailViaBrevo(
        destinatario, 
        asunto, 
        htmlBody, 
        texto, 
        null,
        EMAIL_SEGURIDAD,      
        'Seguridad SIT Dunkin'
    );
};