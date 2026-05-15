import { useSuscripcion } from '../hooks/useSuscripcion';

const WA_NUMBER = '+52TUNUMERO'; // ← reemplazar con número real
const WA_LINK = `https://wa.me/${WA_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero renovar mi suscripción NutriBarrio 🥗')}`;

function formatCountdown(diasRestantes: number): string {
  if (diasRestantes > 1)  return `${diasRestantes} días`;
  if (diasRestantes === 1) return '1 día';
  // Negativo → gracia
  const en_gracia = 2 + diasRestantes; // días de gracia restantes
  if (en_gracia > 0) return `${en_gracia} día${en_gracia !== 1 ? 's' : ''} de gracia`;
  return 'acceso bloqueado';
}

export function BannerSuscripcion() {
  const { suscripcion, loading, diasRestantes } = useSuscripcion();

  if (loading || !suscripcion) return null;
  const { estado } = suscripcion;

  // No mostrar banner si la suscripción está activa y queda más de 3 días
  if (estado === 'activa' && diasRestantes > 3) return null;
  // No mostrar si está cancelada (se maneja en AccesoBloqueado)
  if (estado === 'cancelada') return null;
  // Suspendida se maneja en AccesoBloqueado, no en banner
  if (estado === 'suspendida') return null;

  // ─── Configuración por estado ─────────────────────────────
  const config = {
    prueba: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      icon: '🎉',
      msg: `Prueba gratuita: ${diasRestantes > 0 ? diasRestantes : 0} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`,
      btn: null,
    },
    activa: {
      bg: '#FFF7ED',
      border: '#FED7AA',
      text: '#C2410C',
      icon: '⏰',
      msg: `Tu suscripción vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
      btn: { label: 'Renovar', href: WA_LINK },
    },
    gracia: {
      bg: '#FFF7ED',
      border: '#FED7AA',
      text: '#B45309',
      icon: '⚠️',
      msg: `Tu suscripción venció. Te quedan ${formatCountdown(diasRestantes)} de acceso`,
      btn: { label: 'Contactar para pagar', href: WA_LINK },
    },
  }[estado as 'prueba' | 'activa' | 'gracia'];

  if (!config) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{
        backgroundColor: config.bg,
        borderBottom: `1px solid ${config.border}`,
        color: config.text,
      }}
    >
      <span className="shrink-0">{config.icon}</span>
      <span className="flex-1 font-medium">{config.msg}</span>
      {config.btn && (
        <a
          href={config.btn.href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: config.text }}
        >
          {config.btn.label}
        </a>
      )}
    </div>
  );
}
