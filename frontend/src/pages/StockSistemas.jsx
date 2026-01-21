import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
    Search, Plus, Pencil, Trash2, X, Eye, FileText, ArrowRightLeft, 
    Wrench, Mail, CheckSquare, ChevronDown, Trash, Recycle, 
    Save, ArrowRight, ArrowLeft, Phone, Briefcase, Truck, User, Upload,
    Calendar, Clock, Check, XCircle, CheckCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext'; 
import { formatearFecha } from '../utils/dateUtils';

const StockSistemas = () => {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [contactos, setContactos] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [selectedIds, setSelectedIds] = useState([]);

  // Estado del Loading Spinner
  const [procesando, setProcesando] = useState(false);

  // --- MODALS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Modals de Actas
  const [isTrasladoOpen, setIsTrasladoOpen] = useState(false);
  const [isReparacionOpen, setIsReparacionOpen] = useState(false);
  const [isBajaOpen, setIsBajaOpen] = useState(false); 
  const [isResiduosOpen, setIsResiduosOpen] = useState(false);
  
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEquipo, setSelectedEquipo] = useState(null);

  // --- ESTADO PARA EL WIZARD (PASOS) ---
  const [step, setStep] = useState(1); 

  // --- LISTA DE TIPOS (CON MEMORIA PERMANENTE) ---
// --- ESTADO DE TIPOS (CON LIMPIEZA AUTOMÁTICA DE 'UPS') ---
  const [tiposEquipos, setTiposEquipos] = useState(() => {
    // 1. Lista básica por defecto (Si borras historial, vuelve a esto)
    const listaBase = [
      "Computador Escritorio", "Portatil", "Monitor", "Cajon Monedero", 
      "Impresora Termica", "Impresora Papel", "Lector Codigo", "CPU"
    ];

    // 2. Buscamos si hay algo guardado en el navegador
    const guardados = localStorage.getItem('listaTiposEquipos');
    
    if (guardados) {
      const listaGuardada = JSON.parse(guardados);
      // 3. 🔥 EL TRUCO: Filtramos para que "UPS" sea eliminado si existe
      return listaGuardada.filter(item => item !== "UPS");
    }

    return listaBase;
  });

  // --- EFECTO DE GUARDADO AUTOMÁTICO ---
  // Cada vez que agregues un tipo nuevo, esto lo guarda en la memoria del navegador
  useEffect(() => {
    localStorage.setItem('listaTiposEquipos', JSON.stringify(tiposEquipos));
  }, [tiposEquipos]);

  const [isAddingTipo, setIsAddingTipo] = useState(false);
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState('');

  // --- DEFINICIÓN DE ESTADOS INICIALES (CORREGIDOS CON ID) ---
  const initialEquipoState = { 
      serial: '', placa_inventario: '', tipo_equipo: '', marca: '', modelo: '', estado: 'DISPONIBLE', observaciones: '', origen: '',
      origen_acta: '', recibe_acta: '', correo_acta: '', contacto_id_acta: '', telefono_acta: '', cargo_acta: ''
  };
  
  // Se agregó contacto_id a todos los estados para corregir el bug del select
  const initialTrasladoState = { destinoNombre: '', recibe_nombre: '', recibe_telefono: '', recibe_cargo: '', correo: '', contacto_id: '', motivo: '' };
  const initialReparacionState = { empresa: '', tecnico_nombre: '', tecnico_id: '', tecnico_telefono: '', correo: '', contacto_id: '', observaciones: '' };
  const initialBajaState = { autoriza: '', destino_final: 'RECICLAJE', correo: '', contacto_id: '', observaciones: '' };
  const initialResiduosState = { empresa_reciclaje: '', conductor: '', placa_vehiculo: '', correo: '', contacto_id: '', observaciones: '' };

  // --- FORMULARIOS ---
  const [newEquipo, setNewEquipo] = useState(initialEquipoState);
  const [trasladoData, setTrasladoData] = useState(initialTrasladoState);
  const [reparacionData, setReparacionData] = useState(initialReparacionState);
  const [bajaData, setBajaData] = useState(initialBajaState);
  const [residuosData, setResiduosData] = useState(initialResiduosState);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 
      
      const res = await fetch('https://sit-dunkin-backend.onrender.com/api/equipos/stock', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEquipos(Array.isArray(data) ? data : []);

      try {
          const resCont = await fetch('https://sit-dunkin-backend.onrender.com/api/contactos', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(resCont.ok) {
              const dataCont = await resCont.json();
              setContactos(Array.isArray(dataCont) ? dataCont : []);
          }
      } catch (e) { console.warn("No se pudieron cargar contactos"); }

    } catch (err) { console.error(err); setEquipos([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- FILTROS ---
  const filteredEquipos = equipos.filter(eq => {
    if (!eq) return false;
    const estadoMatch = filterEstado === 'TODOS' || eq.estado === filterEstado;
    const text = `${eq.serial || ''} ${eq.tipo_equipo || ''} ${eq.placa_inventario || ''} ${eq.modelo || ''} ${eq.marca || ''}`.toLowerCase();
    return estadoMatch && text.includes(searchTerm.toLowerCase());
  });

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? filteredEquipos.map(eq => eq.id) : []);
  const handleSelectOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const downloadPDF = (base64, filename) => {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- IMPORTAR EXCEL ---
  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('archivoExcel', file); 

      try {
          Swal.fire({ title: 'Importando...', text: 'Procesando archivo...', didOpen: () => Swal.showLoading() });
          
          const res = await fetch('https://sit-dunkin-backend.onrender.com/api/equipos/stock/importar', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: formData 
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.message);

          if (result.pdf) {
              const nombreArchivo = result.numeroOrden 
                ? `Acta_Masiva_Ingreso_${result.numeroOrden}.pdf`  // ✅ Agregamos _Ingreso
                : `Acta_Masiva_Ingreso_${Date.now()}.pdf`;      // ✅ Aquí también por si acaso
              downloadPDF(result.pdf, nombreArchivo);
          }

          Swal.fire({
              icon: 'success',
              title: '¡Importación Finalizada!',
              html: `<b>Insertados:</b> ${result.insertados} <br/><b style="color:red">Fallidos:</b> ${result.fallidos}`
          });
          
          fetchData(); 

      } catch (error) {
          Swal.fire('Error', error.message, 'error');
      }
      e.target.value = null; 
  };

  // --- LÓGICA DE ACTAS (CON NOMBRE DE ARCHIVO DINÁMICO) ---
  const handleActionSubmit = async (url, data, filename, closeFn, resetData) => {
      setProcesando(true);

      try {
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ equiposIds: selectedIds, ...data })
          });
          
          if (!res.ok) throw new Error('Error en el servidor');
          const result = await res.json();
          
          let finalName = filename;
          if (result.numeroOrden) {
              const parts = filename.split('_');
              const prefix = parts.slice(0, parts.length - 1).join('_'); 
              finalName = `${prefix}_${result.numeroOrden}.pdf`;
          }
          
          if (result.pdf) downloadPDF(result.pdf, finalName);
          
          closeFn(false); 
          
          setTimeout(() => {
             Swal.fire({ icon: 'success', title: '¡Operación Exitosa!', text: result.emailSent ? 'Correo enviado.' : 'PDF descargado.', timer: 2000 });
          }, 300);
          
          if(resetData) resetData(); 
          setSelectedIds([]); 
          fetchData();

      } catch (err) { 
          Swal.fire('Error', err.message, 'error'); 
      } finally {
          setProcesando(false);
      }
  };

  const submitTraslado = () => { 
      if (!trasladoData.destinoNombre) return Swal.fire('Falta Destino', '', 'warning'); 
      handleActionSubmit('https://sit-dunkin-backend.onrender.com/api/equipos/trasladar', trasladoData, `Acta_Salida_${Date.now()}.pdf`, setIsTrasladoOpen, () => setTrasladoData(initialTrasladoState)); 
  };
  
  const submitReparacion = () => { 
      if (!reparacionData.empresa) return Swal.fire('Falta Empresa', '', 'warning'); 
      handleActionSubmit('https://sit-dunkin-backend.onrender.com/api/equipos/reparacion', reparacionData, `Orden_Rep_${Date.now()}.pdf`, setIsReparacionOpen, () => setReparacionData(initialReparacionState)); 
  };
  
  const submitBaja = () => { 
      if (!bajaData.autoriza) return Swal.fire('Falta Autorización', '', 'warning'); 
      handleActionSubmit('https://sit-dunkin-backend.onrender.com/api/equipos/baja', bajaData, `Acta_Baja_${Date.now()}.pdf`, setIsBajaOpen, () => setBajaData(initialBajaState)); 
  };
  
  const submitResiduos = () => { 
      if (!residuosData.empresa_reciclaje) return Swal.fire('Falta Empresa', '', 'warning'); 
      handleActionSubmit('https://sit-dunkin-backend.onrender.com/api/equipos/residuos', residuosData, `Manifiesto_RAEE_${Date.now()}.pdf`, setIsResiduosOpen, () => setResiduosData(initialResiduosState)); 
  };

  // --- TÉCNICOS: FINALIZAR REPARACIÓN ---
  const handleFinalizarReparacion = async (id) => {
    const { value: observaciones } = await Swal.fire({
      title: 'Finalizar Reparación',
      text: "Describe brevemente qué arreglo se le hizo al equipo:",
      input: 'textarea',
      inputPlaceholder: 'Ej: Se formateó y cambió pasta térmica.',
      showCancelButton: true,
      confirmButtonText: 'Finalizar y poner Disponible',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => { if (!value) return '¡Necesitas escribir qué le hiciste!'; }
    });

    if (observaciones) {
      setProcesando(true); 
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/equipos/stock/${id}/finalizar-reparacion`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ observaciones_reparacion: observaciones })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar');

        fetchData(); 
        setTimeout(() => Swal.fire({ icon: 'success', title: '¡Equipo Disponible!', text: 'El equipo ha vuelto al stock activo.', timer: 2000 }), 300);

      } catch (error) { Swal.fire('Error', error.message, 'error'); } 
      finally { setProcesando(false); }
    }
  };

  // --- CRUD & HANDLERS ---
  const handleInputChange = (e) => setNewEquipo({ ...newEquipo, [e.target.name]: e.target.value });

  // --- 🔥 FIX: HANDLER UNIFICADO PARA SELECT DE CORREOS POR ID ---
  // Esta función busca el email basado en el ID seleccionado para evitar el bug visual
  const handleContactSelect = (e, stateSetter, currentState) => {
      const selectedId = e.target.value;
      const contact = contactos.find(c => c.id.toString() === selectedId);
      
      stateSetter({
          ...currentState,
          contacto_id: selectedId,
          correo: contact ? contact.email : '' // Asigna el correo automáticamente
      });
  };

  // Manejador específico para el formulario de Nuevo Equipo (campos diferentes)
  const handleNewEquipoContactSelect = (e) => {
      const selectedId = e.target.value;
      const contact = contactos.find(c => c.id.toString() === selectedId);
      setNewEquipo({
          ...newEquipo,
          contacto_id_acta: selectedId,
          correo_acta: contact ? contact.email : ''
      });
  };

  const handleTipoSelectChange = (e) => {
      const value = e.target.value;
      if (value === 'NEW_OPTION_ADD') {
          setIsAddingTipo(true); 
          setNewEquipo({ ...newEquipo, tipo_equipo: '' }); 
      } else {
          setIsAddingTipo(false);
          handleInputChange(e);
      }
  };

  const confirmNuevoTipo = () => {
      if (!nuevoTipoNombre.trim()) return Swal.fire('Vacío', 'Escribe el nombre del equipo.', 'warning');
      const nuevaLista = [...tiposEquipos, nuevoTipoNombre];
      setTiposEquipos(nuevaLista);
      localStorage.setItem('listaTiposEquipos', JSON.stringify(nuevaLista));
      setNewEquipo({ ...newEquipo, tipo_equipo: nuevoTipoNombre });
      setIsAddingTipo(false);
      setNuevoTipoNombre('');
  };

  const handleOpenEdit = (eq) => { 
      setNewEquipo({ ...initialEquipoState, ...eq }); 
      setEditingId(eq.id); 
      setStep(1); 
      setIsModalOpen(true); 
      setIsAddingTipo(false); 
  };
  
  const handleNextStep = () => {
      if (!newEquipo.tipo_equipo || !newEquipo.serial) return Swal.fire('Faltan Datos', 'Tipo y Serial son obligatorios.', 'warning');
      setStep(2);
  };

  const handleSaveEquipo = async (e) => {
      e.preventDefault();
      if (!editingId && (!newEquipo.origen_acta || !newEquipo.recibe_acta)) return Swal.fire('Falta Origen/Receptor', 'Requeridos para el acta.', 'warning');

      const url = editingId ? `https://sit-dunkin-backend.onrender.com/api/equipos/stock/${editingId}` : 'https://sit-dunkin-backend.onrender.com/api/equipos/stock';
      const method = editingId ? 'PUT' : 'POST';
      const token = localStorage.getItem('token'); 

      setProcesando(true);

      try {
          const res = await fetch(url, { 
              method, 
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
              body: JSON.stringify(newEquipo) 
          });

          if (!res.ok) throw new Error('Error al guardar');
          const result = await res.json();
          
          if (!editingId && result.pdf) {
              const fileName = result.numeroOrden ? `Acta_Ingreso_${result.numeroOrden}.pdf` : `Acta_Ingreso_${newEquipo.serial}.pdf`;
              downloadPDF(result.pdf, fileName);
          }

          setIsModalOpen(false); 
          setNewEquipo(initialEquipoState); 
          setEditingId(null); 
          setStep(1); 
          fetchData();

          setTimeout(() => Swal.fire({ icon: 'success', title: editingId ? 'Actualizado' : '¡Equipo Creado!', timer: 2500 }), 300);

      } catch (err) { 
          Swal.fire('Error', err.message, 'error'); 
      } finally {
          setProcesando(false);
      }
  };

  const handleDelete = (id) => { 
      Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' })
      .then(async (r) => { 
          if (r.isConfirmed) { 
              try {
                  const res = await fetch(`https://sit-dunkin-backend.onrender.com/api/equipos/stock/${id}`, { 
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  }); 
                  if (res.status === 403) return Swal.fire('Acceso Denegado', 'Permisos insuficientes.', 'error');
                  if (!res.ok) throw new Error('Error al eliminar');
                  fetchData(); Swal.fire('Eliminado', '', 'success'); 
              } catch (error) { Swal.fire('Error', error.message, 'error'); }
          } 
      }); 
  };

  const handleViewDetails = (eq) => { setSelectedEquipo(eq); setIsDetailsOpen(true); };
  
  return (
    <div className="space-y-6 relative p-6">
      
      {/* CABECERA STICKY (FIJA) */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm flex justify-between items-end border-b border-slate-200 px-6 py-4 -mx-6 -mt-6 shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-800">Stock en Oficina Sistemas</h1><p className="text-slate-500 text-sm">Inventario disponible.</p></div>
        
        <div className="flex gap-2 relative">
            {selectedIds.length > 0 && (
                <div className="relative">
                    <button onClick={() => setShowActionMenu(!showActionMenu)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg shadow-md font-medium transition-colors">
                        <FileText size={18} /> <span>Generar Acta ({selectedIds.length})</span> <ChevronDown size={16}/>
                    </button>
                    {showActionMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={() => { setIsTrasladoOpen(true); setShowActionMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-slate-700 flex items-center gap-3 border-b border-slate-50"><ArrowRightLeft size={18}/> Salida / Traslado</button>
                            <button onClick={() => { setIsReparacionOpen(true); setShowActionMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-amber-50 text-slate-700 flex items-center gap-3 border-b border-slate-50"><Wrench size={18}/> Mantenimiento</button>
                            <button onClick={() => { setIsBajaOpen(true); setShowActionMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-slate-700 flex items-center gap-3 border-b border-slate-50"><Trash size={18}/> Baja Técnica</button>
                            <button onClick={() => { setIsResiduosOpen(true); setShowActionMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-green-50 text-slate-700 flex items-center gap-3"><Recycle size={18}/> Reciclaje RAEE</button>
                        </div>
                    )}
                </div>
            )}

            <input type="file" id="excelInput" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            
            {user?.rol_nombre === 'ADMIN' && (
                <button onClick={() => document.getElementById('excelInput').click()} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium">
                    <Upload size={18} /> <span>Importar Excel</span>
                </button>
            )}

            <button onClick={() => { setNewEquipo(initialEquipoState); setEditingId(null); setStep(1); setIsModalOpen(true); }} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium"><Plus size={18} /> <span>Agregar Equipo</span></button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" /></div>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm outline-none bg-white font-medium text-slate-700"><option value="TODOS">Todos</option><option value="DISPONIBLE">Disponible</option><option value="REPARACION">Reparación</option><option value="BAJA">Baja</option></select>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                    <th className="p-4 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} checked={equipos.length > 0 && selectedIds.length === filteredEquipos.length}/></th>
                    <th className="p-4">ELEMENTO</th>
                    <th className="p-4">ACTIVO</th>
                    <th className="p-4">SERIAL</th>
                    <th className="p-4">MODELO</th>
                    <th className="p-4 text-center">ESTADO</th>
                    <th className="p-4 text-center">ORIGEN</th>
                    <th className="p-4 text-center">FECHA</th>
                    <th className="p-4 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? ( <tr><td colSpan="9" className="p-8 text-center text-slate-500">Cargando...</td></tr> ) : 
                 filteredEquipos.map((eq) => (
                      <tr key={eq.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(eq.id) ? 'bg-blue-50' : ''}`}>
                        <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(eq.id)} onChange={() => handleSelectOne(eq.id)}/></td>
                        <td className="p-4 font-bold text-slate-700">{eq.tipo_equipo} <span className="text-xs font-normal text-slate-500 ml-1">{eq.marca}</span></td>
                        <td className="p-4 text-slate-600 font-medium">{eq.placa_inventario || 'S/P'}</td>
                        <td className="p-4 font-mono text-xs text-slate-500">{eq.serial}</td>
                        <td className="p-4 text-slate-600">{eq.modelo || '-'}</td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${eq.estado === 'DISPONIBLE' ? 'bg-green-50 text-green-700 border-green-200' : eq.estado === 'REPARACION' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{eq.estado}</span></td>
                        <td className="p-4 text-center"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase border border-slate-200">{eq.origen || '-'}</span></td>
                        <td className="p-4 text-center text-slate-500 text-xs">{formatearFecha(eq.fecha_ingreso).fecha}</td>
                        <td className="p-4 flex gap-2 justify-center">
                            <button onClick={() => handleViewDetails(eq)} className="p-1.5 text-gray-500 border rounded hover:bg-gray-100" title="Ver Detalle"><Eye size={16}/></button>
                            {(eq.estado === 'REPARACION' || eq.estado === 'DAÑADO') && (
                                <button onClick={() => handleFinalizarReparacion(eq.id)} className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors" title="Finalizar Reparación (Disponible)"><CheckCircle size={16}/></button>
                            )}
                            {user?.rol_nombre === 'ADMIN' && (
                                <>
                                    <button onClick={() => handleOpenEdit(eq)} className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50" title="Editar"><Pencil size={16}/></button>
                                    <button onClick={() => handleDelete(eq.id)} className="p-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50" title="Eliminar"><Trash2 size={16}/></button>
                                </>
                            )}
                        </td>
                      </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* SPINNER */}
      {procesando && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold text-gray-700 mb-2">Procesando...</h2>
                <p className="text-gray-500 mb-6 text-sm">Generando Acta y Enviando Correo</p>
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-orange-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
            </div>
        </div>, document.body
      )}

      {/* MODALES CON PORTAL */}
      
      {/* 1. Modal Wizard */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl relative flex flex-col my-8">
                <div className="bg-slate-900 px-6 py-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">{editingId ? <Pencil className="text-blue-400"/> : (step === 1 ? <Plus className="text-orange-500"/> : <FileText className="text-green-400"/>)} {editingId ? 'Editar Equipo' : (step === 1 ? 'Nuevo Equipo - Paso 1/2' : 'Acta de Ingreso - Paso 2/2')}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <form id="equipoForm" onSubmit={handleSaveEquipo} className="space-y-6">
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-left duration-300">
                                <h3 className="text-sm font-bold text-slate-800 uppercase border-b pb-2 mb-4">Datos Técnicos del Activo</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Elemento (Tipo) *</label>
                                        <select name="tipo_equipo" required value={isAddingTipo ? 'NEW_OPTION_ADD' : newEquipo.tipo_equipo} onChange={handleTipoSelectChange} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                                            <option value="">Seleccione un tipo...</option>
                                            {tiposEquipos.map((tipo, index) => <option key={index} value={tipo}>{tipo}</option>)}
                                            <option disabled>──────────────────</option>
                                            <option value="NEW_OPTION_ADD" className="text-blue-600 font-bold">+ Agregar nuevo equipo...</option>
                                        </select>
                                        {isAddingTipo && (
                                            <div className="mt-2 animate-in slide-in-from-top-2 duration-200 bg-blue-50 p-2 rounded-lg border border-blue-100 flex gap-2 items-center">
                                                <input type="text" placeholder="Escribe el nuevo tipo..." className="flex-1 p-2 text-sm border border-blue-200 rounded outline-none focus:border-blue-500" value={nuevoTipoNombre} onChange={(e) => setNuevoTipoNombre(e.target.value)} autoFocus />
                                                <button type="button" onClick={confirmNuevoTipo} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors" title="Guardar"><Check size={16} /></button>
                                                <button type="button" onClick={() => setIsAddingTipo(false)} className="bg-white border border-slate-300 text-slate-500 hover:text-red-500 p-2 rounded transition-colors" title="Cancelar"><X size={16} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                                        <select name="estado" value={newEquipo.estado} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="DISPONIBLE">Disponible</option>
                                            <option value="REPARACION">En Reparación</option>
                                            <option value="BAJA">De Baja</option>
                                        </select>
                                    </div>

                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Marca</label><input type="text" name="marca" value={newEquipo.marca} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label><input type="text" name="modelo" value={newEquipo.modelo} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/></div>

                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Serial *</label><input type="text" name="serial" required value={newEquipo.serial} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Activo (Placa)</label><input type="text" name="placa_inventario" value={newEquipo.placa_inventario} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/></div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones</label>
                                        <textarea name="observaciones" rows="2" value={newEquipo.observaciones} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}
                        {step === 2 && !editingId && (
                            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-right duration-300">
                                <h3 className="text-sm font-bold text-emerald-800 uppercase border-b border-emerald-200 pb-2 mb-4 flex items-center gap-2"><FileText size={18}/> Datos para Acta de Recepción</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div><label className="block text-xs font-bold text-emerald-700 mb-1">Origen / Proveedor *</label><div className="relative"><Truck className="absolute left-3 top-3 text-emerald-500" size={18}/><input type="text" name="origen_acta" placeholder="Ej: Lenovo Colombia" value={newEquipo.origen_acta} onChange={handleInputChange} className="w-full pl-10 p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"/></div></div>
                                    <div><label className="block text-xs font-bold text-emerald-700 mb-1">Recibe (Nombre) *</label><div className="relative"><User className="absolute left-3 top-3 text-emerald-500" size={18}/><input type="text" name="recibe_acta" placeholder="Ej: Yeison Molina" value={newEquipo.recibe_acta} onChange={handleInputChange} className="w-full pl-10 p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"/></div></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-emerald-700 mb-1">Teléfono (Opcional)</label><div className="relative"><Phone className="absolute left-3 top-3 text-emerald-500" size={18}/><input type="text" name="telefono_acta" placeholder="Ej: 300..." value={newEquipo.telefono_acta} onChange={handleInputChange} className="w-full pl-10 p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"/></div></div>
                                        <div><label className="block text-xs font-bold text-emerald-700 mb-1">Cargo (Opcional)</label><div className="relative"><Briefcase className="absolute left-3 top-3 text-emerald-500" size={18}/><input type="text" name="cargo_acta" placeholder="Ej: Auxiliar" value={newEquipo.cargo_acta} onChange={handleInputChange} className="w-full pl-10 p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"/></div></div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Correo para enviar copia (Opcional)</label>
                                        <div className="relative flex items-center">
                                            <Mail className="absolute left-3 text-emerald-500 z-10" size={18}/>
                                            {/* 🔥 FIX: Usamos contacto_id_acta para evitar el bug visual */}
                                            <select 
                                                name="contacto_id_acta" 
                                                value={newEquipo.contacto_id_acta} 
                                                onChange={handleNewEquipoContactSelect} 
                                                className="w-full pl-10 p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                                            >
                                                <option value="">-- Seleccionar Correo --</option>
                                                {contactos.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nombre_punto || c.email} - {c.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center">
                    {step === 1 ? <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors">Cancelar</button> : <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"><ArrowLeft size={18}/> Volver</button>}
                    {step === 1 && !editingId ? <button type="button" onClick={handleNextStep} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-md font-medium transition-colors flex items-center gap-2">Siguiente Paso <ArrowRight size={18}/></button> : <button type="submit" form="equipoForm" className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-md font-medium transition-colors flex items-center gap-2"><Save size={18}/> {editingId ? 'Guardar Cambios' : 'Finalizar y Guardar'}</button>}
                </div>
            </div>
        </div>,
        document.body 
      )}

      {/* 2. Modal Detalles */}
      {isDetailsOpen && selectedEquipo && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3"><Eye className="text-blue-600" size={26} /> Detalles del Equipo</h3>
                    <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-4"><div className="pt-1"><Calendar className="text-blue-500" size={24} strokeWidth={2} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">FECHA DE INGRESO</p><p className="font-medium text-slate-700 text-base">{formatearFecha(selectedEquipo.fecha_ingreso).fecha}</p></div></div>
                    <div className="flex items-start gap-4"><div className="pt-1"><Clock className="text-purple-500" size={24} strokeWidth={2} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">HORA DE INGRESO</p><p className="font-medium text-slate-700 text-base">{formatearFecha(selectedEquipo.fecha_ingreso).hora}</p></div></div>
                    <div className="flex items-start gap-4"><div className="pt-1"><User className="text-green-500" size={24} strokeWidth={2} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">REGISTRADO POR</p><p className="font-medium text-slate-700 text-base">{selectedEquipo.registrado_por || selectedEquipo.usuario_ingreso || 'Sistema'}</p></div></div>
                    <div className="space-y-2 pt-2"><div className="flex items-center gap-2 text-slate-500 font-bold text-sm"><FileText size={18} /> Observaciones</div><div className="w-full p-4 border border-slate-300 rounded-lg text-sm text-slate-600 min-h-[80px] bg-white shadow-sm">{selectedEquipo.observaciones || 'Sin observaciones.'}</div></div>
                </div>
                <div className="p-4 bg-white flex justify-end"><button onClick={() => setIsDetailsOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">Cerrar</button></div>
            </div>
        </div>,
        document.body
      )}

      {/* 3. Modal Traslado (SALIDA) */}
      {isTrasladoOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative">
                <button onClick={() => setIsTrasladoOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={24}/></button>
                <div className="p-6 pb-2 text-center"><div className="flex justify-center mb-2 text-blue-600"><FileText size={40} strokeWidth={1.5} /></div><h2 className="text-xl font-semibold text-slate-700">Acta de Salida / Traslado</h2></div>
                <div className="px-8 py-2 space-y-4">
                    <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 max-h-24 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipos a trasladar:</p>
                      {filteredEquipos.filter(eq => selectedIds.includes(eq.id)).map(item => (
                        <li key={item.id} className="list-disc ml-4 leading-snug text-xs">
                          <span className="font-bold">{item.tipo_equipo}</span> — Activo: {item.placa_inventario || 'S/P'}
                        </li>
                      ))}
                    </div>
                    
                    {/* 🔥 FIX: SELECTOR CORREGIDO POR ID */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-white">
                        <Mail className="text-slate-400" size={18}/>
                        <select 
                            className="flex-1 outline-none text-sm text-slate-600 bg-white" 
                            value={trasladoData.contacto_id} 
                            onChange={(e) => handleContactSelect(e, setTrasladoData, trasladoData)}
                        >
                            <option value="">-- Seleccionar Correo --</option>
                            {contactos.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_punto} - {c.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <input type="text" placeholder="Destino / Punto de Venta" className="w-full p-2.5 border rounded text-sm focus:border-blue-500" value={trasladoData.destinoNombre} onChange={e => setTrasladoData({...trasladoData, destinoNombre: e.target.value})}/>
                        <input type="text" placeholder="Nombre quien recibe" className="w-full p-2.5 bg-blue-50/30 border border-blue-100 rounded text-sm" value={trasladoData.recibe_nombre} onChange={e => setTrasladoData({...trasladoData, recibe_nombre: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Teléfono" className="w-full p-2.5 bg-blue-50/30 border border-blue-100 rounded text-sm" value={trasladoData.recibe_telefono} onChange={e => setTrasladoData({...trasladoData, recibe_telefono: e.target.value})}/><input type="text" placeholder="Cargo" className="w-full p-2.5 bg-blue-50/30 border border-blue-100 rounded text-sm" value={trasladoData.recibe_cargo} onChange={e => setTrasladoData({...trasladoData, recibe_cargo: e.target.value})}/></div>
                        <div className="mt-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Observaciones / Motivo</label><textarea placeholder="Ej: Asignación de equipo..." className="w-full p-2.5 border border-slate-300 rounded text-sm h-16 resize-none focus:border-blue-500 outline-none" value={trasladoData.motivo} onChange={e => setTrasladoData({...trasladoData, motivo: e.target.value})}></textarea></div>
                    </div>
                    <div className="pt-2"><button onClick={submitTraslado} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md flex justify-center items-center gap-2"><FileText size={18} /> Descargar y Enviar PDF</button><button onClick={() => setIsTrasladoOpen(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button></div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* 4. Modal Reparación */}
      {isReparacionOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative">
                <button onClick={() => setIsReparacionOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={24}/></button>
                <div className="p-6 pb-2 text-center"><div className="flex justify-center mb-2 text-amber-500"><Wrench size={40} strokeWidth={1.5} /></div><h2 className="text-xl font-semibold text-slate-700">Orden de Mantenimiento</h2></div>
                <div className="px-8 py-2 space-y-4">
                    <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 max-h-24 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipos a Reparación:</p>
                      {filteredEquipos.filter(eq => selectedIds.includes(eq.id)).map(item => (
                        <li key={item.id} className="list-disc ml-4 leading-snug text-xs">
                          <span className="font-bold">{item.tipo_equipo}</span> — Activo: {item.placa_inventario || 'S/P'}
                        </li>
                      ))}
                    </div>
                    
                    {/* 🔥 FIX: SELECTOR CORREGIDO POR ID */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-white">
                        <Mail className="text-slate-400" size={18}/>
                        <select 
                            className="flex-1 outline-none text-sm text-slate-600 bg-white" 
                            value={reparacionData.contacto_id} 
                            onChange={(e) => handleContactSelect(e, setReparacionData, reparacionData)}
                        >
                            <option value="">-- Correo Proveedor --</option>
                            {contactos.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_punto} - {c.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <input type="text" placeholder="Empresa / Taller" className="w-full p-2.5 border rounded text-sm focus:border-amber-500" value={reparacionData.empresa} onChange={e => setReparacionData({...reparacionData, empresa: e.target.value})}/>
                        <input type="text" placeholder="Nombre Técnico" className="w-full p-2.5 bg-amber-50/30 border border-amber-100 rounded text-sm" value={reparacionData.tecnico_nombre} onChange={e => setReparacionData({...reparacionData, tecnico_nombre: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="ID Técnico" className="w-full p-2.5 bg-amber-50/30 border border-amber-100 rounded text-sm" value={reparacionData.tecnico_id} onChange={e => setReparacionData({...reparacionData, tecnico_id: e.target.value})}/><input type="text" placeholder="Teléfono" className="w-full p-2.5 bg-amber-50/30 border border-amber-100 rounded text-sm" value={reparacionData.tecnico_telefono} onChange={e => setReparacionData({...reparacionData, tecnico_telefono: e.target.value})}/></div>
                        <textarea placeholder="Diagnóstico / Observaciones" className="w-full p-2.5 border rounded text-sm h-20 resize-none" value={reparacionData.observaciones} onChange={e => setReparacionData({...reparacionData, observaciones: e.target.value})}></textarea>
                    </div>
                    <div className="pt-2"><button onClick={submitReparacion} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-md flex justify-center items-center gap-2"><Wrench size={18} /> Generar Orden</button><button onClick={() => setIsReparacionOpen(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button></div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* 5. Modal Baja */}
      {isBajaOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative">
                <button onClick={() => setIsBajaOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={24}/></button>
                <div className="p-6 pb-2 text-center"><div className="flex justify-center mb-2 text-red-500"><Trash size={40} strokeWidth={1.5} /></div><h2 className="text-xl font-semibold text-slate-700">Acta de Baja Técnica</h2></div>
                <div className="px-8 py-2 space-y-4">
                    <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 max-h-24 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipos de Baja:</p>
                      {filteredEquipos.filter(eq => selectedIds.includes(eq.id)).map(item => (
                        <li key={item.id} className="list-disc ml-4 leading-snug text-xs">
                          <span className="font-bold">{item.tipo_equipo}</span> — Activo: {item.placa_inventario || 'S/P'}
                        </li>
                      ))}
                    </div>
                    
                    {/* 🔥 FIX: SELECTOR CORREGIDO POR ID */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-white">
                        <Mail className="text-slate-400" size={18}/>
                        <select 
                            className="flex-1 outline-none text-sm text-slate-600 bg-white" 
                            value={bajaData.contacto_id} 
                            onChange={(e) => handleContactSelect(e, setBajaData, bajaData)}
                        >
                            <option value="">-- Correo Autorización --</option>
                            {contactos.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_punto} - {c.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3"><input type="text" placeholder="Nombre quien Autoriza (Jefe)" className="w-full p-2.5 border rounded text-sm focus:border-red-500" value={bajaData.autoriza} onChange={e => setBajaData({...bajaData, autoriza: e.target.value})}/><select className="w-full p-2.5 border rounded text-sm bg-white" value={bajaData.destino_final} onChange={e => setBajaData({...bajaData, destino_final: e.target.value})}><option value="RECICLAJE">Disposición: Reciclaje</option><option value="DESTRUCCION">Disposición: Destrucción</option><option value="GARANTIA">Devolución por Garantía</option></select><textarea placeholder="Motivo de la baja" className="w-full p-2.5 border rounded text-sm h-20 resize-none" value={bajaData.observaciones} onChange={e => setBajaData({...bajaData, observaciones: e.target.value})}></textarea></div>
                    <div className="pt-2"><button onClick={submitBaja} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md flex justify-center items-center gap-2"><Trash size={18} /> Confirmar Baja</button><button onClick={() => setIsBajaOpen(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button></div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* 6. Modal Residuos */}
      {isResiduosOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative">
                <button onClick={() => setIsResiduosOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={24}/></button>
                <div className="p-6 pb-2 text-center"><div className="flex justify-center mb-2 text-green-500"><Recycle size={40} strokeWidth={1.5} /></div><h2 className="text-xl font-semibold text-slate-700">Entrega Residuos RAEE</h2></div>
                <div className="px-8 py-2 space-y-4">
                    <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 max-h-24 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipos a Reciclar:</p>
                      {filteredEquipos.filter(eq => selectedIds.includes(eq.id)).map(item => (
                        <li key={item.id} className="list-disc ml-4 leading-snug text-xs">
                          <span className="font-bold">{item.tipo_equipo}</span> — Activo: {item.placa_inventario || 'S/P'}
                        </li>
                      ))}
                    </div>
                    
                    {/* 🔥 FIX: SELECTOR CORREGIDO POR ID */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-white">
                        <Mail className="text-slate-400" size={18}/>
                        <select 
                            className="flex-1 outline-none text-sm text-slate-600 bg-white" 
                            value={residuosData.contacto_id} 
                            onChange={(e) => handleContactSelect(e, setResiduosData, residuosData)}
                        >
                            <option value="">-- Correo Gestor Ambiental --</option>
                            {contactos.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_punto} - {c.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3"><input type="text" placeholder="Empresa Gestora (Recicladora)" className="w-full p-2.5 border rounded text-sm focus:border-green-500" value={residuosData.empresa_reciclaje} onChange={e => setResiduosData({...residuosData, empresa_reciclaje: e.target.value})}/><input type="text" placeholder="Nombre Conductor" className="w-full p-2.5 bg-green-50/30 border border-green-100 rounded text-sm" value={residuosData.conductor} onChange={e => setResiduosData({...residuosData, conductor: e.target.value})}/><input type="text" placeholder="Placa Vehículo" className="w-full p-2.5 bg-green-50/30 border border-green-100 rounded text-sm" value={residuosData.placa_vehiculo} onChange={e => setResiduosData({...residuosData, placa_vehiculo: e.target.value})}/></div>
                    <div className="pt-2"><button onClick={submitResiduos} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md flex justify-center items-center gap-2"><Recycle size={18} /> Generar Manifiesto</button><button onClick={() => setIsResiduosOpen(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button></div>
                </div>
            </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default StockSistemas;