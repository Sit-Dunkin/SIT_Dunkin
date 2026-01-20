import multer from 'multer';

// Usamos memoryStorage (RAM)
const storage = multer.memoryStorage();

const uploadPdf = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('❌ Error: Solo se permiten archivos PDF'), false);
        }
    }
});

export default uploadPdf;