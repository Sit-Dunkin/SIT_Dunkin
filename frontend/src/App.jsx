import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import RecuperarPassword from './pages/RecuperarPassword'; 

// Importar Páginas
import Dashboard from './pages/Dashboard';
import StockSistemas from './pages/StockSistemas';
import Metricas from './pages/Metricas';
import CorreosPV from './pages/CorreosPV';
import EquiposSalida from './pages/EquiposSalida';
import Usuarios from './pages/Usuarios';
import AuditoriaSistema from './pages/AuditoriaSistema';     
import AuditoriaMovimientos from './pages/AuditoriaMovimientos'; 
import Actas from './pages/Actas';
import HistorialEquipos from './pages/HistorialEquipos';
import Perfil from './pages/Perfil'; 

// =======================================================
// 1. WRAPPER PARA RUTAS PRIVADAS (Si no hay login -> Login)
// =======================================================
const LayoutWrapper = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-600 font-semibold flex-col gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <p>Cargando Sistema...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Layout>
            <Outlet />
        </Layout>
    );
};

// =======================================================
// 2. WRAPPER PARA RUTAS PÚBLICAS (Si hay login -> Dashboard)
// =======================================================
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return null;

    // Si el usuario YA está autenticado, no lo dejamos ver el Login ni Recuperar,
    // lo mandamos directo al Dashboard (/)
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// =======================================================
// 3. COMPONENTE: PROTECCIÓN POR ROLES (RBAC) 
// =======================================================
const RoleRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return null; 

    // Si no hay usuario o su rol no está en la lista permitida...
    // Lo mandamos al Dashboard (/) para que no entre donde no debe.
    if (!user || !allowedRoles.includes(user.rol_nombre)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
  return (
    <Routes>
      
      {/*  RUTAS PÚBLICAS (Login y Recuperar Contraseña)  */}
      <Route 
        path="/login" 
        element={
            <PublicRoute>
                <Login />
            </PublicRoute>
        } 
      />

      <Route 
        path="/recuperar" 
        element={
            <PublicRoute>
                <RecuperarPassword />
            </PublicRoute>
        } 
      />
      
      {/* --- RUTAS PROTEGIDAS (LayoutWrapper) --- */}
      <Route element={<LayoutWrapper />}>
        
        {/* VISTAS COMUNES (ADMIN Y AUXILIAR) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/metricas" element={<Metricas />} />
        <Route path="/correos-pv" element={<CorreosPV />} />
        <Route path="/sistemas" element={<StockSistemas />} />
        <Route path="/puntos" element={<EquiposSalida />} />
        <Route path="/historial" element={<HistorialEquipos />} />
        <Route path="/actas" element={<Actas />} />
        <Route path="/perfil" element={<Perfil />} />
        
        {/* VISTAS EXCLUSIVAS DE ADMIN  */}
        <Route 
            path="/usuarios" 
            element={
                <RoleRoute allowedRoles={['ADMIN']}>
                    <Usuarios />
                </RoleRoute>
            } 
        />
        <Route 
            path="/auditoria-sistema" 
            element={
                <RoleRoute allowedRoles={['ADMIN']}>
                    <AuditoriaSistema />
                </RoleRoute>
            } 
        />
        <Route 
            path="/auditoria-movimientos" 
            element={
                <RoleRoute allowedRoles={['ADMIN']}>
                    <AuditoriaMovimientos />
                </RoleRoute>
            } 
        />

      </Route>
      
      {/* Fallback: Cualquier ruta desconocida manda al login (o al dashboard si ya estás logueado) */}
      <Route path="*" element={<Navigate to="/login" replace />} /> 
    </Routes>
  );
}

export default App;