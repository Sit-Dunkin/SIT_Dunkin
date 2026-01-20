import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* =================================================
          1. SIDEBAR (RESPONSIVO)
         ================================================= */}
      
      {/* FONDO OSCURO (Solo en celular cuando abres menú) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* BARRA LATERAL */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white shadow-2xl transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:static md:shadow-none shrink-0
        `}
      >
        {/* Botón cerrar menú (Solo visible en Celular dentro del sidebar) */}
        <div className="absolute top-4 right-4 md:hidden">
            <button onClick={() => setIsSidebarOpen(false)} className="text-white/70 hover:text-white p-1">
                <X size={24} />
            </button>
        </div>
        
        <Sidebar />
      </aside>

      {/* =================================================
          2. ÁREA DE CONTENIDO (DERECHA)
         ================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/*  HEADER MÓVIL CORREGIDO (ICONO A LA IZQUIERDA) */}
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
            
            {/* 1. EL BOTÓN AHORA VA PRIMERO */}
            <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg active:scale-95 transition-all"
            >
                <Menu size={24} />
            </button>

            {/* 2. EL TÍTULO VA DESPUÉS */}
            <span className="font-bold text-slate-800 text-lg">SIT Inventario</span>
            
        </div>

        {/* HEADER DESKTOP */}
        <div className="hidden md:block">
            <Header />
        </div>
        
        {/* MAIN */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8 scroll-smooth">
           <div className="w-full max-w-[1600px] mx-auto">
              {children}
           </div>
        </main>
        
      </div>
    </div>
  );
};

export default Layout;