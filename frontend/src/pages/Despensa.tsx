import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar.js';
import { useProfile } from '../hooks/useProfile.js';
import { getDespensa, DespensaResult, ItemDespensa } from '../lib/api.js';

// ─── Helpers de fecha ────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

/** Devuelve los 7 días de la semana actual comenzando en lunes */
function getSemanaActual(): string[] {
  const hoy = new Date();
  const dow = hoy.getDay(); // 0=Dom
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return toISO(d);
  });
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function formatFecha(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', opts ?? { day: 'numeric', month: 'short' });
}

function formatDiaLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Constantes ──────────────────────────────────────────────

const DIA_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SMAE_ORDEN = ['Verduras', 'Frutas', 'Cereales', 'Leguminosas', 'AOA', 'Lácteos', 'Aceites', 'Azúcares'];
const SMAE_EMOJI: Record<string, string> = {
  Verduras: '🥦', Frutas: '🍎', Cereales: '🌽', Leguminosas: '🫘',
  AOA: '🍗', Lácteos: '🥛', Aceites: '🫒', Azúcares: '🍯', Otros: '🛒',
};

// ─── Componente ──────────────────────────────────────────────

export default function Despensa() {
  const navigate = useNavigate();
  const { perfil } = useProfile();

  const semana = useMemo(() => getSemanaActual(), []);
  const hoy    = useMemo(() => toISO(new Date()), []);

  // Por defecto: Lunes-Sábado (índices 0-5)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(semana.slice(0, 6))
  );
  const [numPersonas, setNumPersonas]   = useState(1);
  const [resultado, setResultado]       = useState<DespensaResult | null>(null);
  const [generando, setGenerando]       = useState(false);
  const [error, setError]               = useState('');
  // Check-list de items de la despensa (para tachar al comprar)
  const [comprados, setComprados]       = useState<Set<string>>(new Set());

  // ── Toggles ────────────────────────────────────────────────

  const toggleDia = useCallback((fecha: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(fecha) ? next.delete(fecha) : next.add(fecha);
      return next;
    });
    setResultado(null);
  }, []);

  const aplicarPreset = useCallback((preset: 'lun-sab' | 'lun-dom' | 'hoy' | 'proximos3') => {
    let dias: string[];
    if (preset === 'lun-sab')   dias = semana.slice(0, 6);
    else if (preset === 'lun-dom') dias = semana.slice(0, 7);
    else if (preset === 'hoy')  dias = [hoy];
    else                        dias = [hoy, addDays(hoy, 1), addDays(hoy, 2)];
    setSeleccionados(new Set(dias));
    setResultado(null);
  }, [semana, hoy]);

  // ── Resumen ────────────────────────────────────────────────

  const diasArray   = useMemo(() => [...seleccionados].sort(), [seleccionados]);
  const numDias     = diasArray.length;
  const numComidas  = (perfil?.num_comidas_dia ?? 3) * numDias * numPersonas;
  const presupMin   = numDias * numPersonas * 85;
  const presupMax   = numDias * numPersonas * 110;

  const rangoFechas = useMemo(() => {
    if (diasArray.length === 0) return '—';
    if (diasArray.length === 1) return formatFecha(diasArray[0], { weekday: 'short', day: 'numeric', month: 'short' });
    return `${formatFecha(diasArray[0])} – ${formatFecha(diasArray[diasArray.length - 1])}`;
  }, [diasArray]);

  // ── Generar ────────────────────────────────────────────────

  const handleGenerar = async () => {
    if (diasArray.length === 0) { setError('Selecciona al menos un día.'); return; }
    setGenerando(true);
    setError('');
    setResultado(null);
    setComprados(new Set());
    try {
      const data = await getDespensa(diasArray, numPersonas);
      setResultado(data);
    } catch (e) {
      setError((e as Error).message ?? 'Error al generar la lista.');
    } finally {
      setGenerando(false);
    }
  };

  // ── Agrupar lista por categoría SMAE ───────────────────────

  const gruposLista = useMemo((): Map<string, ItemDespensa[]> => {
    if (!resultado) return new Map();
    const map = new Map<string, ItemDespensa[]>();
    for (const item of resultado.lista) {
      const g = item.grupo || 'Otros';
      const existing = map.get(g) ?? [];
      existing.push(item);
      map.set(g, existing);
    }
    // Ordenar grupos según SMAE
    const ordered = new Map<string, ItemDespensa[]>();
    for (const g of [...SMAE_ORDEN, 'Otros']) {
      if (map.has(g)) ordered.set(g, map.get(g)!);
    }
    for (const [g, items] of map) {
      if (!ordered.has(g)) ordered.set(g, items);
    }
    return ordered;
  }, [resultado]);

  // ── Print ──────────────────────────────────────────────────

  const handlePrint = () => window.print();

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Mi Despensa" subtitle="Lista de compras semanal" />

      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: '#F8FDFB' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── CONFIGURACIÓN ─────────────────────────────── */}
          {!resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Selector de días */}
              <div style={cardStyle}>
                <p style={labelStyle}>📅 ¿Qué días incluir?</p>

                {/* Chips de días */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginBottom: '12px' }}>
                  {semana.map((fecha, i) => {
                    const activo = seleccionados.has(fecha);
                    const esHoy  = fecha === hoy;
                    return (
                      <button
                        key={fecha}
                        onClick={() => toggleDia(fecha)}
                        title={`${DIA_FULL[i]} ${formatFecha(fecha)}`}
                        style={{
                          flex: 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: '3px', padding: '8px 4px',
                          borderRadius: '12px',
                          border: `2px solid ${activo ? '#1D9E75' : '#E5E7EB'}`,
                          background: activo ? '#F0FBF7' : '#fff',
                          cursor: 'pointer', transition: 'all 0.15s',
                          outline: esHoy ? '2px solid #1D9E75' : 'none',
                          outlineOffset: '2px',
                        }}
                      >
                        <span style={{
                          fontSize: '13px', fontWeight: 700,
                          color: activo ? '#085041' : '#9CA3AF',
                        }}>
                          {DIA_SHORT[i]}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: activo ? '#1D9E75' : '#C4C4C4',
                          fontWeight: activo ? 600 : 400,
                        }}>
                          {new Date(fecha + 'T12:00:00').getDate()}
                        </span>
                        {esHoy && (
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#1D9E75' }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {([
                    { id: 'lun-sab',   label: 'Lun–Sáb' },
                    { id: 'lun-dom',   label: 'Lun–Dom' },
                    { id: 'hoy',       label: 'Solo hoy' },
                    { id: 'proximos3', label: 'Próximos 3 días' },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => aplicarPreset(id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: '1px solid #D1D5DB',
                        background: '#F9FAFB',
                        fontSize: '12px', fontWeight: 500,
                        color: '#374151', cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de personas */}
              <div style={cardStyle}>
                <p style={labelStyle}>👥 ¿Para cuántas personas?</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setNumPersonas(n); setResultado(null); }}
                      style={{
                        width: '48px', height: '48px',
                        borderRadius: '12px',
                        border: `2px solid ${numPersonas === n ? '#1D9E75' : '#E5E7EB'}`,
                        background: numPersonas === n ? '#F0FBF7' : '#fff',
                        fontSize: '16px', fontWeight: 700,
                        color: numPersonas === n ? '#085041' : '#6B7280',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  {/* Botón + para valores mayores */}
                  {numPersonas <= 4 ? (
                    <button
                      onClick={() => { setNumPersonas(5); setResultado(null); }}
                      style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        border: '2px solid #E5E7EB', background: '#fff',
                        fontSize: '20px', fontWeight: 700, color: '#9CA3AF',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => setNumPersonas((p) => Math.max(1, p - 1))}
                        style={stepBtnStyle}>−</button>
                      <span style={{ fontWeight: 700, fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>
                        {numPersonas}
                      </span>
                      <button onClick={() => setNumPersonas((p) => Math.min(20, p + 1))}
                        style={stepBtnStyle}>+</button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Las cantidades se ajustan automáticamente
                </p>
              </div>

              {/* Resumen antes de generar */}
              {numDias > 0 && (
                <div style={{
                  background: 'var(--color-primary-light)',
                  border: '1px solid #A7E3C8',
                  borderRadius: '14px', padding: '14px 16px',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#085041', marginBottom: '10px' }}>
                    Resumen de tu lista
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <ResumenItem icon="📅" text={`${numDias} día${numDias !== 1 ? 's' : ''} seleccionado${numDias !== 1 ? 's' : ''} · ${rangoFechas}`} />
                    <ResumenItem icon="👤" text={`${numPersonas} persona${numPersonas !== 1 ? 's' : ''}`} />
                    <ResumenItem icon="🍽️" text={`~${numComidas} comidas en total`} />
                    <ResumenItem icon="💰" text={`Presupuesto estimado: $${presupMin}–$${presupMax} MXN`} />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2',
                  border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              {/* Botón generar */}
              <button
                onClick={handleGenerar}
                disabled={generando || numDias === 0}
                className="nb-btn-primary"
                style={{ fontSize: '15px' }}
              >
                {generando
                  ? <span>⏳ Generando lista…</span>
                  : <span>🛒 Generar lista de compras</span>}
              </button>

              {/* Skeleton mientras genera */}
              {generando && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[80, 60, 70, 55, 90].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: '20px', width: `${w}%` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RESULTADO ─────────────────────────────────── */}
          {resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Cabecera de resultado */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '17px', color: '#085041' }}>
                    🛒 Lista de compras
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    {resultado.total_ingredientes} ingredientes · {numDias} días · {numPersonas} persona{numPersonas !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrint} style={iconBtnStyle} title="Imprimir / Guardar PDF">
                    🖨️ Imprimir
                  </button>
                  <button
                    onClick={() => { setResultado(null); setComprados(new Set()); }}
                    style={{ ...iconBtnStyle, background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>

              {/* Advertencias de días sin plan */}
              {resultado.dias_sin_plan.length > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                    ⚠️ Algunos días no tienen recetas planificadas
                  </p>
                  <ul style={{ paddingLeft: '16px', margin: '4px 0 8px' }}>
                    {resultado.dias_sin_plan.map((d) => (
                      <li key={d} style={{ fontSize: '12px', color: '#78350F' }}>
                        {formatDiaLabel(d)}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: '12px', color: '#92400E' }}>
                    La lista incluye solo los días con recetas. Planifica los días faltantes en{' '}
                    <button
                      onClick={() => navigate('/recetas')}
                      style={{ color: '#1D9E75', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                    >
                      Recetas →
                    </button>
                  </p>
                </div>
              )}

              {/* Sin plan en ningún día */}
              {resultado.lista.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Aún no tienes recetas planificadas
                  </p>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                    Ve a Recetas y planifica tu semana primero
                  </p>
                  <button
                    onClick={() => navigate('/recetas')}
                    className="nb-btn-primary"
                    style={{ maxWidth: '220px', margin: '0 auto' }}
                  >
                    Ir a planificar
                  </button>
                </div>
              ) : (
                /* Lista agrupada por categoría SMAE */
                Array.from(gruposLista.entries()).map(([grupo, items]) => (
                  <div key={grupo} style={cardStyle}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1D9E75', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{SMAE_EMOJI[grupo] ?? '🛒'}</span>
                      {grupo}
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>
                        ({items.length})
                      </span>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {items.map((item, idx) => {
                        const key = `${grupo}-${idx}-${item.nombre}`;
                        const checked = comprados.has(key);
                        return (
                          <label key={key} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 4px', cursor: 'pointer',
                            borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none',
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setComprados((prev) => {
                                  const next = new Set(prev);
                                  next.has(key) ? next.delete(key) : next.add(key);
                                  return next;
                                });
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#1D9E75', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: checked ? '#9CA3AF' : '#1A1A2E',
                              textDecoration: checked ? 'line-through' : 'none',
                              flex: 1,
                            }}>
                              {item.nombre}
                            </span>
                            <span style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                              {item.cantidad}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Progreso de compra */}
              {resultado.lista.length > 0 && comprados.size > 0 && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: '#F0FBF7', border: '1px solid #A7E3C8',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '13px', color: '#085041', fontWeight: 600 }}>
                    ✅ {comprados.size} de {resultado.total_ingredientes} ingredientes listos
                  </span>
                  <button
                    onClick={() => setComprados(new Set())}
                    style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .sidebar-desktop, .bottom-nav, header { display: none !important; }
          body { background: white; }
          .main-with-bottom-nav { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────

function ResumenItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <span style={{ fontSize: '13px', color: '#085041' }}>{text}</span>
    </div>
  );
}

// ─── Estilos reutilizables ───────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  border: '1px solid #E5E7EB',
  padding: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#085041',
  marginBottom: '12px',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '7px 12px', borderRadius: '10px',
  border: '1.5px solid #E5E7EB', background: 'white',
  fontSize: '12px', fontWeight: 600, color: '#374151',
  cursor: 'pointer',
};

const stepBtnStyle: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', background: 'white',
  fontSize: '18px', fontWeight: 700, color: '#374151',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
