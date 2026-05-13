import { useProfile } from '../../hooks/useProfile.js';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { perfil } = useProfile();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {perfil && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#1D9E75' }}>
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-gray-700 font-medium">{perfil.nombre}</span>
        </div>
      )}
    </header>
  );
}
