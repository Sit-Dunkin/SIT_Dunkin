import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Monitor, ArrowRightLeft, FileText, Users, LogOut, Activity, Mail, History, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import Swal from 'sweetalert2'; 
import logo from '../assets/logo_sit.jpg'; 

// Definimos la URL del backend
const BACKEND_URL = 'https://sit-dunkin-backend.onrender.com';

const Sidebar = () => {
  const location = useLocation();
  
  // Traemos datos del usuario y la función de salir
  const { handleLogout, user } = useAuth(); 

  // 1. OBTENER ROL (Si no hay, asumimos el permiso más bajo: AUXILIAR)
  const userRole = user?.rol_nombre || 'AUXILIAR';

  // 2. DEFINIR MENÚ CON PERMISOS
  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Stock Sistemas', 
      path: '/sistemas', 
      icon: <Monitor size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Equipos Salida', 
      path: '/puntos', 
      icon: <ArrowRightLeft size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Trazabilidad (Antiguos)', 
      path: '/historial', 
      icon: <History size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Actas Generadas', 
      path: '/actas', 
      icon: <FileText size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Control de Correos', 
      path: '/correos-pv', 
      icon: <Mail size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Empleados', 
      path: '/usuarios', 
      icon: <Users size={20} />, 
      allowed: ['ADMIN'] // 🔒 SOLO ADMIN
    },
    { 
      title: 'Métricas y Gráficas', 
      path: '/metricas', 
      icon: <Activity size={20} />, 
      allowed: ['ADMIN', 'AUXILIAR'] 
    },
    { 
      title: 'Log del Sistema', 
      path: '/auditoria-sistema', 
      icon: <ShieldAlert size={20} />, 
      allowed: ['ADMIN'] // 🔒 SOLO ADMIN
    },
  ];

  // --- LÓGICA INTELIGENTE DE FOTO ---
  const getFotoPerfil = () => {
    if (!user || !user.foto) {
        return `https://ui-avatars.com/api/?name=${user?.nombre || 'User'}&background=ea580c&color=fff`;
    }
    if (user.foto.startsWith('http')) {
        return user.foto;
    }
    const cleanPath = user.foto.replace(/\\/g, '/');
    return `${BACKEND_URL}/${cleanPath}?v=${new Date().getTime()}`;
  };

  const confirmarSalida = () => {
    Swal.fire({
      title: '¿Cerrar Sesión?',
      text: "¿Estás seguro que deseas salir del sistema?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      background: '#fff',
      color: '#1e293b'
    }).then((result) => {
      if (result.isConfirmed) {
        handleLogout(); 
        const Toast = Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000, 
            timerProgressBar: true 
        });
        Toast.fire({ icon: 'success', title: 'Sesión cerrada correctamente' });
      }
    });
  };

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 shadow-2xl z-50">
      
      {/* CABECERA */}
      <div className="flex flex-col gap-6 py-8 bg-slate-950 border-b border-slate-800">
        
        {/* LOGO CON LINK AL HOME */}
        <Link to="/" className="flex items-center justify-center gap-4 px-2 hover:opacity-90 transition-opacity cursor-pointer group" title="Ir al Inicio">
            <img src={logo} alt="Logo SIT" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-xl shadow-orange-900/30 group-hover:scale-105 transition-transform" />
            <h1 className="text-4xl font-extrabold tracking-widest text-orange-500 drop-shadow-lg group-hover:text-orange-400 transition-colors">SIT</h1>
        </Link>

        {/* ==========================================================
            TARJETA DE USUARIO (AHORA ES UN LINK AL PERFIL) 
            ========================================================== */}
        <div className="px-4">
            <Link 
                to="/perfil" 
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-inner hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer group/user active:scale-95"
                title="Ver mi perfil"
            >
                {/* FOTO DE PERFIL */}
                <div className="h-10 w-10 min-w-[40px] rounded-full overflow-hidden bg-slate-800 shadow-sm border border-transparent group-hover/user:border-orange-500 transition-colors">
                    <img 
                        src={getFotoPerfil()} 
                        alt="Perfil" 
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user?.nombre || 'User'}&background=333&color=fff`; }}
                    />
                </div>

                <div className="flex flex-col items-start justify-center overflow-hidden">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Bienvenido</span>
                    <span className="font-bold text-white text-sm truncate w-full group-hover/user:text-orange-400 transition-colors" title={user?.nombre}>
                        {user?.nombre || 'Usuario'} 
                    </span>
                </div>
            </Link>
        </div>
      </div>

      {/* --- NAVEGACIÓN FILTRADA --- */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems
          .filter(item => item.allowed.includes(userRole)) 
          .map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-orange-400'}>
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.title}</span>
              </Link>
            );
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <button onClick={confirmarSalida} className="flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all w-full px-4 py-3 rounded-xl text-sm font-medium group">
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;