import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.js';
import Hoy from './pages/Hoy.js';
import Recetas from './pages/Recetas.js';
import Semana from './pages/Semana.js';
import MisGrupos from './pages/MisGrupos.js';
import Progreso from './pages/Progreso.js';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<Hoy />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/semana" element={<Semana />} />
            <Route path="/grupos" element={<MisGrupos />} />
            <Route path="/progreso" element={<Progreso />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
