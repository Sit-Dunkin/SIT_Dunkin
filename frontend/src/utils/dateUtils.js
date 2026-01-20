/**
 * Convierte una fecha UTC a hora local de Colombia (UTC-5)
 * Formato de salida: { fecha: 'dd/mm/aaaa', hora: 'hh:mm a.m.' }
 */
export const formatearFecha = (fecha) => {
    // 1. Validación inicial
    if (!fecha) return { fecha: '---', hora: '--:--' };

    // 2. Convertir a Date object
    let fechaStr = String(fecha).trim();

    // Normalizar formato: Reemplazar espacio por 'T' si existe
    if (fechaStr.includes(' ') && !fechaStr.includes('T')) {
        fechaStr = fechaStr.replace(' ', 'T');
    }

    // Asegurar que tiene indicador UTC
    if (!fechaStr.endsWith('Z') && !fechaStr.includes('+') && !fechaStr.includes('-', 10)) {
        fechaStr += 'Z';
    }

    // Crear objeto Date (interpreta como UTC si tiene Z)
    const dateUTC = new Date(fechaStr);

    // Validar que sea una fecha válida
    if (isNaN(dateUTC.getTime())) {
        console.error('Fecha inválida recibida:', fecha);
        return { fecha: 'Error', hora: 'Error' };
    }

    // 3. CONVERSIÓN MANUAL A COLOMBIA (UTC-5)
    // Restar 5 horas (5 * 60 * 60 * 1000 milisegundos)
    const COLOMBIA_OFFSET = 5 * 60 * 60 * 1000;
    const dateColombia = new Date(dateUTC.getTime() - COLOMBIA_OFFSET);

    // 4. FORMATEAR FECHA (dd/mm/aaaa)
    // Usamos métodos locales porque ya ajustamos el timestamp
    const dia = String(dateColombia.getDate()).padStart(2, '0');
    const mes = String(dateColombia.getMonth() + 1).padStart(2, '0');
    const año = dateColombia.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${año}`;

    // 5. FORMATEAR HORA (hh:mm a.m./p.m.)
    // Usamos métodos locales porque ya ajustamos el timestamp
    let horas = dateColombia.getHours();
    const minutos = String(dateColombia.getMinutes()).padStart(2, '0');

    // Determinar AM o PM
    const periodo = horas >= 12 ? 'p. m.' : 'a. m.';

    // Convertir a formato 12 horas
    if (horas === 0) {
        horas = 12;
    } else if (horas > 12) {
        horas = horas - 12;
    }

    const horaFormateada = `${String(horas).padStart(2, '0')}:${minutos} ${periodo}`;

    return {
        fecha: fechaFormateada,
        hora: horaFormateada
    };
};