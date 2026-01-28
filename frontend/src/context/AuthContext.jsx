import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 1. Inicializamos token y user leyendo del localStorage para persistencia
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    
    // Intentamos leer el usuario guardado, si no existe, es null
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // ⏱️ CONFIGURACIÓN DEL TIEMPO DE INACTIVIDAD (AFK)
    // 15 Minutos = 900,000 milisegundos (15 * 60 * 1000)
    const TIEMPO_INACTIVIDAD = 15 * 60 * 1000; 

    // --- EFECTO 1: VERIFICAR TOKEN AL INICIAR ---
    useEffect(() => {
        const verifyToken = () => {
            setLoading(true);
            if (token) {
                try {
                    // Decodificamos el payload para verificar expiración
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    
                    // Verificar si el token expiró
                    const currentTime = Date.now() / 1000;
                    if (payload.exp < currentTime) {
                        throw new Error("Token expirado");
                    }

                    // 🚩 Si el token es válido:
                    setIsAuthenticated(true);
                    
                    // Si no tenemos usuario en estado (por ejemplo, primer carga),
                    // usamos el payload del token como respaldo o lo que esté en localStorage.
                    if (!user) {
                        setUser(payload);
                    }

                } catch (error) {
                    console.error("Token inválido o expirado. Limpiando sesión.", error);
                    // Limpieza local silenciosa
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } else {
                // Si no hay token, no estamos autenticados
                setIsAuthenticated(false);
                setUser(null);
            }
            setLoading(false);
        }

        verifyToken();
    }, [token]); // Dependencia: solo se ejecuta si cambia el token (o al inicio)

    // --- LOGIN ---
    const handleLogin = async (email, password) => {
        try {
            const res = await fetch('https://sit-dunkin-backend.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error de credenciales.');
            }

            // 1. Guardamos Token
            localStorage.setItem('token', data.token);
            setToken(data.token);
            
            // 2. Guardamos Datos de Usuario
            const userData = data.user || JSON.parse(atob(data.token.split('.')[1]));
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            setIsAuthenticated(true);
            navigate('/'); 

        } catch (error) {
            throw new Error(error.message);
        }
    };

    // --- LOGOUT (CON CALLBACK PARA USAR EN EFECTOS) ---
    const handleLogout = useCallback(async () => {
        try {
            // Intentamos notificar al backend
            if (token) {
                await fetch('https://sit-dunkin-backend.onrender.com/api/auth/logout', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                });
            }
        } catch (error) {
            console.warn("No se pudo notificar el logout al servidor, cerrando localmente.");
        } finally {
            // Siempre limpiamos la sesión local
            localStorage.removeItem('token');
            localStorage.removeItem('user'); 
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            navigate('/login');
        }
    }, [token, navigate]); // Dependencias del useCallback

    // --- EFECTO 2: DETECTOR DE INACTIVIDAD (AFK) ---
    useEffect(() => {
        // Solo activamos el timer si el usuario está logueado
        if (!user || !isAuthenticated) return;

        let timeoutId;

        // Función para reiniciar el reloj
        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log("⏰ Tiempo de inactividad cumplido. Cerrando sesión por seguridad...");
                handleLogout(); // Llamamos al logout automáticamente
            }, TIEMPO_INACTIVIDAD);
        };

        // Eventos que reinician el contador
        const eventosActividad = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Escuchar eventos
        eventosActividad.forEach(evento => {
            window.addEventListener(evento, resetTimer);
        });

        // Iniciar timer
        resetTimer();

        // Limpieza al desmontar
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            eventosActividad.forEach(evento => {
                window.removeEventListener(evento, resetTimer);
            });
        };
    }, [user, isAuthenticated, handleLogout, TIEMPO_INACTIVIDAD]);

    // --- ACTUALIZAR PERFIL ---
    const updateUserProfile = (newFotoUrl) => {
        setUser((prevUser) => {
            if (!prevUser) return null;
            const updatedUser = { ...prevUser, foto: newFotoUrl };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            isAuthenticated, 
            loading, 
            handleLogin, 
            handleLogout,
            updateUserProfile 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);