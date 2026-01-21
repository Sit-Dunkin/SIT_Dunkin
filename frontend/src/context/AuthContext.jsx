import React, { createContext, useState, useContext, useEffect } from 'react';
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

    // --- EFECTO: VERIFICAR TOKEN AL INICIAR ---
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
                    // No llamamos a handleLogout aquí para evitar bucles infinitos si el backend falla,
                    // solo limpiamos localmente.
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
    }, [token]);

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
            
            // 2. Guardamos Datos de Usuario (Importante para la foto y nombre)
            const userData = data.user || JSON.parse(atob(data.token.split('.')[1]));
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            setIsAuthenticated(true);
            navigate('/'); 

        } catch (error) {
            throw new Error(error.message);
        }
    };

    // --- LOGOUT (CORREGIDO PARA REGISTRAR EN BD) ---
    const handleLogout = async () => {
        try {
            // Intentamos notificar al backend para que guarde el registro en auditoría
            if (token) {
                await fetch('https://sit-dunkin-backend.onrender.com/api/auth/logout', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                });
            }
        } catch (error) {
            console.warn("No se pudo notificar el logout al servidor (posible error de red), pero se cerrará sesión localmente.");
        } finally {
            // Siempre limpiamos la sesión local, haya o no respuesta del servidor
            localStorage.removeItem('token');
            localStorage.removeItem('user'); 
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            navigate('/login');
        }
    };

    // --- ACTUALIZAR PERFIL EN VIVO ---
    const updateUserProfile = (newFotoUrl) => {
        setUser((prevUser) => {
            if (!prevUser) return null;

            // Creamos el nuevo objeto usuario con la foto actualizada
            const updatedUser = { ...prevUser, foto: newFotoUrl };
            
            // Lo guardamos en localStorage para que no se pierda al recargar (F5)
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