import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Key, CheckCircle, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'; // Importamos iconos del ojo
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
      const res = await fetch('http://localhost:4000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        Swal.fire('Código Enviado', `Revisa tu bandeja de entrada en ${email}`, 'success');
        setStep(2);
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Verificar Código
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await fetch('http://localhost:4000/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();

        if (res.ok) {
            setStep(3);
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de verificación', 'error');
    } finally {
        setLoading(false);
    }
  };

  // PASO 3: Cambiar Contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validación final antes de enviar
    if (!passwordsMatch) {
        return Swal.fire('Error', 'Las contraseñas no coinciden', 'warning');
    }
    if (password.length < 6) {
        return Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres', 'warning');
    }

    setLoading(true);
    try {
        const res = await fetch('http://localhost:4000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword: password })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire('¡Éxito!', 'Tu contraseña ha sido restablecida. Inicia sesión.', 'success');
            navigate('/login');
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo restablecer la contraseña', 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* ENCABEZADO */}
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                {step === 1 && <Mail size={32} />}
                {step === 2 && <Key size={32} />}
                {step === 3 && <Lock size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Recuperar Acceso</h2>
            <p className="text-slate-500 text-sm">Paso {step} de 3</p>
        </div>

        {/* --- PASO 1: PEDIR CORREO --- */}
        {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
                <p className="text-sm text-slate-600 text-center mb-4">
                    Ingresa tu correo corporativo. Te enviaremos un código de verificación si estás registrado.
                </p>
                <input 
                    type="email" 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="usuario@dunkin.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                <button disabled={loading} className="w-full bg-orange-600 text-white p-3 rounded-xl font-bold hover:bg-orange-700 transition">
                    {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
            </form>
        )}

        {/* --- PASO 2: PEDIR CÓDIGO --- */}
        {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-sm text-slate-600 text-center mb-4">
                    Hemos enviado un código a <strong>{email}</strong>. Ingrésalo abajo:
                </p>
                <input 
                    type="text" 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-center text-2xl tracking-widest font-bold uppercase"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                />
                <button disabled={loading} className="w-full bg-orange-600 text-white p-3 rounded-xl font-bold hover:bg-orange-700 transition">
                    {loading ? 'Verificando...' : 'Verificar Código'}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-slate-500 text-sm hover:underline">
                    ¿No llegó? Intentar con otro correo
                </button>
            </form>
        )}

        {/* --- PASO 3: NUEVA CONTRASEÑA (CON OJITOS Y VALIDACIÓN) --- */}
        {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-slate-600 text-center mb-4">
                    Código verificado. Crea tu nueva contraseña segura.
                </p>
                
                {/* Nueva Contraseña */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nueva Contraseña</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none pr-10"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Contraseña</label>
                    <div className="relative">
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            className={`w-full p-3 border rounded-xl outline-none pr-10 transition-all ${
                                passwordsMismatch 
                                    ? 'border-red-500 ring-1 ring-red-200' 
                                    : passwordsMatch 
                                        ? 'border-green-500 ring-1 ring-green-200' 
                                        : 'focus:ring-2 focus:ring-orange-500'
                            }`}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Mensajes de Alerta */}
                    {passwordsMismatch && (
                        <p className="text-red-500 text-xs mt-1 font-bold animate-in fade-in">
                            Las contraseñas no coinciden.
                        </p>
                    )}
                    {passwordsMatch && (
                        <p className="text-green-600 text-xs mt-1 font-bold animate-in fade-in flex items-center gap-1">
                            <CheckCircle size={12}/> ¡Las contraseñas coinciden!
                        </p>
                    )}
                </div>

                <button 
                    disabled={!passwordsMatch || loading} 
                    className={`w-full p-3 rounded-xl font-bold transition-all ${
                        passwordsMatch 
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                </button>
            </form>
        )}

        <div className="mt-6 text-center">
            <Link to="/login" className="text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Volver al Login
            </Link>
        </div>

      </div>
    </div>
  );
};

export default RecuperarPassword;