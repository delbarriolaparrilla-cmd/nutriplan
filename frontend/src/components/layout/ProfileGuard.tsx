import { Navigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';

interface ProfileGuardProps {
  children: React.ReactNode;
}

/**
 * Verifica que el usuario haya completado el onboarding.
 * Si perfil_completo = false (o no hay perfil), redirige a /onboarding.
 * Debe renderizarse DENTRO de ProtectedRoute (user ya garantizado).
 */
export function ProfileGuard({ children }: ProfileGuardProps) {
  const { perfil, loading } = useProfile();

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: '#F8FDFB' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-gray-400">Preparando tu plan…</p>
        </div>
      </div>
    );
  }

  if (!perfil || !perfil.perfil_completo) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
