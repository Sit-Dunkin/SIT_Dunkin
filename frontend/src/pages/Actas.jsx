import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, Calendar, User, Eye, Download, ArrowRightLeft, Trash2, Wrench, Recycle, CheckCircle, X, MapPin, XCircle, PackagePlus } from 'lucide-react';
import Swal from 'sweetalert2';
import { formatearFecha } from '../utils/dateUtils';

const Actas = () => {
    const [actas, setActas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ tipo: 'TODOS', fechaInicio: '', fechaFin: '', usuario: '' });
    const [selectedActa, setSelectedActa] = useState(null);

    // --- 1. CARGAR LISTA ---
    const fetchActas = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams(filtros).toString();

            const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/equipos/historial-actas?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Error al cargar historial");

            const data = await res.json();
            setActas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setActas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchActas(); }, [filtros]);

    const handleInput = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
    const limpiarFiltros = () => setFiltros({ tipo: 'TODOS', fechaInicio: '', fechaFin: '', usuario: '' });

    // --- CONFIGURACIÓN DE COLORES E ICONOS ---
    const getTypeConfig = (tipoRecibido) => {
        const tipo = tipoRecibido ? tipoRecibido.toUpperCase() : '';

        switch (tipo) {
            case 'SALIDA':
                return { color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', icon: <ArrowRightLeft size={24} />, label: 'Acta de Salida' };
            case 'INGRESO':
                return { color: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', icon: <PackagePlus size={24} />, label: 'Ingreso a Stock' };
            case 'RETORNO':
                return { color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', icon: <CheckCircle size={24} />, label: 'Acta de Retorno' };
            case 'BAJA':
                return { color: 'bg-red-600', light: 'bg-red-50', text: 'text-red-600', icon: <Trash2 size={24} />, label: 'Acta de Baja' };
            case 'RESIDUOS':
                return { color: 'bg-slate-600', light: 'bg-slate-50', text: 'text-slate-600', icon: <Recycle size={24} />, label: 'Manifiesto RAEE' };
            case 'MANTENIMIENTO':
                return { color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', icon: <Wrench size={24} />, label: 'Orden Servicio' };
            default:
                return { color: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-600', icon: <FileText size={24} />, label: 'Documento' };
        }
    };

    // --- 2. DESCARGAR PDF (LÓGICA BLINDADA PARA NOMBRES MASIVOS) ---
    const handleDownload = async (id, referencia, tipoOriginal) => {
        try {
            Swal.fire({
                title: 'Procesando...', text: 'Obteniendo archivo...', allowOutsideClick: false, didOpen: () => Swal.showLoading()
            });

            const token = localStorage.getItem('token');
            const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/equipos/historial-actas/${id}/pdf`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "No se encontró el archivo físico.");
            }

            const blob = await res.blob();
            if (blob.type === 'application/json') throw new Error("El archivo no existe.");

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // 🔥 LÓGICA DE NOMBRE DE ARCHIVO CORREGIDA 🔥
            // 1. Limpieza básica (mayúsculas y quitar caracteres raros)
            let cleanRef = referencia ? referencia.toUpperCase().replace(/[^a-zA-Z0-9-_]/g, '_') : 'Documento';

            // 2. Quitar prefijos repetidos (ej: Acta_Acta_...)
            cleanRef = cleanRef.replace(/^ACTA_|^Acta_/i, '');

            // 3. DETECCIÓN DE MASIVA: Si es masiva, usamos el TIPO para el nombre
            if (cleanRef.includes('MASIVA')) {
                if (cleanRef.includes('INGRESO') || tipoOriginal === 'INGRESO') {
                    cleanRef = 'Masiva_Ingreso';
                } else if (cleanRef.includes('SALIDA') || tipoOriginal === 'SALIDA') {
                    cleanRef = 'Masiva_Salida';
                }
            }
            // ----------------------------------------------------

            link.download = `Acta_${cleanRef}_${id.toString().padStart(4, '0')}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            Swal.fire({ icon: 'success', title: 'Descarga Completada', timer: 2000, showConfirmButton: false });

        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <div><h1 className="text-2xl font-bold text-slate-800">Historial de Documentos</h1><p className="text-slate-500 text-sm">Repositorio digital de actas.</p></div>
            </div>

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Acta</label>
                    <select name="tipo" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={filtros.tipo} onChange={handleInput}>
                        <option value="TODOS">Todas</option>
                        <option value="SALIDA">Salidas</option>
                        <option value="INGRESO">Ingresos Stock</option>
                        <option value="RETORNO">Retornos</option>
                        <option value="MANTENIMIENTO">Reparaciones</option>
                        <option value="BAJA">Bajas</option>
                    </select>
                </div>
                <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-400 uppercase">Usuario</label><input type="text" name="usuario" placeholder="Ej: Yeison" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={filtros.usuario} onChange={handleInput} /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Desde</label><input type="date" name="fechaInicio" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={filtros.fechaInicio} onChange={handleInput} /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Hasta</label><input type="date" name="fechaFin" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={filtros.fechaFin} onChange={handleInput} /></div>
                <div className="md:col-span-2"><button onClick={limpiarFiltros} className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium"><XCircle size={18} /> Limpiar</button></div>
            </div>

            {/* GRID DE ACTAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? <div className="col-span-full text-center py-10 text-slate-500">Cargando...</div> :
                    actas.length === 0 ? <div className="col-span-full text-center py-10 text-slate-400">No hay actas registradas.</div> :
                        actas.map(acta => {

                            // 1. Determinar el Tipo Visual
                            let tipoVisual = acta.tipo_acta || acta.tipo;
                            const ref = (acta.referencia || '').toUpperCase();

                            // Corrección visual si la BD tiene datos antiguos
                            if (!tipoVisual || tipoVisual === 'DOCUMENTO' || tipoVisual === 'SALIDA') {
                                if (ref.includes('INGRESO') || ref.includes('ENTRADA') || ref.includes('STOCK')) tipoVisual = 'INGRESO';
                                if (ref.includes('RETORNO') || ref.includes('DEVOLUCION')) tipoVisual = 'RETORNO';
                                if (ref.includes('BAJA') || ref.includes('RECICLAJE')) tipoVisual = 'BAJA';
                                if (ref.includes('MANTENIMIENTO') || ref.includes('REPARACION')) tipoVisual = 'MANTENIMIENTO';
                            }

                            const config = getTypeConfig(tipoVisual);

                            return (
                                <div key={acta.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                                    <div className={`${config.color} p-4 flex items-center justify-between text-white`}>
                                        <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg">{config.icon}</div><div><h3 className="font-bold text-sm">{config.label}</h3><p className="text-[10px] opacity-80">#{acta.id.toString().padStart(4, '0')}</p></div></div>
                                    </div>
                                    <div className="p-5 flex-1 space-y-4">
                                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Referencia</p><p className="text-sm font-semibold text-slate-700 truncate" title={acta.referencia}>{acta.referencia || 'Sin referencia'}</p></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha</p>
                                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                <Calendar size={14} />
                                                <span>{formatearFecha(acta.fecha).fecha}</span>
                                                <span className="text-slate-300">|</span>
                                                <span>{formatearFecha(acta.fecha).hora}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resumen</p><p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-line">{acta.detalles}</p></div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 flex gap-2">
                                        <button onClick={() => setSelectedActa({ ...acta, tipoVisual })} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg"><Eye size={16} /> Ver Detalles</button>

                                        {/* 🔥 IMPORTANTE: PASAMOS 'tipoVisual' A LA FUNCIÓN DE DESCARGA 🔥 */}
                                        <button onClick={() => handleDownload(acta.id, acta.referencia, tipoVisual)} className={`p-2 rounded-lg text-white ${config.color} hover:opacity-90`} title="Descargar PDF">
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
            </div>

            {/* MODAL DETALLE */}
            {selectedActa && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        {(() => {
                            let tipoModal = selectedActa.tipoVisual || selectedActa.tipo_acta || selectedActa.tipo;
                            const refModal = (selectedActa.referencia || '').toUpperCase();

                            if (!tipoModal || tipoModal === 'DOCUMENTO' || tipoModal === 'SALIDA') {
                                if (refModal.includes('INGRESO') || refModal.includes('ENTRADA') || refModal.includes('STOCK')) tipoModal = 'INGRESO';
                                if (refModal.includes('RETORNO') || refModal.includes('DEVOLUCION')) tipoModal = 'RETORNO';
                                if (refModal.includes('BAJA') || refModal.includes('RECICLAJE')) tipoModal = 'BAJA';
                                if (refModal.includes('MANTENIMIENTO') || refModal.includes('REPARACION')) tipoModal = 'MANTENIMIENTO';
                            }

                            const configModal = getTypeConfig(tipoModal);

                            return (
                                <>
                                    <div className={`p-6 pb-4 border-b ${configModal.light} flex justify-between items-start`}>
                                        <div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${configModal.text} bg-white border border-slate-100`}>
                                                {configModal.label}
                                            </span>
                                            <h2 className="text-lg font-bold text-slate-800 mt-2">Detalle del Documento</h2>
                                        </div>
                                        <button onClick={() => setSelectedActa(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="flex items-start gap-4"><div className="p-2 bg-slate-100 rounded-full text-slate-500"><User size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">Generado Por</p><p className="text-sm font-medium text-slate-700">{selectedActa.usuario_responsable || 'Sistema'}</p></div></div>
                                        <div className="flex items-start gap-4"><div className="p-2 bg-slate-100 rounded-full text-slate-500"><MapPin size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">Referencia</p><p className="text-sm font-medium text-slate-700">{selectedActa.referencia || 'Sin referencia'}</p></div></div>
                                        <div className="pt-2"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Contenido del Acta</p>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line max-h-60 overflow-y-auto">
                                                {selectedActa.detalles}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        <div className="p-4 bg-slate-50 border-t text-center"><button onClick={() => setSelectedActa(null)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cerrar</button></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Actas;