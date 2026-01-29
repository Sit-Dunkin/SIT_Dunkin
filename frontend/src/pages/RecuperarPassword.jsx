import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'; 
import Swal from 'sweetalert2';

const RecuperarPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Código, 3: Nueva Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  
  // Estados para contraseñas
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados para visibilidad (ojito)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- LÓGICA DE COINCIDENCIA ---
  const passwordsMatch = password === confirmPassword && password !== '';
  const passwordsMismatch = confirmPassword !== '' && password !== confirmPassword;

  // PASO 1: Enviar Correo
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('https://sit-dunkin-backend.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        Swal.fire({
            icon: 'success',
            title: 'Código Enviado',
            text: `Revisa tu bandeja de entrada en ${email}`,
            confirmButtonColor: '#F97316' // Orange-500
        });
        setStep(2);
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Verificar Código
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await fetch('https://sit-dunkin-backend.onrender.com/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();

        if (res.ok) {
            setStep(3);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de verificación' });
    } finally {
        setLoading(false);
    }
  };

  // PASO 3: Cambiar Contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validación final antes de enviar
    if (!passwordsMatch) {
        return Swal.fire({ icon: 'warning', title: 'Atención', text: 'Las contraseñas no coinciden' });
    }
    if (password.length < 6) {
        return Swal.fire({ icon: 'warning', title: 'Seguridad', text: 'La contraseña debe tener al menos 6 caracteres' });
    }

    setLoading(true);
    try {
        const res = await fetch('https://sit-dunkin-backend.onrender.com/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword: password })
        });
        const data = await res.json();

        if (res.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Tu contraseña ha sido restablecida.',
                confirmButtonColor: '#16A34A' // Green-600
            });
            navigate('/login');
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo restablecer la contraseña' });
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERIZADO DE PASOS ---
  const renderStepContent = () => {
    switch (step) {
        case 1:
            return (
                <form onSubmit={handleSendCode} className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in">
                            <Mail size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Recuperar Acceso</h2>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">Paso 1 de 3</p>
                        <p className="text-slate-500 text-sm mt-3 px-4">
                            Ingresa tu correo corporativo. Te enviaremos un código de verificación.
                        </p>
                    </div>

                    <div>
                        <input 
                            type="email" 
                            className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-slate-50 font-medium placeholder-slate-400"
                            placeholder="usuario@dunkin.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    
                    <button 
                        disabled={loading} 
                        className="w-full p-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-900/10 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Enviar Código'}
                    </button>
                </form>
            );

        case 2:
            return (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in">
                            <ShieldCheck size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Verificar Código</h2>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Paso 2 de 3</p>
                        <p className="text-slate-500 text-sm mt-3">
                            Hemos enviado un código a <strong>{email}</strong>.
                        </p>
                    </div>

                    <div>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-3xl tracking-[0.5em] font-mono font-bold uppercase bg-slate-50 placeholder-slate-300 transition-all"
                            placeholder="______"
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <button 
                        disabled={loading} 
                        className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Verificar Código'}
                    </button>

                    <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 text-xs hover:text-slate-600 hover:underline transition-colors">
                        ¿No llegó? Corregir correo
                    </button>
                </form>
            );

        case 3:
            return (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in">
                            <Key size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Nueva Contraseña</h2>
                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-1">Paso 3 de 3</p>
                        <p className="text-slate-500 text-sm mt-3">
                            Crea una contraseña segura.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Nueva Contraseña */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nueva Contraseña</label>
                            <div className="relative mt-1">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none pr-10 bg-slate-50 font-medium transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 focus:outline-none transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Confirmar Contraseña</label>
                            <div className="relative mt-1">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    className={`w-full p-3 border rounded-xl outline-none pr-10 transition-all bg-slate-50 font-medium ${
                                        passwordsMismatch 
                                            ? 'border-red-500 ring-1 ring-red-200 focus:border-red-500 focus:ring-red-200' 
                                            : passwordsMatch 
                                                ? 'border-green-500 ring-1 ring-green-200 focus:border-green-500 focus:ring-green-200' 
                                                : 'border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                                    }`}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 focus:outline-none transition-colors p-1"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {/* Mensajes de Validación */}
                            {passwordsMismatch && (
                                <p className="text-red-500 text-xs mt-1.5 font-bold animate-in fade-in flex items-center gap-1">
                                    Las contraseñas no coinciden.
                                </p>
                            )}
                            {passwordsMatch && (
                                <p className="text-green-600 text-xs mt-1.5 font-bold animate-in fade-in flex items-center gap-1">
                                    <CheckCircle size={14}/> ¡Coinciden!
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        disabled={!passwordsMatch || loading} 
                        className={`w-full p-3.5 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 ${
                            passwordsMatch 
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/10 hover:scale-[1.02] active:scale-[0.98]' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Restablecer Contraseña'}
                    </button>
                </form>
            );
        default: return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 overflow-hidden relative">
        
        {/* 1. ANIMACIÓN DE FONDO */}
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
        
        {/* 2. CAPA FONDO */}
        <div className="animated-bg"></div>

        {/* 3. TARJETA PRINCIPAL */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500 border border-white/20 overflow-hidden relative">
            
            {/* Barra de Progreso Superior */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${
                        step === 1 ? 'w-1/3 bg-orange-500' : 
                        step === 2 ? 'w-2/3 bg-blue-500' : 
                        'w-full bg-green-500'
                    }`}
                ></div>
            </div>

            <div className="p-8 pt-10">
                {renderStepContent()}

                <div className="mt-8 text-center pt-6 border-t border-slate-100">
                    <Link to="/login" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors gap-2 hover:underline">
                        <ArrowLeft size={16} /> Volver al Login
                    </Link>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RecuperarPassword;