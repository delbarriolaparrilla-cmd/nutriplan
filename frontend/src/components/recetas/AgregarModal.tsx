import { useState } from 'react';
import { RecetaGenerada, TipoComida } from '../../types/index.js';

// ─── helpers ────────────────────────────────────────────────────────────────

const DIAS_LABEL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getSemana(): string[] {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── tipos ──────────────────────────────────────────────────────────────────

export type ModoAgregar = 'hoy' | 'repetir' | 'variaciones';

export interface ConfirmarParams {
  modo: ModoAgregar;
  /** fechas seleccionadas (ISO) */
  fechas: string[];
}

interface AgregarModalProps {
  receta: RecetaGenerada;
  tipoComida: TipoComida;
  perfilInfo?: {
    objetivo?: string;
    condiciones?: Record<string, boolean>;
    preferencias?: Record<string, boolean>;
  };
  cargando?: boolean;
  onConfirmar: (params: ConfirmarParams) => Promise<void>;
  onClose: () => void;
}

// ─── componente ─────────────────────────────────────────────────────────────

export function AgregarModal({
  receta,
  tipoComida,
  cargando = false,
  onConfirmar,
  onClose,
}: AgregarModalProps) {
  const semana = getSemana();
  const hoy = hoyISO();

  const [modo, setModo] = useState<ModoAgregar>('hoy');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoy);

  const tipoLabel: Record<TipoComida, string> = {
    desayuno: 'Desayuno',
    colacion: 'Colación',
    comida: 'Comida',
    cena: 'Cena',
  };

  const handleConfirmar = async () => {
    const fechas =
      modo === 'hoy' ? [fechaSeleccionada] : semana;
    await onConfirmar({ modo, fechas });
  };

  const modoCards: { value: ModoAgregar; title: string; desc: string; emoji: string }[] = [
    {
      value: 'hoy',
      title: 'Solo un día',
      desc: 'Elige el día de la semana en que quieres agregar esta receta.',
      emoji: '📅',
    },
    {
      value: 'repetir',
      title: 'Repetir toda la semana',
      desc: 'Agrega la misma receta a los 7 días de esta semana.',
      emoji: '🔁',
    },
    {
      value: 'variaciones',
      title: 'Variaciones con IA',
      desc: 'Claude genera 7 recetas similares pero distintas, una por día.',
      emoji: '✨',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet en mobile, modal en desktop */}
      <div
        className="fixed z-50 bg-white shadow-2xl
          bottom-0 left-0 right-0 rounded-t-3xl
          sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:w-full sm:max-w-md sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Agregar receta al plan"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 leading-tight">
                ¿Cómo quieres agregar esta receta?
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                {receta.nombre} · {tipoLabel[tipoComida]}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-2 shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Modo selector */}
          <div className="space-y-2 mb-4">
            {modoCards.map(({ value, title, desc, emoji }) => (
              <button
                key={value}
                onClick={() => setModo(value)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  modo === value
                    ? 'border-transparent'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
                style={
                  modo === value
                    ? { borderColor: '#1D9E75', backgroundColor: '#F0FAF5' }
                    : {}
                }
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{emoji}</span>
                  <span className={`text-sm font-semibold ${modo === value ? '' : 'text-gray-700'}`}
                    style={modo === value ? { color: '#085041' } : {}}>
                    {title}
                  </span>
                  {modo === value && (
                    <span className="ml-auto text-xs font-bold" style={{ color: '#1D9E75' }}>✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 pl-6">{desc}</p>
              </button>
            ))}
          </div>

          {/* Selector de día (solo para modo 'hoy') */}
          {modo === 'hoy' && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Elige el día:</p>
              <div className="flex gap-1.5">
                {semana.map((fecha, i) => {
                  const dia = new Date(fecha + 'T12:00').getDate();
                  const esHoy = fecha === hoy;
                  const seleccionado = fecha === fechaSeleccionada;
                  return (
                    <button
                      key={fecha}
                      onClick={() => setFechaSeleccionada(fecha)}
                      title={DIAS_FULL[i]}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                        seleccionado
                          ? 'text-white border-transparent'
                          : esHoy
                          ? 'border-gray-300 text-gray-700 bg-gray-50'
                          : 'border-gray-100 text-gray-500 bg-white hover:bg-gray-50'
                      }`}
                      style={seleccionado ? { backgroundColor: '#1D9E75', borderColor: '#1D9E75' } : {}}
                    >
                      <span>{DIAS_LABEL[i]}</span>
                      <span className={`font-normal ${seleccionado ? 'opacity-80' : 'opacity-70'}`}>
                        {dia}
                      </span>
                      {esHoy && !seleccionado && (
                        <span
                          className="w-1 h-1 rounded-full mt-0.5"
                          style={{ backgroundColor: '#1D9E75' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumen modo semana */}
          {modo !== 'hoy' && (
            <div
              className="rounded-xl p-3 mb-4 text-xs"
              style={{ backgroundColor: '#F0FAF5', color: '#085041' }}
            >
              {modo === 'repetir' ? (
                <>
                  <strong>Se agregará:</strong> la misma receta a los 7 días de esta semana.<br />
                  Los días que ya tienen {tipoLabel[tipoComida].toLowerCase()} no serán reemplazados.
                </>
              ) : (
                <>
                  <strong>Claude generará</strong> 7 recetas similares pero distintas para {tipoLabel[tipoComida].toLowerCase()}.<br />
                  Cada día tendrá una preparación diferente con los mismos nutrientes (~{receta.calorias} kcal).
                </>
              )}
            </div>
          )}

          {/* Botón confirmar */}
          <button
            onClick={handleConfirmar}
            disabled={cargando}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {cargando
              ? modo === 'variaciones'
                ? 'Claude está generando variaciones...'
                : 'Agregando...'
              : modo === 'hoy'
              ? 'Agregar al plan'
              : modo === 'repetir'
              ? 'Repetir toda la semana'
              : 'Generar variaciones con IA'}
          </button>
        </div>
      </div>
    </>
  );
}
