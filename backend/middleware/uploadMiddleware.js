import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configuración DIRECTA (Para descartar error de .env)
cloudinary.config({
    cloud_name: 'dyyemhvqx',
    api_key: '361725932265532',
    api_secret: 'rLBTSYBSrYQDDRiN-jo1-LL7OoI'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'sit_perfiles', // Cloudinary creará esta carpeta automáticamente
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

export default upload;