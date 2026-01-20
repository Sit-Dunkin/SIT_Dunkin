import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* <--- 2. Envuelve TODO, incluido AuthProvider */}
      <AuthProvider> {/* <--- 3. AuthProvider puede usar hooks de navegación */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);