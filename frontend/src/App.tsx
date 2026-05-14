import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import Hoy from './pages/Hoy.js';
import Recetas from './pages/Recetas.js';
import Semana from './pages/Semana.js';
import MisGrupos from './pages/MisGrupos.js';
import Progreso from './pages/Progreso.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';

/** Layout con sidebar — solo para rutas protegidas */
function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/hoy" element={<Hoy />} />
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/mis-grupos" element={<MisGrupos />} />
          <Route path="/progreso" element={<Progreso />} />
          {/* Ruta raíz redirige a /hoy */}
          <Route path="/" element={<Navigate to="/hoy" replace />} />
          {/* Cualquier otra ruta protegida también va a /hoy */}
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Todas las demás rutas están protegidas */}
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
