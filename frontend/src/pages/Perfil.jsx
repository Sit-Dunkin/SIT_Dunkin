// src/pages/Perfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Eye, EyeOff, X, CheckCircle, AlertCircle, Lock, Circle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = 'http://localhost:4000';

const Perfil = () => {
  const { updateUserProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- ESTADOS PARA EL MODAL DE CONTRASEÑA ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // Estados de requisitos (IDÉNTICOS A TU IMAGEN)
  const [requirements, setRequirements] = useState({
    length: false,      // Mínimo 8 caracteres
    lowercase: false,   // 1 Minúscula
    symbol: false,      // 1 Símbolo
    uppercase: false,   // 1 Mayúscula
    number: false,      // 1 Número
    noSpecial: false    // Sin espacios/ñ/tildes
  });

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []);

  // --- VALIDACIÓN EN TIEMPO REAL ---
  useEffect(() => {
    const pwd = passForm.new;
    if (!pwd) {
        // Si está vacío, todo en falso
        setRequirements({ length: false, lowercase: false, uppercase: false, number: false, symbol: false, noSpecial: false });
        return;
    }

    setRequirements({
        length: pwd.length >= 8,
        lowercase: /[a-z]/.test(pwd),
        uppercase: /[A-Z]/.test(pwd),
        number: /\d/.test(pwd),
        symbol: /[@$!%*?&.\-#]/.test(pwd), // Símbolos permitidos
        // True si NO tiene espacios NI caracteres latinos (ñ, tildes)
        noSpecial: !/[\sñÑáéíóúÁÉÍÓÚ]/.test(pwd) 
    });
  }, [passForm.new]);


  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/usuarios/perfil`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Error al cargar el perfil');
      const data = await res.json();
      setUser(data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar la información del perfil', 'error');
    }
  };

  // --- Lógica de Foto de Perfil (Sin cambios) ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Por favor, selecciona un archivo de imagen', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('foto', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/usuarios/foto`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir la imagen');

      setUser(prev => ({ ...prev, foto: data.foto }));
      updateUserProfile(data.foto);
      setPreview(null);
      Swal.fire({ title: '¡Éxito!', text: 'Foto actualizada', icon: 'success', timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
      setPreview(null);
      fetchProfile();
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current.click();

  const getFotoUrl = () => {
    if (preview) return preview;
    if (!user || !user.foto) return null;
    if (user.foto.startsWith('http')) return user.foto;
    const cleanPath = user.foto.replace(/\\/g, '/');
    return `${BACKEND_URL}/${cleanPath}?v=${new Date().getTime()}`;
  };

  // ==========================================
  // --- LÓGICA MODAL PASSWORD ---
  // ==========================================

  const openModal = () => {
    setPassForm({ current: '', new: '', confirm: '' });
    setFormError('');
    setCapsLockOn(false);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handlePassChange = (e) => {
    setPassForm({ ...passForm, [e.target.name]: e.target.value });
    if (formError) setFormError('');
  };

  const toggleShowPass = (field) => {
    setShowPass({ ...showPass, [field]: !showPass[field] });
  };

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validaciones básicas
    if (!passForm.current || !passForm.new || !passForm.confirm) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    
    // Validar requisitos
    const allReqsMet = Object.values(requirements).every(Boolean);
    if (!allReqsMet) {
       setFormError('La nueva contraseña no cumple con los requisitos de seguridad.');
       return;
    }

    if (passForm.new !== passForm.confirm) {
      setFormError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsSubmittingPass(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/usuarios/cambiar-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ 
            passwordActual: passForm.current, 
            passwordNueva: passForm.new 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // --- MANEJO DE ERROR PERSONALIZADO ---
        // Si el backend dice "Usuario no encontrado" o cualquier otro error relacionado
        // con la autenticación de la contraseña vieja, mostramos el mensaje correcto.
        if (res.status === 404 || res.status === 400 || res.status === 401) {
            throw new Error('Contraseña actual incorrecta');
        }
        throw new Error(data.message || 'Error al cambiar la contraseña');
      }

      closeModal();
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Tu contraseña ha sido cambiada exitosamente.',
        icon: 'success',
        confirmButtonColor: '#0f172a' // Slate-900 para combinar
      });

    } catch (error) {
      setFormError(error.message); // Esto pone el mensaje rojo en la caja de arriba
    } finally {
      setIsSubmittingPass(false);
    }
  };

  const RequirementItem = ({ met, text }) => (
    <li className={`text-xs flex items-center gap-2 transition-colors duration-200 ${met ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
        {met ? <CheckCircle size={14} className="shrink-0" /> : <Circle size={14} className="shrink-0" />}
        {text}
    </li>
  );

  // --- RENDER ---
  if (!user) {
    return (
        <div className="flex justify-center items-center h-full p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
    );
  }

  const fotoSrc = getFotoUrl();

  return (
    <div className="p-6 bg-slate-50 min-h-screen flex justify-center items-start pt-10 relative">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-3xl border border-slate-100 z-10">
        
        <h1 className="text-3xl font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">
          Mi Perfil
        </h1>

        <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
          
          {/* FOTO */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden bg-slate-900 border-4 border-slate-900 shadow-2xl group">
              {fotoSrc ? (
                <img src={fotoSrc} alt="Foto de perfil" className={`w-full h-full object-cover transition-all duration-300 ${uploading ? 'opacity-50 grayscale' : 'opacity-100'}`} onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user.nombre_completo}&background=ea580c&color=fff`; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white bg-slate-800"><User size={80} strokeWidth={1.5} /></div>
              )}
              <button onClick={triggerFileInput} disabled={uploading} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                <Camera size={40} className="mb-2" /><span className="text-xs font-bold uppercase tracking-wider">Cambiar</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <button onClick={triggerFileInput} disabled={uploading} className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline disabled:opacity-50">{uploading ? 'Subiendo...' : 'Cambiar foto'}</button>
          </div>

          {/* DATOS */}
          <div className="flex-1 space-y-6 w-full">
            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Completo</label><div className="bg-slate-50 p-4 rounded-xl text-slate-700 font-bold text-lg border border-slate-200">{user.nombre_completo || user.nombre}</div></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label><div className="bg-slate-50 p-4 rounded-xl text-slate-700 font-medium border border-slate-200">{user.email || 'No registrado'}</div></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rol del Sistema</label><div className="bg-slate-50 p-4 rounded-xl text-slate-700 font-medium border border-slate-200 flex items-center gap-3"><span className={`inline-block w-3 h-3 rounded-full ${user.rol_nombre === 'ADMIN' ? 'bg-orange-500 shadow-lg shadow-orange-500/50' : 'bg-blue-500'}`}></span>{user.rol_nombre || 'USUARIO'}</div></div>

            <div className="pt-6">
              <button className="px-6 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors w-full md:w-auto shadow-sm active:scale-95" onClick={openModal}>
                 Cambiar contraseña
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                   Cambiar Contraseña
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmitPassword} className="p-6 space-y-5" onKeyDown={handleKeyDown} onKeyUp={handleKeyDown} onClick={handleKeyDown}>
                
                {/* ALERTA DE ERROR (Estilo Imagen) */}
                {formError && (
                    <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-pulse">
                        <AlertCircle size={18} className="shrink-0"/> <span>{formError}</span>
                    </div>
                )}

                {/* Contraseña Actual */}
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contraseña Actual</label>
                    <div className="relative group">
                        <input 
                            type={showPass.current ? "text" : "password"} 
                            name="current"
                            value={passForm.current}
                            onChange={handlePassChange}
                            className="w-full p-3 pr-10 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        />
                        <button type="button" onClick={() => toggleShowPass('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1">
                            {showPass.current ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                </div>

                <hr className="border-slate-100"/>

                {/* Nueva Contraseña */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nueva Contraseña</label>
                        {capsLockOn && (
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 flex items-center gap-1 animate-bounce">
                                <AlertCircle size={10}/> BLOQ MAYÚS
                            </span>
                        )}
                    </div>
                    
                    <div className="relative group">
                        <input 
                            type={showPass.new ? "text" : "password"} 
                            name="new"
                            value={passForm.new}
                            onChange={handlePassChange}
                            className="w-full p-3 pr-10 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        />
                        <button type="button" onClick={() => toggleShowPass('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1">
                            {showPass.new ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>

                    {/* CHECKLIST DE REQUISITOS (Estilo Imagen) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                        <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <RequirementItem met={requirements.length} text="Mínimo 8 caracteres" />
                            <RequirementItem met={requirements.uppercase} text="1 Mayúscula" />
                            <RequirementItem met={requirements.lowercase} text="1 Minúscula" />
                            <RequirementItem met={requirements.number} text="1 Número" />
                            <RequirementItem met={requirements.symbol} text="1 Símbolo (@$!%*?&)" />
                            <RequirementItem met={requirements.noSpecial} text="Sin espacios/ñ/tildes" />
                        </ul>
                    </div>
                </div>

                {/* Confirmar */}
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Confirmar Contraseña</label>
                    <div className="relative group">
                        <input 
                            type={showPass.confirm ? "text" : "password"} 
                            name="confirm"
                            value={passForm.confirm}
                            onChange={handlePassChange}
                            className={`w-full p-3 pr-10 border rounded-lg outline-none focus:ring-2 transition-all bg-white ${passForm.confirm && passForm.new !== passForm.confirm ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'}`}
                        />
                         <button type="button" onClick={() => toggleShowPass('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1">
                            {showPass.confirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                     {passForm.confirm && passForm.new !== passForm.confirm && (
                        <p className="text-xs text-red-500 font-bold mt-1 ml-1 flex items-center gap-1"><X size={12}/> Las contraseñas no coinciden</p>
                    )}
                </div>

                {/* Footer Botones */}
                <div className="flex gap-3 pt-3">
                    <button type="button" onClick={closeModal} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors" disabled={isSubmittingPass}>
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        // Botón oscuro como en la imagen
                        className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-95"
                        disabled={isSubmittingPass || !Object.values(requirements).every(Boolean) || passForm.new !== passForm.confirm || !passForm.current}
                    >
                        {isSubmittingPass ? (
                             <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Guardando...</>
                        ) : 'Actualizar Contraseña'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;