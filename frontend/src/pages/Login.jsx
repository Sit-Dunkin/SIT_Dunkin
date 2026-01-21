import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertTriangle, Eye, EyeOff, ArrowUpCircle } from 'lucide-react'; // Agregamos ArrowUpCircle para el ícono de Mayús
import logo from '../assets/logo_sit.jpg'; 

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); 
    
    // Estado para Mayúsculas
    const [capsLockOn, setCapsLockOn] = useState(false);

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { handleLogin } = useAuth();
    const navigate = useNavigate();

    // Función para detectar Bloq Mayús
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
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
                
                {/* --- LOGO Y TÍTULO --- */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20 border-2 border-slate-800 overflow-hidden p-1 mb-4">
                    <img
                    src={logo} // Aquí usas la variable que importaste arriba
                    alt="SIT Logo"
                    className="w-full h-full object-cover rounded-xl"
                    />                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Bienvenido al <span className="text-orange-600">SIT</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Inicia sesión con tu cuenta Dunkin'</p>
                </div>

                {/* --- MENSAJE DE ERROR DE LOGIN --- */}
                {error && (
                    <div className="p-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-pulse">
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
                                // AGREGAMOS LOS EVENTOS AQUÍ
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

                        {/* MENSAJE DE BLOQ MAYÚS ACTIVADO */}
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
                                : 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-900/20 active:scale-[0.98]'
                        }`}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <><LogIn size={20} /> Entrar al Sistema</>
                        )}
                    </button>
                </form>
                
                <div className="text-center text-xs font-semibold text-slate-400 mt-6 tracking-wide">
                    SIT - Sistema de Inventario Tecnológico v1.0
                </div>
            </div>
        </div>
    );
};

export default Login;