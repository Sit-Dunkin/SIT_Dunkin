import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Pencil, Trash2, Mail, MapPin, Building, X, Monitor, Briefcase, Save, Check, Wrench } from 'lucide-react';
import Swal from 'sweetalert2';

const CorreosPV = () => {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para la entidad dinámica
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customType, setCustomType] = useState('');

  // --- 1. MEMORIA PERMANENTE DEL NAVEGADOR ---
  // Cargamos los tipos que hayas agregado manualmente en el pasado
  const [tiposFijosManuales, setTiposFijosManuales] = useState(() => {
    const guardados = localStorage.getItem('gestioneexus_custom_types');
    return guardados ? JSON.parse(guardados) : [];
  });

  const initialForm = { id: null, nombre_punto: '', email: '', tipo: '' };
  const [formData, setFormData] = useState(initialForm);

  // --- 2. LISTA MAESTRA DE TIPOS ---
  const tiposBase = ["PUNTO_VENTA", "OFICINA_ADMIN", "OFICINA_SISTEMAS", "BODEGA"];
  
  // Combinamos: Base + Memoria del navegador + Lo que hay en la DB actualmente
  const todosLosTipos = Array.from(new Set([
    ...tiposBase,
    ...tiposFijosManuales, // <--- Aquí están los que agregas con el botón y se quedan fijos
    ...contactos.map(c => c.tipo).filter(t => t),
    ...(formData.tipo ? [formData.tipo] : []) 
  ]));

  const fetchContactos = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/contactos');
      const data = await res.json();
      setContactos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setContactos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContactos(); }, []);

  const openCreateModal = () => {
      setFormData(initialForm);
      setIsEditing(false);
      setIsAddingCustomType(false); 
      setIsModalOpen(true);
  };

  const openEditModal = (contacto) => {
      setFormData(contacto);
      setIsEditing(true);
      setIsAddingCustomType(false);
      setIsModalOpen(true);
  };

  // --- 3. FUNCIÓN PARA FIJAR EN MEMORIA ---
  const handleConfirmCustomType = () => {
      if (!customType.trim()) return;
      const formatted = customType.trim().toUpperCase();
      
      // Si el tipo no existe en la base ni en la memoria, lo guardamos permanentemente
      if (!tiposBase.includes(formatted) && !tiposFijosManuales.includes(formatted)) {
          const nuevaLista = [...tiposFijosManuales, formatted];
          setTiposFijosManuales(nuevaLista);
          localStorage.setItem('gestioneexus_custom_types', JSON.stringify(nuevaLista));
      }

      setFormData(prev => ({ ...prev, tipo: formatted })); 
      setIsAddingCustomType(false);
      setCustomType('');
  };

  const handleSave = async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      if (!token) return Swal.fire('Error', 'No estás autenticado', 'error');

      if (!formData.nombre_punto || !formData.email || !formData.tipo) {
          return Swal.fire('Faltan datos', 'Nombre, Correo y Tipo son obligatorios', 'warning');
      }

      const url = isEditing 
        ? `http://localhost:4000/api/contactos/${formData.id}` 
        : 'http://localhost:4000/api/contactos';
      
      try {
          const res = await fetch(url, {
              method: isEditing ? 'PUT' : 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(formData)
          });
          
          if (!res.ok) throw new Error('Error al guardar. ¿Hiciste el ALTER TABLE en la BD?');
          
          Swal.fire({ icon: 'success', title: isEditing ? 'Actualizado' : 'Guardado', timer: 1500, showConfirmButton: false });
          setIsModalOpen(false);
          fetchContactos(); 
      } catch (error) {
          Swal.fire('Error', error.message, 'error');
      }
  };

  const handleDelete = (id) => {
    Swal.fire({
        title: '¿Eliminar contacto?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('token');
            try {
                await fetch(`http://localhost:4000/api/contactos/${id}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchContactos();
                Swal.fire('Eliminado', '', 'success');
            } catch (error) { Swal.fire('Error', error.message, 'error'); }
        }
    });
  };

  const filteredContactos = contactos.filter(c => 
      c.nombre_punto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tipo && c.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getIcon = (tipo) => {
      const t = tipo ? tipo.toUpperCase() : '';
      if (t.includes('PUNTO')) return <MapPin className="text-orange-600" size={20}/>;
      if (t.includes('ADMIN')) return <Briefcase className="text-purple-600" size={20}/>;
      if (t.includes('SISTEMAS')) return <Monitor className="text-blue-600" size={20}/>;
      if (t.includes('BODEGA')) return <Building className="text-gray-600" size={20}/>;
      if (t.includes('TECNICO')) return <Wrench className="text-teal-600" size={20}/>;
      return <Plus className="text-slate-400" size={20}/>;
  };

  const getBadgeStyles = (tipo) => {
      const t = tipo ? tipo.toUpperCase() : '';
      if (t.includes('PUNTO')) return 'bg-orange-100 text-orange-800 border-orange-200';
      if (t.includes('ADMIN')) return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
      if (t.includes('SISTEMAS')) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (t.includes('BODEGA')) return 'bg-gray-200 text-gray-700 border-gray-300';
      if (t.includes('TECNICO')) return 'bg-teal-100 text-teal-800 border-teal-200';
      return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 relative p-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Correos</h1>
          <button onClick={openCreateModal} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 transition-all"><Plus className="inline mr-1" size={18}/> Nuevo Contacto</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 font-bold uppercase text-xs border-b">
                  <tr>
                      <th className="px-6 py-4">Nombre / Entidad</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4 text-center">Tipo</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredContactos.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 border-b">
                          <td className="px-6 py-4 flex items-center gap-3">
                              <div className="p-2 bg-slate-50 rounded-lg">{getIcon(c.tipo)}</div>
                              <span className="font-bold text-slate-800">{c.nombre_punto}</span>
                          </td>
                          <td className="px-6 py-4 text-blue-600 font-bold">{c.email}</td>
                          <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase border min-w-[140px] inline-block shadow-sm ${getBadgeStyles(c.tipo)}`}>
                                  {c.tipo?.replace(/_/g, ' ')}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <button onClick={() => openEditModal(c)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"><Pencil size={16}/></button>
                              <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"><Trash2 size={16}/></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg">{isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Entidad *</label>
                        <input type="text" required value={formData.nombre_punto} onChange={(e) => setFormData({...formData, nombre_punto: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-black font-bold outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-black font-bold outline-none focus:ring-2 focus:ring-green-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Contacto *</label>
                        <select 
                            className={`w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white outline-none focus:ring-2 focus:ring-green-500 ${formData.tipo === '' ? 'text-slate-400' : 'text-black'}`}
                            value={formData.tipo} 
                            onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                        >
                            <option value="" disabled className="bg-white text-slate-400">-- Seleccione un tipo --</option>
                            {todosLosTipos.sort().map(tipo => (
                                <option key={tipo} value={tipo} className="bg-white text-black font-bold">
                                    {tipo.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>

                        {/* EL BOTÓN DINÁMICO (Igual a tu imagen de referencia) */}
                        {!isAddingCustomType ? (
                            <button type="button" onClick={() => setIsAddingCustomType(true)} className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1 hover:text-blue-800 transition-all">
                                <Plus size={14}/> <span>+ Agregar nueva entidad o tipo...</span>
                            </button>
                        ) : (
                            <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2 duration-200">
                                <input type="text" placeholder="Escribe aquí..." value={customType} onChange={(e) => setCustomType(e.target.value)} className="flex-1 p-2 text-sm border border-blue-300 rounded-md text-black font-bold outline-none" autoFocus onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleConfirmCustomType())} />
                                <button type="button" onClick={handleConfirmCustomType} className="p-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"><Check size={16}/></button>
                                <button type="button" onClick={() => { setIsAddingCustomType(false); setCustomType(''); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded-md transition-colors"><X size={16}/></button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md font-bold flex items-center gap-2 hover:bg-green-700 transition-all">
                            <Save size={18}/> Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CorreosPV;