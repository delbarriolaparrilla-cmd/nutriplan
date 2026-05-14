import { Navigate, useLocation } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';

interface ProfileGuardProps {
  children: React.ReactNode;
}

/**
 * Verifica que el usuario haya completado el onboarding.
 *
 * La race condition clásica era:
 *   useProfile (nueva instancia) → useAuth empieza con user=null →
 *   cargarPerfil retorna temprano con loading=false, perfil=null →
 *   redirige a /onboarding antes de que auth resuelva.
 *
 * El fix vive en useProfile.ts (espera authLoading antes de actuar).
 * Esta capa de seguridad adicional usa el estado de router para saber
 * si acabamos de llegar desde onboarding y, en ese caso, no redirigir
 * mientras loading sigue en true.
 */
export function ProfileGuard({ children }: ProfileGuardProps) {
  const { perfil, loading } = useProfile();
  const location = useLocation();
  const fromOnboarding =
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding === true;

  // Mostrar spinner mientras carga (tanto loading de auth como de perfil)
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

  // Perfil completo → mostrar la app
  if (perfil?.perfil_completo) {
    return <>{children}</>;
  }

  // Si justo venimos del onboarding y loading ya terminó pero perfil_completo
  // sigue siendo false, algo salió mal en el guardado — redirigir a onboarding
  // con un mensaje útil en el estado.
  return (
    <Navigate
      to="/onboarding"
      replace
      state={fromOnboarding ? { guardadoFallido: true } : undefined}
    />
  );
}
