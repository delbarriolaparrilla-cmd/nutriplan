import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Hoy', icon: '🏠' },
  { to: '/recetas', label: 'Recetas', icon: '🍽️' },
  { to: '/semana', label: 'Semana', icon: '📅' },
  { to: '/grupos', label: 'Mis Grupos', icon: '🥗' },
  { to: '/progreso', label: 'Progreso', icon: '📊' },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-3">
      <div className="px-3 mb-8">
        <h1 className="text-xl font-bold" style={{ color: '#1D9E75' }}>
          NutriPlan
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Tu plan personalizado</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
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
    </aside>
  );
}
