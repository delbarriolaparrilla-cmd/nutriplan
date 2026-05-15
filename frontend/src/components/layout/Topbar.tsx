import { ReactNode } from 'react';
import { useProfile } from '../../hooks/useProfile.js';

interface TopbarProps {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

export function Topbar({ title, subtitle, rightContent }: TopbarProps) {
  const { perfil } = useProfile();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
      style={{ minHeight: '56px' }}>
      <div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        {perfil && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: '#1D9E75' }}>
              {perfil.nombre.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm text-gray-700 font-medium">{perfil.nombre}</span>
          </div>
        )}
      </div>
    </header>
  );
}
