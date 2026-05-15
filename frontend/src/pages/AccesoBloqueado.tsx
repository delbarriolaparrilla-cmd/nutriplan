const WA_NUMBER = '+52TUNUMERO'; // ← reemplazar con número real
const WA_LINK = `https://wa.me/${WA_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero renovar mi suscripción NutriBarrio 🥗')}`;

const PLANES = [
  {
    icon: '📅',
    label: 'Mensual',
    precio: '$79 MXN/mes',
    ahorro: null,
    color: '#1D9E75',
  },
  {
    icon: '📆',
    label: 'Trimestral',
    precio: '$199 MXN',
    ahorro: 'Ahorras 16%',
    color: '#3B82F6',
  },
  {
    icon: '🗓️',
    label: 'Anual',
    precio: '$699 MXN',
    ahorro: 'Ahorras 26%',
    color: '#7C3AED',
  },
];

export default function AccesoBloqueado() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#F8FDFB' }}
    >
      <div className="w-full max-w-sm">
        {/* Icono + título */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Tu plan NutriBarrio está pausado
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Para continuar con tu plan nutricional,<br />
            renueva tu suscripción.
          </p>
        </div>

        {/* Opciones de plan */}
        <div className="space-y-3 mb-8">
          {PLANES.map(({ icon, label, precio, ahorro, color }) => (
            <div
              key={label}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 bg-white"
              style={{ borderColor: `${color}30` }}
            >
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                {ahorro && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {ahorro}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold" style={{ color }}>
                {precio}
              </p>
            </div>
          ))}
        </div>

        {/* Botón principal WhatsApp */}
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-sm mb-4"
          style={{ backgroundColor: '#1D9E75' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.374 0 0 5.373 0 12c0 2.127.556 4.127 1.523 5.867L0 24l6.27-1.498A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 0 1-5.003-1.375l-.357-.213-3.723.888.936-3.618-.233-.37A9.77 9.77 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
          </svg>
          💬 Contactar para renovar
        </a>

        {/* Nota tranquilizadora */}
        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Tus recetas y plan nutricional están guardados.<br />
          Al renovar, continúas donde lo dejaste 🥗
        </p>
      </div>
    </div>
  );
}
