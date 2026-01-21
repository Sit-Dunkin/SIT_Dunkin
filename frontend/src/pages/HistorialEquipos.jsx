import React, { useState, useEffect } from 'react';
import { Search, ArrowDown, User, Download, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { formatearFecha } from '../utils/dateUtils';

const HistorialEquipos = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const LIMIT = 10; 

  const initialFiltros = {
      fechaInicio: '',
      fechaFin: '',
      tipo: 'TODOS', 
      usuario: '',
      busqueda: ''
  };

  const [filtros, setFiltros] = useState(initialFiltros);

  const fetchHistorial = async () => {
      try {
          setLoading(true);
          const token = localStorage.getItem('token');
          
          const params = new URLSearchParams();
          if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
          if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
          if (filtros.tipo !== 'TODOS') params.append('tipo', filtros.tipo);
          if (filtros.usuario) params.append('usuario', filtros.usuario); 
          if (filtros.busqueda) params.append('busqueda', filtros.busqueda);

          params.append('page', paginaActual);
          params.append('limit', LIMIT);

          const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/equipos/logistico?${params.toString()}`, {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
          });
          
          if (!res.ok) {
            setMovimientos([]);
            return;
          }

          const responseData = await res.json();

          if (responseData.data && responseData.pagination) {
              setMovimientos(responseData.data);
              setTotalPaginas(responseData.pagination.totalPaginas);
          } else {
              setMovimientos(Array.isArray(responseData) ? responseData : []);
          }

      } catch (error) {
          console.error("Error cargando historial:", error);
          setMovimientos([]);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      const timer = setTimeout(() => fetchHistorial(), 500);
      return () => clearTimeout(timer);
  }, [filtros, paginaActual]);

  const handleInputChange = (e) => {
      setFiltros({ ...filtros, [e.target.name]: e.target.value });
      setPaginaActual(1);
  };

  const limpiarFiltros = () => {
      setFiltros(initialFiltros);
      setPaginaActual(1);
  };

  const cambiarPagina = (nuevaPagina) => {
      if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
          setPaginaActual(nuevaPagina);
      }
  };

  const registrarLogDescarga = async () => {
    try {
        const token = localStorage.getItem('token');
        await fetch('https://sit-dunkin-backend.onrender.com/api/auditoria', { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'Descarga Reporte Excel', detalle: 'Descarga desde Trazabilidad.', modulo: 'Trazabilidad' })
        });
    } catch (error) { console.error(error); }
  };

  const handleDownloadExcel = () => {
      if (movimientos.length === 0) {
          Swal.fire('Atención', 'No hay datos para descargar.', 'warning');
          return;
      }
      registrarLogDescarga();

      const datosParaExcel = movimientos.map(mov => {
          let activoVisual = 'S/P';
          if (mov.activo_placa && mov.activo_placa !== '---') {
              activoVisual = mov.activo_placa;
          } else if (mov.serial) {
              activoVisual = `(Serial) ${mov.serial}`;
          }

          return {
              "Fecha": new Date(mov.fecha).toLocaleDateString(),
              "Hora": new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              "Tipo Equipo": mov.tipo_equipo || 'Equipo',
              "Activo (Placa)": activoVisual,
              "Origen": mov.ubicacion_origen || 'Sistemas',
              "Destino": mov.ubicacion_destino || 'Sistemas',
              "Tipo Movimiento": mov.tipo_movimiento,
              "Usuario Responsable": mov.usuario_responsable || 'Sistema',
              "Detalle": mov.detalle || mov.motivo || 'Sin detalles'
          };
      });

      const ws = XLSX.utils.json_to_sheet(datosParaExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trazabilidad");
      XLSX.writeFile(wb, `Reporte_Movimientos_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      Toast.fire({ icon: 'success', title: 'Reporte descargado' });
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300 min-h-screen bg-gray-50">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-4 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">Historial de Movimientos</h1>
                <p className="text-slate-500 text-sm">Registro exclusivo de Salidas y Retornos.</p>
            </div>
            <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors active:scale-95">
                <Download size={16}/> Descargar Excel
            </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Buscar</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" name="busqueda" placeholder="Elemento, Activo, Usuario..." className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500" value={filtros.busqueda} onChange={handleInputChange} />
                </div>
            </div>
            <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo Movimiento</label>
                <select name="tipo" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer" value={filtros.tipo} onChange={handleInputChange}>
                    <option value="TODOS">Todos (Salidas y Retornos)</option>
                    <option value="SALIDA">Salidas / Asignaciones</option>
                    <option value="RETORNO">Retornos / Devoluciones</option>
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Desde</label>
                <input type="date" name="fechaInicio" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-600" value={filtros.fechaInicio} onChange={handleInputChange} />
            </div>
            <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hasta</label>
                <input type="date" name="fechaFin" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-600" value={filtros.fechaFin} onChange={handleInputChange} />
            </div>
            <div className="md:col-span-1">
                <button onClick={limpiarFiltros} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex justify-center" title="Limpiar"><RefreshCw size={18}/></button>
            </div>
        </div>

        {/* TABLA SIN SCROLL HORIZONTAL (DISEÑO VERTICAL) */}
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
            <div className="w-full"> {/* Quitamos overflow-x-auto para forzar ajuste */}
                <table className="w-full text-sm text-left table-fixed"> {/* table-fixed ayuda a respetar anchos */}
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-[15%]">Fecha</th>
                            <th className="p-4 w-[25%]">Equipo / Activo</th>
                            <th className="p-4 w-[20%] text-center">Trayectoria</th>
                            <th className="p-4 w-[20%]">Usuario</th>
                            <th className="p-4 w-[20%]">Detalle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500 animate-pulse">Cargando...</td></tr>
                        ) : movimientos.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                        ) : (
                            movimientos.map((mov) => {
                                const isSalida = mov.tipo_movimiento === 'SALIDA';
                                const destinoStyle = isSalida ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200';
                                const { fecha, hora } = formatearFecha(mov.fecha);

                                return (
                                    <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                        
                                        {/* FECHA */}
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-700">{fecha}</div>
                                            <div className="text-xs text-slate-500">{hora}</div>
                                        </td>
                                        
                                        {/* EQUIPO */}
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-800 text-sm break-words">
                                                {mov.tipo_equipo || 'Equipo'}
                                            </div>
                                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                Activo: {mov.activo_placa && mov.activo_placa !== '---' ? mov.activo_placa : 'S/P'}
                                            </div>
                                        </td>

                                        {/* TRAYECTORIA VERTICAL (Ahorra espacio horizontal) */}
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {/* Origen */}
                                                <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 w-full text-center truncate" title={mov.ubicacion_origen}>
                                                    {mov.ubicacion_origen || 'Sistemas'}
                                                </div>
                                                
                                                {/* Flecha Abajo */}
                                                <ArrowDown size={14} className={isSalida ? "text-orange-500" : "text-green-500"} />
                                                
                                                {/* Destino */}
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold w-full text-center truncate ${destinoStyle}`} title={mov.ubicacion_destino}>
                                                    {mov.ubicacion_destino || 'Sistemas'}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* USUARIO */}
                                        <td className="p-4 align-top">
                                            <div className="flex items-start gap-2 text-slate-600">
                                                <div className="p-1 bg-slate-100 rounded-full mt-0.5 shrink-0"><User size={12}/></div>
                                                <span className="text-xs font-medium break-words leading-tight">{mov.usuario_responsable || 'Sistema'}</span>
                                            </div>
                                        </td>
                                        
                                        {/* DETALLE */}
                                        <td className="p-4 align-top">
                                            <p className="text-slate-500 text-xs italic break-words leading-tight">
                                                {mov.detalle || mov.motivo || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {!loading && movimientos.length > 0 && (
                <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${paginaActual === 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50'}`}>Anterior</button>
                    <span className="text-sm font-bold text-slate-700">Página {paginaActual} de {totalPaginas}</span>
                    <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${paginaActual === totalPaginas ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50'}`}>Siguiente</button>
                </div>
            )}
        </div>
        
        {!loading && movimientos.length > 0 && <div className="text-center text-xs text-slate-400">Mostrando página {paginaActual} de {totalPaginas}.</div>}
    </div>
  );
};

export default HistorialEquipos;