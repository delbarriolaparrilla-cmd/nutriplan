import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { Objetivo } from '../../types/index.js';

const NAV_ITEMS = [
  { to: '/hoy', label: 'Hoy', icon: '🏠' },
  { to: '/recetas', label: 'Recetas', icon: '🍽️' },
  { to: '/semana', label: 'Semana', icon: '📅' },
  { to: '/mis-grupos', label: 'Mis Grupos', icon: '🥗' },
  { to: '/progreso', label: 'Progreso', icon: '📊' },
  { to: '/mi-perfil', label: 'Mi Perfil', icon: '👤' },
];

const OBJETIVO_SHORT: Record<Objetivo, string> = {
  perder_peso: 'Perder peso',
  mantener_peso: 'Mantener peso',
  ganar_musculo: 'Ganar músculo',
  mejorar_salud: 'Mejorar salud',
  control_medico: 'Control médico',
};

function SignOutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { perfil } = useProfile();

  // Nombre preferido: perfil > user_metadata > email
  const nombre =
    perfil?.nombre ||
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const inicial = nombre.charAt(0).toUpperCase();

  const objetivoLabel = perfil?.objetivo
    ? OBJETIVO_SHORT[perfil.objetivo]
    : null;

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-3">
      {/* Logo */}
      <div className="px-3 mb-8">
        <h1 className="text-xl font-bold" style={{ color: '#1D9E75' }}>
          NutriPlan
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Tu plan personalizado</p>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/hoy'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: '#1D9E75' } : {}
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + objetivo + cerrar sesión */}
      <div className="px-3 pt-4 mt-2 border-t border-gray-100">
        {/* Avatar + nombre + objetivo */}
        <div className="flex items-start gap-2.5 mb-3 px-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate" title={nombre}>
              {nombre}
            </p>
            {objetivoLabel && (
              <p className="text-xs text-gray-400 truncate" title={`Objetivo: ${objetivoLabel}`}>
                {objetivoLabel}
              </p>
            )}
          </div>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <SignOutIcon />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
