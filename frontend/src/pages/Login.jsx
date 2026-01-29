import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertTriangle, Eye, EyeOff, ArrowUpCircle } from 'lucide-react'; 
import logo from '../assets/logo_sit.jpg'; 

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); 
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { handleLogin } = useAuth();
    const navigate = useNavigate();

    const checkCapsLock = (e) => {
        if (e.getModifierState('CapsLock')) {
            setCapsLockOn(true);
        } else {
            setCapsLockOn(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await handleLogin(email, password);
        } catch (err) {
            setError(err.message || "Error de conexión o credenciales incorrectas.");
        } finally {
            setLoading(false);
        }
    };

    return (
        /* --- CONTENEDOR PRINCIPAL CON ANIMACIÓN ---
           Usamos un fondo con tamaño 400% y una animación CSS que mueve la posición.
           Colores: Slate-900 (Base), Violet-900 (Toque moderno), Orange-900 (Toque Dunkin muy oscuro)
        */
        <div className="flex items-center justify-center min-h-screen p-4 overflow-hidden relative">
            
            {/* 1. Estilos de la Animación (CSS Puro para rendimiento óptimo) */}
            <style>{`
                @keyframes gradient-move {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animated-bg {
                    background: linear-gradient(-45deg, #0f172a, #1e1b4b, #312e81, #431407);
                    background-size: 400% 400%;
                    animation: gradient-move 15s ease infinite;
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: -1;
                }
            `}</style>
            
            {/* 2. Capa de Fondo Animada */}
            <div className="animated-bg"></div>

            {/* 3. Tarjeta de Login */}
            <div className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500 border border-white/20">
                
                {/* --- LOGO Y TÍTULO --- */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden p-2 mb-4 transform hover:scale-105 transition-transform duration-300">
                        <img
                            src={logo} 
                            alt="SIT Logo"
                            className="w-full h-full object-contain rounded-xl"
                        />
                    </div>
                    
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight text-center">
                        Bienvenido al <span className="text-orange-600">SIT</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-2 text-center">
                        Sistema de Inventario Tecnológico<br/>
                        <span className="text-xs text-slate-400">Donuts de Antioquia</span>
                    </p>
                </div>

                {/* --- MENSAJE DE ERROR --- */}
                {error && (
                    <div className="p-3 text-sm font-medium text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3 animate-pulse">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {/* --- FORMULARIO --- */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@dunkin.com"
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-slate-50 font-medium placeholder-slate-400"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={checkCapsLock}
                                onKeyUp={checkCapsLock}
                                onClick={checkCapsLock}
                                onFocus={checkCapsLock}
                                placeholder="********"
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all pr-10 bg-slate-50 font-medium placeholder-slate-400" 
                                required
                            />
                            <button
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-orange-600 focus:outline-none transition-colors p-1"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {capsLockOn && (
                            <div className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1 animate-pulse">
                                <ArrowUpCircle size={14} />
                                <span>¡Bloq Mayús está activado!</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Link 
                            to="/recuperar" 
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-all"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full p-3.5 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/10 ${
                            loading 
                                ? 'bg-slate-400 cursor-not-allowed' 
                                : 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-900/20 active:scale-[0.98] transform hover:-translate-y-0.5'
                        }`}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <><LogIn size={20} /> Iniciar Sesión</>
                        )}
                    </button>
                </form>
                
                <div className="text-center pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 tracking-wide">
                        &copy; 2026 Donuts de Antioquia - TI Department
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;