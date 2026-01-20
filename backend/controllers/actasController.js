import pool from '../config/db.js';
import supabase from '../config/supabase.js';

export const subirActa = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se ha subido ningún archivo PDF" });
        }

        // 1. Generar nombre único: acta-123456789.pdf
        const fileName = `acta-${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`;

        // 2. Subir a Supabase Storage (Bucket 'actas')
        const { data, error } = await supabase
            .storage
            .from('actas') // Nombre exacto del bucket
            .upload(fileName, req.file.buffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (error) {
            console.error("❌ Error Supabase:", error);
            return res.status(500).json({ message: "Error al subir a la nube" });
        }

        // 3. Obtener la URL Pública
        const { data: publicData } = supabase
            .storage
            .from('actas')
            .getPublicUrl(fileName);

        const pdfUrl = publicData.publicUrl;
        console.log("📄 PDF subido exitosamente:", pdfUrl);

        // 4. AQUÍ GUARDARÍAS EN LA BASE DE DATOS (Ejemplo Genérico)
        // Puedes descomentar esto cuando tengas tu tabla de actas lista
        /*
        const { titulo, descripcion } = req.body;
        await pool.query(
            'INSERT INTO historial_actas (url_pdf, titulo, fecha) VALUES ($1, $2, NOW())',
            [pdfUrl, titulo]
        );
        */

        res.json({ 
            message: "Acta subida correctamente", 
            url: pdfUrl 
        });

    } catch (error) {
        console.error("❌ Error en subirActa:", error);
        res.status(500).json({ message: "Error interno al procesar el acta" });
    }
};