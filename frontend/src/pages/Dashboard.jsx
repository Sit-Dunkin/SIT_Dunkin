import React, { useEffect, useState } from 'react';
import { Users, Monitor, MapPin, Activity, Package, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- CONFIGURACIÓN DE COLORES ---
  const colors = {
    orange: {
      bg: 'bg-orange-600',       // Naranja del Sistema
      lightBg: 'bg-orange-50',
      text: 'text-orange-600'
    },
    corporate: {
      bg: 'bg-[#0F172A]',
      lightBg: 'bg-slate-100',
      text: 'text-[#0F172A]'
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getPrimerNombre = () => {
    return user?.nombre ? user.nombre.split(' ')[0] : 'Usuario';
  };

  if (loading) return (
    <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            ¡Bienvenido de nuevo, {getPrimerNombre()}! <span className="text-3xl">👋</span>
          </h1>
          <p className="text-slate-500 mt-1">Aquí tienes el resumen operativo de hoy.</p>
        </div>

        <div className="text-sm text-slate-500 font-medium bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* --- KPIS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
            <Users size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Usuarios Activos</p>
            <h3 className="text-4xl font-extrabold text-slate-800 mt-1">{data?.kpis.usuarios || 0}</h3>
          </div>
        </div>
        {/* KPI 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
            <Monitor size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">En Stock Disponibles</p>
            <h3 className="text-4xl font-extrabold text-slate-800 mt-1">{data?.kpis.stock_sistemas || 0}</h3>
          </div>
        </div>
        {/* KPI 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <MapPin size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">En Operación</p>
            <h3 className="text-4xl font-extrabold text-slate-800 mt-1">{data?.kpis.en_puntos || 0}</h3>
          </div>
        </div>
      </div>

      {/* --- TABLAS ALINEADAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

        {/* === TARJETA 1: Top 5 Equipos (NARANJA) === */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">

          {/* Título */}
          <div className="flex items-center gap-3 p-6 pb-4">
            <span className={`${colors.orange.lightBg} p-2 rounded-lg ${colors.orange.text}`}>
              <Package size={20} />
            </span>
            <h3 className="font-bold text-slate-700 text-lg">
              Top 5 Equipos (Disponibles)
            </h3>
          </div>

          {/* Barra Naranja de borde a borde */}
          <div className={`flex justify-between items-center px-6 py-3 ${colors.orange.bg} text-white shadow-sm`}>
            <span className="text-[11px] font-bold uppercase tracking-wider">Tipo de Equipo</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Cantidad</span>
          </div>

          {/* Lista */}
          <div className="p-6 pt-2 flex-1 flex flex-col justify-between min-h-[200px]">
            {data?.tablas.equipos_por_tipo.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 cursor-default group rounded-lg"
              >
                <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  {item.tipo_equipo}
                </span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md font-bold text-xs border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all">
                  {item.cantidad} un.
                </span>
              </div>
            ))}

            {(!data?.tablas.equipos_por_tipo?.length) && (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">
                No hay equipos en stock
              </div>
            )}
          </div>
        </div>

        {/* === TARJETA 2: Últimos Movimientos (AZUL #0F172A) === */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">

          {/* Título */}
          <div className="p-6 pb-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg">
              <span className={`${colors.corporate.lightBg} p-2 rounded-lg ${colors.corporate.text}`}>
                <Activity size={20} />
              </span>
              Últimos 5 Movimientos
            </h3>
          </div>

          {/* Tabla con encabezado Azul Oscuro */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              {/* Aplicando el color #0F172A aquí */}
              <thead className={`${colors.corporate.bg} text-white uppercase text-xs font-bold tracking-wide`}>
                <tr>
                  <th className="px-6 py-3 font-bold">Movimiento</th>
                  <th className="px-6 py-3 font-bold">Equipo</th>
                  <th className="px-6 py-3 font-bold text-right">Destino / Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.tablas.ultimos_movimientos.length === 0 ? (
                  <tr><td colSpan="3" className="p-8 text-center text-slate-400 italic">No hay movimientos recientes</td></tr>
                ) : (
                  data?.tablas.ultimos_movimientos.slice(0, 5).map((mov, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        {mov.tipo_movimiento === 'SALIDA' ? (
                          <div className="flex items-center gap-2 text-orange-600 font-bold bg-orange-50 px-3 py-1.5 rounded-lg w-fit border border-orange-100">
                            <ArrowUpRight size={16} /> SALIDA
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100">
                            <ArrowDownLeft size={16} /> RETORNO
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1 pl-1 font-medium">
                          {new Date(mov.fecha_movimiento).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-slate-700">{mov.tipo_equipo}</div>
                        <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide">
                          ACTIVO: {mov.activo || 'S/D'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        <span className="font-medium text-slate-600 block truncate max-w-[150px] ml-auto bg-slate-50 px-2 py-1 rounded border border-slate-100" title={mov.destino}>
                          {mov.destino}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;