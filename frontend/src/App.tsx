import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { ProfileGuard } from './components/layout/ProfileGuard.js';
import Hoy from './pages/Hoy.js';
import Recetas from './pages/Recetas.js';
import Semana from './pages/Semana.js';
import MisGrupos from './pages/MisGrupos.js';
import Progreso from './pages/Progreso.js';
import MiPerfil from './pages/MiPerfil.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Onboarding from './pages/Onboarding.js';

/**
 * Layout con sidebar — solo para rutas que requieren perfil completo.
 * ProfileGuard verifica que el onboarding haya sido completado.
 */
function AppLayout() {
  return (
    <ProfileGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/hoy" element={<Hoy />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/semana" element={<Semana />} />
            <Route path="/mis-grupos" element={<MisGrupos />} />
            <Route path="/progreso" element={<Progreso />} />
            <Route path="/mi-perfil" element={<MiPerfil />} />
            {/* Raíz redirige a /hoy */}
            <Route path="/" element={<Navigate to="/hoy" replace />} />
            <Route path="*" element={<Navigate to="/hoy" replace />} />
          </Routes>
        </main>
      </div>
    </ProfileGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding: protegida por auth, pero NO requiere perfil completo */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Resto de rutas: protegidas por auth + perfil completo */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
