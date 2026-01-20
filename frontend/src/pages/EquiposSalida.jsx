import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
    Search, RotateCcw, Eye, Pencil, Trash2, X, MapPin, Save, 
    CheckSquare, Mail, Phone, Briefcase, User, FileText, Calendar, Upload 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext'; 
import { formatearFecha } from '../utils/dateUtils';

const EquiposSalida = () => {
  const { user } = useAuth(); 
  
  // --- ESTADOS ---
  const [equipos, setEquipos] = useState([]);
  const [contactos, setContactos] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  //  ESTADO PARA EL SPINNER DE CARGA 
  const [procesando, setProcesando] = useState(false);

  // Modals
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRetornoOpen, setIsRetornoOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [selectedEquipo, setSelectedEquipo] = useState(null);

  // Estado Formulario Devolución
  const [retornoData, setRetornoData] = useState({
      origen: '',         
      quien_entrega: '',  
      telefono: '',
      cargo: '',
      correo: '',         
      contacto_id: '',
      estado: 'REPARACION', 
      observaciones: ''
  });

  // Estado Formulario Edición
  const [editFormData, setEditFormData] = useState({});

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const resEquipos = await fetch('http://localhost:4000/api/equipos/salidas', {
          headers: { 'Authorization': `Bearer ${token}` }
      }); 
      
      if (!resEquipos.ok) throw new Error("Error consultando equipos");
      const dataEquipos = await resEquipos.json();
      setEquipos(Array.isArray(dataEquipos) ? dataEquipos : []);

      const resContactos = await fetch('http://localhost:4000/api/contactos', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resContactos.ok) {
          const dataContactos = await resContactos.json();
          setContactos(Array.isArray(dataContactos) ? dataContactos : []);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- FILTRADO ---
  const filteredEquipos = equipos.filter(equipo => {
    const searchLower = searchTerm.toLowerCase();
    const destino = equipo.destino || equipo.punto_venta || ''; 
    const serial = equipo.serial || '';
    const placa = equipo.placa_inventario || '';
    const tipo = equipo.tipo_equipo || '';

    return serial.toLowerCase().includes(searchLower) || 
           placa.toLowerCase().includes(searchLower) ||
           destino.toLowerCase().includes(searchLower) ||
           tipo.toLowerCase().includes(searchLower);
  });

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? filteredEquipos.map(eq => eq.id) : []);
  const handleSelectOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // --- IMPORTAR EXCEL (ACTUALIZADO CON DESCARGA PDF) ---
  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('archivoExcel', file); 

      try {
          Swal.fire({ title: 'Importando...', text: 'Procesando archivo...', didOpen: () => Swal.showLoading() });
          
          const res = await fetch('http://localhost:4000/api/equipos/salida/importar', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: formData 
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.message);

          // 1. Mensaje de Éxito
          Swal.fire({
              icon: 'success',
              title: '¡Carga Masiva Exitosa!',
              html: `<b>Insertados:</b> ${result.insertados} <br/><b style="color:red">Errores/Duplicados:</b> ${result.errores}`,
              timer: 3000
          });

          // 🔥 2. NUEVO: DESCARGA AUTOMÁTICA DEL PDF DEL ACTA
          if (result.pdf) {
              try {
                  const link = document.createElement('a');
                  link.href = `data:application/pdf;base64,${result.pdf}`;
                  // Nombre del archivo: Acta_Masiva_Salida_00XX.pdf
                  link.download = `Acta_Masiva_Salida_${result.numeroOrden || Date.now()}.pdf`; 
                  
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  console.log("📥 Acta descargada automáticamente.");
              } catch (pdfError) {
                  console.error("Error descargando PDF automático:", pdfError);
              }
          }
          
          fetchData(); 

      } catch (error) {
          Swal.fire('Error', error.message, 'error');
      }
      e.target.value = null; // Limpiar input
  };

  // --- RETORNO ---
  const openRetornoModal = () => {
      let posibleOrigen = '';
      if (selectedIds.length === 1) {
          const eq = equipos.find(e => e.id === selectedIds[0]);
          if (eq) posibleOrigen = eq.destino || eq.punto_venta;
      }
      setRetornoData(prev => ({ ...prev, origen: posibleOrigen }));
      setIsRetornoOpen(true);
  };

  const handleContactSelect = (e) => {
      const selectedId = e.target.value;
      const contact = contactos.find(c => c.id.toString() === selectedId);
      
      setRetornoData({
          ...retornoData,
          contacto_id: selectedId,
          correo: contact ? contact.email : ''
      });
  };

  const handleRetornoSubmit = async () => {
      if (!retornoData.origen) return Swal.fire('Faltan Datos', 'Indica el Origen.', 'warning');
      if (!retornoData.quien_entrega) return Swal.fire('Faltan Datos', 'Indica quién entrega.', 'warning');
      if (!retornoData.correo) return Swal.fire('Faltan Datos', 'Selecciona un correo.', 'warning');

      setProcesando(true);

      try {
          const response = await fetch('http://localhost:4000/api/equipos/retorno', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ equiposIds: selectedIds, ...retornoData })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message);

          if (result.pdf) {
              const link = document.createElement('a');
              link.href = `data:application/pdf;base64,${result.pdf}`;
              let filename = `Acta_Retorno_${Date.now()}.pdf`;
              if (result.numeroOrden) filename = `Acta_Retorno_${result.numeroOrden}.pdf`;
              link.download = filename;
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
          }
          
          setTimeout(() => {
             Swal.fire({ icon: 'success', title: 'Retorno Exitoso', text: result.emailSent ? 'Acta enviada.' : 'Acta descargada.' });
          }, 300);

          setIsRetornoOpen(false); 
          setSelectedIds([]);
          setRetornoData({ origen: '', quien_entrega: '', telefono: '', cargo: '', correo: '', contacto_id: '', estado: 'REPARACION', observaciones: '' });
          fetchData();

      } catch (error) { 
          Swal.fire({ icon: 'error', title: 'Error', text: error.message }); 
      } finally {
          setProcesando(false);
      }
  };

  // --- EDICIÓN ---
  const handleEditClick = (equipo) => {
      setEditFormData({
          id: equipo.id,
          serial: equipo.serial,
          placa_inventario: equipo.placa_inventario || '',
          tipo_equipo: equipo.tipo_equipo,
          marca: equipo.marca || '',
          modelo: equipo.modelo || '',
          destino: equipo.destino || equipo.punto_venta || '' 
      });
      setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => { const { name, value } = e.target; setEditFormData({ ...editFormData, [name]: value }); };

  const handleEditSubmit = async (e) => {
      e.preventDefault();
      try {
          const response = await fetch(`http://localhost:4000/api/equipos/salida/${editFormData.id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}` 
              },
              body: JSON.stringify(editFormData)
          });
          
          if (response.status === 403) throw new Error("No tienes permisos de Administrador.");
          if (!response.ok) throw new Error('Error al actualizar');
          
          Swal.fire('Actualizado', 'Información guardada.', 'success');
          setIsEditModalOpen(false); fetchData();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  };

  const handleDelete = (id) => {
      Swal.fire({ title: '¿Eliminar registro?', text: "Esto borrará el equipo de la lista de salidas (NO vuelve a stock).", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar' }).then(async (result) => {
          if (result.isConfirmed) {
              try { 
                  const response = await fetch(`http://localhost:4000/api/equipos/salida/${id}`, { 
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  }); 
                  if (response.status === 403) throw new Error("No tienes permisos de Administrador.");
                  fetchData(); 
                  Swal.fire('Eliminado', '', 'success'); 
              } catch (error) { Swal.fire('Error', error.message, 'error'); }
          }
      });
  };

  // Helpers
  const handleViewDetails = (eq) => { setSelectedEquipo(eq); setIsDetailsOpen(true); };
  const selectedDetails = equipos.filter(eq => selectedIds.includes(eq.id));

  return (
    <div className="space-y-6 relative p-6">
      
      {/* CABECERA STICKY */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm flex justify-between items-end border-b border-slate-200 px-6 py-4 -mx-6 -mt-6 shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-800">Equipos Salida (En Operación)</h1><p className="text-slate-500 text-sm">Gestión de equipos en puntos de venta.</p></div>
        
        <div className="flex gap-2">
            {/* Input de archivo oculto */}
            <input type="file" id="excelSalidasInput" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            
            {/* Botón Importar Excel (Solo Admin) */}
            {user?.rol_nombre === 'ADMIN' && (
                <button onClick={() => document.getElementById('excelSalidasInput').click()} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-md font-medium transition-colors">
                    <Upload size={18} /> <span>Importar Excel</span>
                </button>
            )}

            {selectedIds.length > 0 && (
                <button onClick={openRetornoModal} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md font-medium transition-colors">
                    <RotateCcw size={18} /> <span>Devolver a Sistemas ({selectedIds.length})</span>
                </button>
            )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar por Serial, Placa o Destino..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded outline-none text-sm"/></div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} checked={filteredEquipos.length > 0 && selectedIds.length === filteredEquipos.length}/></th>
                  <th className="p-4">ELEMENTO</th>
                  <th className="p-4">ACTIVO</th>
                  <th className="p-4">SERIAL</th>
                  <th className="p-4">MODELO</th>
                  <th className="p-4 text-center">DESTINO ACTUAL</th>
                  <th className="p-4 text-center">FECHA SALIDA</th>
                  <th className="p-4 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? ( <tr><td colSpan="8" className="p-8 text-center text-slate-500">Cargando...</td></tr> ) : 
                 filteredEquipos.map((eq) => (
                      <tr key={eq.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(eq.id) ? 'bg-red-50' : ''}`}>
                        <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(eq.id)} onChange={() => handleSelectOne(eq.id)}/></td>
                        <td className="p-4 font-bold text-slate-700">{eq.tipo_equipo} <span className="text-xs font-normal text-slate-500 block">{eq.marca}</span></td>
                        <td className="p-4 text-slate-600 font-medium">{eq.placa_inventario || 'S/P'}</td>
                        <td className="p-4 font-mono text-xs text-slate-500">{eq.serial}</td>
                        <td className="p-4 text-slate-600">{eq.modelo}</td>
                        <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase border border-blue-100">{eq.destino || eq.punto_venta}</span></td>
                        <td className="p-4 text-center text-slate-500">{formatearFecha(eq.fecha_ingreso || eq.fecha_salida).fecha}</td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleViewDetails(eq)} className="p-1.5 text-gray-500 border rounded hover:bg-gray-100"><Eye size={16}/></button>
                                {user?.rol_nombre === 'ADMIN' && (
                                    <>
                                            <button onClick={() => handleEditClick(eq)} className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50"><Pencil size={16}/></button>
                                            <button onClick={() => handleDelete(eq.id)} className="p-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                                    </>
                                )}
                            </div>
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
                <p className="text-gray-500 mb-6 text-sm">Guardando datos...</p>
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-orange-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
            </div>
        </div>, document.body
      )}

      {/* MODAL RETORNO */}
      {isRetornoOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 relative">
                  <button onClick={() => setIsRetornoOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 transition-colors"><X size={24}/></button>
                  <div className="p-6 pb-2 text-center">
                      <div className="flex justify-center mb-2 text-red-600"><RotateCcw size={40} strokeWidth={1.5} /></div>
                      <h2 className="text-xl font-semibold text-slate-700">Acta de Entrada (Retorno)</h2>
                  </div>
                  <div className="px-8 py-2 space-y-4">
                      <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 max-h-24 overflow-y-auto">
                          <p className="text-xs font-bold text-slate-400 uppercase">Equipos a recibir:</p>
                          {selectedDetails?.map(item => <li key={item.id} className="list-disc ml-4 text-xs font-mono">{item.tipo_equipo} - {item.serial}</li>)}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Origen</label><input type="text" placeholder="Ej: PV Centro" className="w-full p-2 border rounded text-sm" value={retornoData.origen} onChange={e => setRetornoData({...retornoData, origen: e.target.value})}/></div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Estado</label>
                              <select className="w-full p-2 border rounded text-sm font-bold" value={retornoData.estado} onChange={e => setRetornoData({...retornoData, estado: e.target.value})}>
                                  <option value="REPARACION">EN REPARACIÓN 🛠</option>
                                  <option value="DISPONIBLE">DISPONIBLE ✅</option>
                                  <option value="BAJA">PARA BAJA 🗑</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <input type="text" placeholder="Nombre quien entrega" className="w-full pl-3 p-2 border rounded text-sm" value={retornoData.quien_entrega} onChange={e => setRetornoData({...retornoData, quien_entrega: e.target.value})}/>
                          <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="Teléfono" className="w-full pl-3 p-2 border rounded text-sm" value={retornoData.telefono} onChange={e => setRetornoData({...retornoData, telefono: e.target.value})}/>
                              <input type="text" placeholder="Cargo" className="w-full pl-3 p-2 border rounded text-sm" value={retornoData.cargo} onChange={e => setRetornoData({...retornoData, cargo: e.target.value})}/>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 border rounded bg-white">
                          <Mail className="text-slate-400" size={16}/>
                          <select className="flex-1 text-sm text-slate-600 bg-white outline-none" value={retornoData.contacto_id} onChange={handleContactSelect}>
                              <option value="">-- Seleccionar Correo --</option>
                              {contactos && contactos.length > 0 ? contactos.map(c => (<option key={c.id} value={c.id}>{c.nombre_punto || c.email} - {c.email}</option>)) : <option disabled>Sin contactos</option>}
                          </select>
                      </div>
                      <textarea rows="2" placeholder="Motivo del retorno / Daño..." className="w-full p-2 border rounded text-sm resize-none" value={retornoData.observaciones} onChange={e => setRetornoData({...retornoData, observaciones: e.target.value})}></textarea>
                      <div className="pt-2">
                          <button onClick={handleRetornoSubmit} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow flex justify-center items-center gap-2"><FileText size={18} /> Generar Acta</button>
                          <button onClick={() => setIsRetornoOpen(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button>
                      </div>
                  </div>
              </div>
          </div>, document.body
      )}

      {/* MODAL DETALLES */}
      {isDetailsOpen && selectedEquipo && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Eye className="text-blue-600" size={22} /> Detalles de Salida</h3>
                    <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-4"><div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0"><MapPin size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ubicación Actual</p><p className="text-sm font-semibold text-slate-700">{selectedEquipo.destino || selectedEquipo.punto_venta}</p></div></div>
                    <div className="flex items-start gap-4"><div className="p-2.5 bg-green-50 rounded-xl text-green-600 shrink-0"><User size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Encargado / Responsable</p><p className="text-sm font-semibold text-slate-700">{selectedEquipo.encargado || 'No registrado'}</p></div></div>
                    <div className="flex items-start gap-4"><div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0"><Mail size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Correo Contacto</p><p className="text-sm font-semibold text-slate-700 break-all">{selectedEquipo.correo || 'No registrado'}</p></div></div>
                    <div className="flex items-start gap-4"><div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0"><Calendar size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fecha Salida</p><p className="text-sm font-semibold text-slate-700">{formatearFecha(selectedEquipo.fecha_ingreso || selectedEquipo.fecha_salida).fecha}</p></div></div>
                    <div className="pt-2"><div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-slate-400" /><span className="text-xs font-bold text-slate-600 uppercase">Motivo / Observaciones</span></div><div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 leading-relaxed">{selectedEquipo.motivo || selectedEquipo.ultimo_motivo || "Sin detalles adicionales."}</div></div>
                </div>
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end"><button onClick={() => setIsDetailsOpen(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">Cerrar</button></div>
            </div>
        </div>, document.body
      )}

      {/* MODAL EDICIÓN */}
      {isEditModalOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                  <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                      <h2 className="text-white font-bold text-lg flex items-center gap-2"><Pencil className="text-blue-400"/> Editar Información</h2>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Elemento (Tipo)</label><input type="text" name="tipo_equipo" value={editFormData.tipo_equipo} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Marca</label><input type="text" name="marca" value={editFormData.marca} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Activo (Placa)</label><input type="text" name="placa_inventario" value={editFormData.placa_inventario} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Serial</label><input type="text" name="serial" required value={editFormData.serial} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label><input type="text" name="modelo" value={editFormData.modelo} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                          <div><label className="block text-sm font-medium text-slate-700 mb-1">Destino Actual</label><input type="text" name="destino" value={editFormData.destino} onChange={handleEditChange} className="w-full p-2.5 border border-slate-300 rounded-lg"/></div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md flex items-center gap-2"><Save size={18} /> Guardar Cambios</button>
                      </div>
                  </form>
              </div>
          </div>, document.body
      )}

    </div>
  );
};

export default EquiposSalida;