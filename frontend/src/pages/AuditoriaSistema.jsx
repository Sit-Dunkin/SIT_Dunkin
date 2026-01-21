import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, RefreshCw, FileText, Filter, X, Clock } from 'lucide-react';
import { formatearFecha } from '../utils/dateUtils';

const AuditoriaSistema = () => {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const LIMIT = 10; // Registros por página

  // --- ESTADO DE LOS FILTROS ---
  const initialFiltros = {
    busqueda: '',
    usuario: '',
    fechaInicio: '',
    fechaFin: ''
  };
  const [filtros, setFiltros] = useState(initialFiltros);

  // --- 1. CARGAR USUARIOS ---
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('https://sit-dunkin-backend.onrender.com/api/auditoria/usuarios-filtro', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsuarios(data);
        }
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      }
    };
    fetchUsuarios();
  }, []);

  // --- 2. CARGAR LOGS ---
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [filtros, paginaActual]); //  Se ejecuta si cambian filtros o la página

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Agregamos la página y el límite a la consulta
      const params = new URLSearchParams({
          ...filtros,
          page: paginaActual,
          limit: LIMIT
      });
      
      const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/auditoria/movimientos?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      
      const respuesta = await res.json();
      
      // Verificamos si la respuesta tiene formato de paginación
      if (respuesta.data && respuesta.pagination) {
          setLogs(respuesta.data);
          setTotalPaginas(respuesta.pagination.totalPaginas);
      } else {
          // Soporte legacy por si el backend no se actualizó bien
          setLogs(Array.isArray(respuesta) ? respuesta : []);
      }

    } catch (err) {
      console.error("Error fetching logs:", err);
      setLogs([]); 
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES ---
  const handleInputChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
    setPaginaActual(1); // Si se filtra, volvemos a la página 1
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

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-orange-600" /> Log del Sistema
            </h1>
            <p className="text-slate-500 text-sm mt-1">Historial detallado de cambios y movimientos.</p>
        </div>
        <button 
            onClick={fetchLogs} 
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
            title="Recargar datos"
        >
            <RefreshCw size={18}/> Actualizar
        </button>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Buscador */}
            <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Buscar</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        name="busqueda"
                        placeholder="Acción, detalle, error..." 
                        value={filtros.busqueda} 
                        onChange={handleInputChange} 
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500/50 transition-all" 
                    />
                </div>
            </div>

            {/* Filtro Usuario */}
            <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Usuario</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        name="usuario"
                        value={filtros.usuario}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500/50 bg-white appearance-none cursor-pointer"
                    >
                        <option value="">Todos los usuarios</option>
                        {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre_completo}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Fechas */}
            <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Desde</label>
                <input 
                    type="date" 
                    name="fechaInicio"
                    value={filtros.fechaInicio}
                    onChange={handleInputChange}
                    className="w-full py-2.5 px-3 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500/50 text-slate-600"
                />
            </div>
            <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Hasta</label>
                <input 
                    type="date" 
                    name="fechaFin"
                    value={filtros.fechaFin}
                    onChange={handleInputChange}
                    className="w-full py-2.5 px-3 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500/50 text-slate-600"
                />
            </div>

            {/* Botón Limpiar */}
            <div className="md:col-span-1">
                <button 
                    onClick={limpiarFiltros}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex justify-center items-center transition-colors border border-slate-200 group"
                    title="Limpiar Filtros"
                >
                    <Filter size={18} className="group-hover:hidden"/>
                    <X size={18} className="hidden group-hover:block"/>
                </button>
            </div>
        </div>
      </div>

      {/* --- TABLA DE RESULTADOS --- */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                    <th className="p-4 w-1/4">FECHA Y HORA</th>
                    <th className="p-4 w-1/4">RESPONSABLE</th>
                    <th className="p-4 w-2/4">DETALLE DE LA ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                    <tr>
                        <td colSpan="3" className="p-10 text-center text-slate-500 animate-pulse">
                            Cargando historial...
                        </td>
                    </tr>
                ) : logs.length === 0 ? (
                    <tr>
                        <td colSpan="3" className="p-10 text-center text-slate-400">
                            No se encontraron registros con estos filtros.
                        </td>
                    </tr>
                ) : (
                    logs.map((log) => {
                      const { fecha, hora } = formatearFecha(log.fecha);
                      
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        
                          {/* FECHA */}
                          <td className="p-4 align-top">
                              <div className="flex flex-col">
                                  <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                      <Calendar size={14} className="text-slate-400"/> {fecha}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <Clock size={14} className="text-slate-400"/> {hora}
                                  </span>
                              </div>
                          </td>

                        {/* RESPONSABLE */}
                        <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
                                    <User size={14} />
                                </div>
                                <span className="font-bold text-slate-700">
                                    {log.usuarioNombre || log.responsable || log.nombre_completo || 'Sistema'}
                                </span>
                            </div>
                        </td>

                        {/* DETALLE */}
                        <td className="p-4 align-top">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {log.detalle || log.accion || 'Sin detalles registrados.'}
                            </p>
                        </td>

                      </tr>
                      );
                    })
                )}
              </tbody>
            </table>
        </div>

        {/* --- BARRA DE PAGINACIÓN (NUEVA) --- */}
        {!loading && logs.length > 0 && (
            <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
                
                {/* Botón Anterior */}
                <button 
                    onClick={() => cambiarPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm
                        ${paginaActual === 1 
                            ? 'text-slate-300 bg-slate-100 border-slate-100 cursor-not-allowed' 
                            : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-800'}
                    `}
                >
                    Anterior
                </button>

                {/* Texto Indicador */}
                <span className="text-sm font-bold text-slate-700">
                    Página {paginaActual} de {totalPaginas}
                </span>

                {/* Botón Siguiente */}
                <button 
                    onClick={() => cambiarPagina(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm
                        ${paginaActual === totalPaginas 
                            ? 'text-slate-300 bg-slate-100 border-slate-100 cursor-not-allowed' 
                            : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-800'}
                    `}
                >
                    Siguiente
                </button>

            </div>
        )}

      </div>
    </div>
  );
};

export default AuditoriaSistema;