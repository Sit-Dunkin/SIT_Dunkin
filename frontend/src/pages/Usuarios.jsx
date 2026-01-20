import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Pencil, Trash2, Shield, Lock, CheckCircle, XCircle, X, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

const Usuarios = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null); // Nuevo estado para errores
    const [searchTerm, setSearchTerm] = useState('');

    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estado para mostrar/ocultar contraseña
    const [showPassword, setShowPassword] = useState(false);

    // Formulario Base
    const initialFormState = {
        id: null,
        nombre_completo: '',
        email: '',
        password: '', 
        rol_id: 2,
        estado: 'ACTIVO'
    };
    const [formData, setFormData] = useState(initialFormState);

    // --- LÓGICA DE VALIDACIÓN ---
    const password = formData.password;
    const validations = {
        minLength: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        noForbidden: !/[ \u00F1\u00D1\u00C0-\u00FF]/.test(password)
    };
    const isPasswordValid = Object.values(validations).every(Boolean);

    const shouldDisableSave = () => {
        if (!isEditing) return !password || !isPasswordValid;
        else return password.length > 0 && !isPasswordValid;
    };

    // --- CARGA DE DATOS ---
    const fetchUsers = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const token = localStorage.getItem('token');
            
            console.log("🔄 Solicitando usuarios al backend..."); // LOG PARA DEPURAR

            const res = await fetch('http://localhost:4000/api/usuarios', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al cargar usuarios');
            }

            const data = await res.json();
            console.log("✅ Datos recibidos del backend:", data); // ¡MIRA ESTO EN LA CONSOLA (F12)!

            // Aseguramos que sea un array
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("❌ Error fetch:", error);
            setErrorMsg(error.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- MANEJO DEL MODAL ---
    const openCreateModal = () => {
        setFormData(initialFormState);
        setShowPassword(false); 
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setFormData({
            id: user.id,
            nombre_completo: user.nombre_completo || '', // Evita fallos si es null
            email: user.email || '',
            password: '', 
            rol_id: user.rol_id,
            estado: user.estado || 'ACTIVO'
        });
        setShowPassword(false); 
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // --- GUARDAR ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (shouldDisableSave()) return Swal.fire('Contraseña Inválida', 'Requisitos no cumplidos', 'warning');

        const url = isEditing 
            ? `http://localhost:4000/api/usuarios/${formData.id}` 
            : 'http://localhost:4000/api/usuarios';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            Swal.fire({
                icon: 'success',
                title: isEditing ? 'Actualizado' : 'Creado',
                timer: 1500,
                showConfirmButton: false
            });
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    // --- ELIMINAR ---
    const handleDelete = (id) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`http://localhost:4000/api/usuarios/${id}`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if(!res.ok) throw new Error('Error al eliminar');
                    
                    Swal.fire('Eliminado', 'Usuario borrado.', 'success');
                    fetchUsers();
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                }
            }
        });
    };

    // --- FILTRO BLINDADO (NO SE ROMPE CON NULOS) ---
    const filteredUsers = users.filter(u => {
        const nombre = (u.nombre_completo || '').toLowerCase(); // Si es null, usa cadena vacía
        const email = (u.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return nombre.includes(search) || email.includes(search);
    });

    const ValidationItem = ({ valid, text }) => (
        <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${valid ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
            {valid ? <CheckCircle size={14} className="text-green-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="space-y-6 relative p-6 animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestión de Empleados</h1>
                    <p className="text-slate-500 text-sm">Administra los accesos y roles del sistema.</p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg shadow-md font-medium transition-colors">
                    <Plus size={18} /> <span>Nuevo Usuario</span>
                </button>
            </div>

            {/* Buscador */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar por nombre o correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"/>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">NOMBRE COMPLETO</th>
                                <th className="px-6 py-4">EMAIL</th>
                                <th className="px-6 py-4">ROL</th>
                                <th className="px-6 py-4">ESTADO</th>
                                <th className="px-6 py-4 text-right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-slate-500">Cargando usuarios...</td></tr>
                            ) : errorMsg ? (
                                <tr><td colSpan="5" className="text-center py-8 text-red-500 font-bold">Error: {errorMsg}</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-slate-500">No se encontraron usuarios.</td></tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{user.nombre || user.nombre_completo || 'Sin Nombre'}</td>
                                        <td className="px-6 py-4 text-slate-500">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                                (user.rol_nombre === 'ADMIN' || user.rol_id === 1) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {user.rol_nombre || (user.rol_id === 1 ? 'ADMIN' : 'AUXILIAR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                                                user.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {user.estado === 'ACTIVO' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                                {user.estado || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"><Pencil size={16} /></button>
                                                {user.id !== 1 ? (
                                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"><Trash2 size={16} /></button>
                                                ) : (
                                                    <span className="p-2 text-gray-300 border border-gray-100 rounded-lg"><Lock size={16}/></span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                            <h2 className="text-slate-800 font-bold text-lg">{isEditing ? 'Editar Empleado' : 'Crear Usuario'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input type="text" required value={formData.nombre_completo} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-slate-700">{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
                                    {formData.password.length > 0 && <span className={`text-xs font-bold ${isPasswordValid ? 'text-green-600' : 'text-red-500'}`}>{isPasswordValid ? 'Segura' : 'Insegura'}</span>}
                                </div>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} required={!isEditing} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={`w-full p-2.5 pr-10 border rounded-lg outline-none focus:ring-2 transition-colors ${formData.password.length > 0 ? (isPasswordValid ? 'border-green-300 focus:ring-green-200 bg-green-50' : 'border-red-300 focus:ring-red-200 bg-red-50') : 'border-slate-300 focus:ring-orange-500'}`} placeholder={isEditing ? "Dejar vacío para mantener" : "********"}/>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Eye size={18} /></button>
                                </div>
                                {(!isEditing || formData.password.length > 0) && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                                        <ValidationItem valid={validations.minLength} text="8+ Caracteres" />
                                        <ValidationItem valid={validations.hasUpper} text="1 Mayúscula" />
                                        <ValidationItem valid={validations.hasLower} text="1 Minúscula" />
                                        <ValidationItem valid={validations.hasNumber} text="1 Número" />
                                        <ValidationItem valid={validations.hasSpecial} text="1 Símbolo" />
                                        <ValidationItem valid={validations.noForbidden} text="Sin espacios" />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                    <select value={formData.rol_id} disabled={formData.id === 1} onChange={(e) => setFormData({...formData, rol_id: Number(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                                        <option value={1}>ADMIN</option>
                                        <option value={2}>AUXILIAR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                    <select value={formData.estado} disabled={formData.id === 1} onChange={(e) => setFormData({...formData, estado: e.target.value})} className={`w-full p-2.5 border rounded-lg bg-white font-bold ${formData.estado === 'ACTIVO' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                                        <option value="ACTIVO">ACTIVO</option>
                                        <option value="INACTIVO">INACTIVO</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg bg-gray-100">Cancelar</button>
                                <button type="submit" disabled={shouldDisableSave()} className={`px-6 py-2 rounded-lg shadow-md font-medium text-white ${shouldDisableSave() ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>{isEditing ? 'Guardar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Usuarios;