import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { ProfileGuard } from './components/layout/ProfileGuard.js';
import { BannerSuscripcion } from './components/BannerSuscripcion.js';
import { useSuscripcion } from './hooks/useSuscripcion.js';
import Hoy from './pages/Hoy.js';
import Recetas from './pages/Recetas.js';
import Semana from './pages/Semana.js';
import MisGrupos from './pages/MisGrupos.js';
import Progreso from './pages/Progreso.js';
import MiPerfil from './pages/MiPerfil.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Onboarding from './pages/Onboarding.js';
import Despensa from './pages/Despensa.js';
import Admin from './pages/Admin.js';
import AccesoBloqueado from './pages/AccesoBloqueado.js';

/** Guard que bloquea si la suscripción está suspendida */
function SuscripcionGuard({ children }: { children: React.ReactNode }) {
  const { accesoBloqueado, loading } = useSuscripcion();
  if (loading) return null;
  if (accesoBloqueado) return <AccesoBloqueado />;
  return <>{children}</>;
}

/** Layout con sidebar — sólo se renderiza cuando ProfileGuard ya aprobó */
function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {/* main-with-bottom-nav adds pb-[68px] on mobile via CSS so content
          isn't hidden behind the fixed bottom nav */}
      <main className="flex-1 flex flex-col overflow-hidden main-with-bottom-nav">
        {/* Banner de suscripción sticky debajo del header */}
        <BannerSuscripcion />

        <Routes>
          <Route path="/hoy"      element={<Hoy />} />
          <Route path="/recetas"  element={<Recetas />} />
          <Route path="/semana"   element={<Semana />} />
          <Route path="/mis-grupos" element={<MisGrupos />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/mi-perfil" element={<MiPerfil />} />
          <Route path="/despensa" element={<Despensa />} />
          <Route path="/admin"    element={<Admin />} />
          <Route path="/"         element={<Navigate to="/hoy" replace />} />
          <Route path="*"         element={<Navigate to="/hoy" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Rutas públicas ── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Onboarding: requiere auth pero NO perfil completo ── */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* ── App principal: requiere auth + perfil completo + suscripción ──
            ProfileGuard está en el nivel de ruta (no dentro del layout)
            para que su instancia de useProfile sea fresca en cada navegación
            y no herede estado cacheado de renders anteriores.           */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ProfileGuard>
                <SuscripcionGuard>
                  <AppLayout />
                </SuscripcionGuard>
              </ProfileGuard>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
