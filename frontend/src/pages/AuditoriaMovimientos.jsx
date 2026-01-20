import React from 'react';
import { Wrench } from 'lucide-react';

const AuditoriaMovimientos = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
            <Wrench size={64} className="mb-4 text-orange-300" />
            <h1 className="text-2xl font-bold text-slate-700">En Construcción</h1>
            <p className="mt-2">Esta vista (Auditoría de Movimientos) estará disponible próximamente.</p>
        </div>
    );
};

// 👇 ESTA ES LA LÍNEA QUE TE FALTA Y CAUSA LA PANTALLA BLANCA
export default AuditoriaMovimientos;