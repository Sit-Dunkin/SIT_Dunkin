import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 🔥 IMPORTANTE: Para corregir el fondo sobre el navbar
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Trash2, Wrench, Box, CheckCircle, X } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Metricas = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados para Modals
    const [showDisponiblesModal, setShowDisponiblesModal] = useState(false);
    const [showReparacionModal, setShowReparacionModal] = useState(false);
    const [showBajasModal, setShowBajasModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/metricas');
                const json = await res.json();
                console.log("Datos Recibidos:", json); 
                setData(json);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-4 text-center text-slate-500 text-sm">Cargando métricas...</div>;
    if (!data) return <div className="p-4 text-center text-red-500 text-sm">No hay datos disponibles.</div>;

    // --- PROCESAMIENTO DE DATOS ---
    const kpis = data.kpis || {};

    const totalStockFisico = Number(kpis.total_stock) || 0;      
    const enOperacion = Number(kpis.total_salidas) || 0;        
    const reparacion = Number(kpis.total_reparacion) || 0;
    const bajas = Number(kpis.total_bajas) || 0;

    const disponibles = totalStockFisico - reparacion - bajas;
    const totalEquipos = totalStockFisico + enOperacion;

    // --- CONFIGURACIÓN GRÁFICAS ---
    const pieData = {
        labels: ['Disponible', 'Reparación', 'Baja'],
        datasets: [{
            data: [disponibles, reparacion, bajas],
            backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
            borderWidth: 1,
            borderColor: '#ffffff',
        }],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 }, padding: 10 } }
        }
    };

    const listadoGrafica = data.grafica_tipos || [];
    
    const barData = {
        labels: listadoGrafica.map(d => d.tipo_equipo),
        datasets: [{
            label: 'Cant.',
            data: listadoGrafica.map(d => d.cantidad),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderRadius: 3,
            barThickness: 25,
        }],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { ticks: { font: { size: 10 } }, beginAtZero: true },
            x: { ticks: { font: { size: 10 } } }
        }
    };

    return (
        <div className="p-4 space-y-4 animate-in fade-in duration-500 relative">
            
            {/* CABECERA */}
            <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Métricas de Inventario</h1>
                    <p className="text-slate-500 text-xs">Estado actual de los activos.</p>
                </div>
                <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    Total Global: {totalEquipos}
                </div>
            </div>

            {/* TARJETAS KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Total */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="text-blue-600 mb-1"><Box size={24} /></div>
                    <h3 className="text-3xl font-bold text-slate-800 leading-none">{totalEquipos}</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total</p>
                </div>

                {/* Disponibles */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:border-green-200 transition-colors">
                      <div className="text-green-500 mb-1"><CheckCircle size={24} /></div>
                    <h3 className="text-3xl font-bold text-slate-800 leading-none">{disponibles}</h3>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Disponibles</p>
                      <button onClick={() => setShowDisponiblesModal(true)} className="mt-2 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 hover:bg-green-100 w-full">Ver detalles</button>
                </div>

                {/* Reparación */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:border-yellow-200 transition-colors">
                    <div className="text-yellow-500 mb-1"><Wrench size={24} /></div>
                    <h3 className="text-3xl font-bold text-slate-800 leading-none">{reparacion}</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Reparación</p>
                    <button onClick={() => setShowReparacionModal(true)} className="mt-2 text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100 hover:bg-yellow-100 w-full">Ver detalles</button>
                </div>

                {/* Bajas */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:border-red-200 transition-colors">
                    <div className="text-red-500 mb-1"><Trash2 size={24} /></div>
                    <h3 className="text-3xl font-bold text-slate-800 leading-none">{bajas}</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Bajas</p>
                    <button onClick={() => setShowBajasModal(true)} className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 hover:bg-red-100 w-full">Ver detalles</button>
                </div>

            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-2 text-sm border-b pb-2">Distribución Stock ({totalStockFisico})</h3>
                    <div className="h-48 w-full relative">
                        <Pie data={pieData} options={pieOptions} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-2 text-sm border-b pb-2">Top Equipos</h3>
                    <div className="h-48 w-full relative">
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>
            </div>

            {/* MODALES CON PORTAL (CORRECCIÓN VISUAL) */}
            
            {showDisponiblesModal && createPortal(
                <ModalGenerico title="Equipos Disponibles" onClose={() => setShowDisponiblesModal(false)}>
                    <TableDetalle data={data.detalles?.disponibles} emptyMsg="No hay equipos disponibles." />
                </ModalGenerico>,
                document.body
            )}
            
            {showReparacionModal && createPortal(
                <ModalGenerico title="En Reparación" onClose={() => setShowReparacionModal(false)}>
                    <TableDetalle data={data.detalles?.reparacion} emptyMsg="No hay equipos en reparación." showObservacion={true} />
                </ModalGenerico>,
                document.body
            )}

            {showBajasModal && createPortal(
                <ModalGenerico title="Equipos en Baja" onClose={() => setShowBajasModal(false)}>
                    <TableDetalle data={data.detalles?.bajas} emptyMsg="No hay equipos dados de baja." showObservacion={true} />
                </ModalGenerico>,
                document.body
            )}

        </div>
    );
};

// Componente Modal Reutilizable
const ModalGenerico = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-slate-800 font-bold text-base">{title}</h2>
                <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
                <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-xs font-bold">Cerrar</button>
            </div>
        </div>
    </div>
);

// Componente Tabla
const TableDetalle = ({ data, emptyMsg, showObservacion }) => {
    if (!data || data.length === 0) return <p className="p-6 text-center text-slate-500 text-sm">{emptyMsg}</p>;
    return (
        <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold sticky top-0">
                <tr>
                    <th className="px-4 py-2">Equipo</th>
                    <th className="px-4 py-2">Activo</th>
                    <th className="px-4 py-2">Serial</th>
                    {showObservacion ? <th className="px-4 py-2">Detalle</th> : <th className="px-4 py-2">Modelo</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {data.map((eq, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{eq.tipo_equipo} {eq.marca}</td>
                        <td className="px-4 py-2 font-bold text-slate-600">{eq.placa_inventario || '-'}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{eq.serial}</td>
                        <td className="px-4 py-2 text-slate-500 italic truncate max-w-[200px]">
                            {showObservacion ? (eq.observaciones || 'Sin detalles') : eq.modelo}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Metricas;