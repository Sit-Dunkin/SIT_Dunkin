import React from 'react';
import { Link } from 'react-router-dom'; 
import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = 'https://sit-dunkin-backend.onrender.com';

const Header = () => {
  const { user } = useAuth();

  const getFotoPerfil = () => {
    if (!user || !user.foto) return null;
    if (user.foto.startsWith('http')) return user.foto;
    const cleanPath = user.foto.replace(/\\/g, '/');
    return `${BACKEND_URL}/${cleanPath}?v=${new Date().getTime()}`;
  };

  const fotoSrc = getFotoPerfil();

  return (
    // CAMBIO AQUÍ: Cambié 'z-10' por 'z-40' para asegurar que el clic funcione
    <header className="bg-white h-16 shadow-sm border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-40">
      
      <h2 className="text-lg font-bold text-slate-700 tracking-wide">
        Gestión de Inventario SIT
      </h2>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-500 hidden md:block">
        </span>

        {/* Botón de Perfil */}
        <Link 
          to="/perfil" 
          className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all cursor-pointer overflow-hidden bg-slate-100 relative"
          title="Ir a mi Perfil"
        >
          {fotoSrc ? (
            <img 
              src={fotoSrc} 
              alt="Perfil" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <User size={20} className="text-slate-400" />
          )}
          
          {!fotoSrc && <User size={20} className="text-slate-400 absolute" />}
        </Link>
      </div>

    </header>
  );
};

export default Header;